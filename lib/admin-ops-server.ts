import "server-only";
import { SAAS } from "@/lib/site/access";
import { canUsePlatformKey } from "@/lib/platform-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCurrentConsent } from "@/lib/consent";
import { hasProfileName } from "@/lib/member-name";
import { kstRange } from "@/lib/admin-filters";
import { classifyError, computeFunnel, DEFAULT_SETTINGS, failureAlerts, isLive, parseSettings, type ErrorClass, type FailureAlert, type FunnelResult, type SiteSettings } from "@/lib/admin-ops";

// Server reads and writes for the /admin operations features
// (supabase/migrations/0020_admin_ops.sql). Every table is service-role
// only; callers check who's asking (getAdminUser for staff pages, the
// signed-in user for their own notices). If the migration hasn't been
// applied yet, reads fall back to "nothing configured" instead of failing.

const DAY_MS = 24 * 60 * 60 * 1000;
const RUN_ROWS = 50000;

// ── Settings: maintenance and paused tools ─────────────────────────────

let cache: { at: number; value: SiteSettings } | null = null;
const CACHE_MS = 15_000; // a flip in /admin reaches every server within 15 s

export async function getSiteSettings(fresh = false): Promise<SiteSettings> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const { data, error } = await createAdminClient().from("site_settings").select("key, value");
  const value = error ? DEFAULT_SETTINGS : parseSettings(data ?? []);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSetting(key: "maintenance" | "paused_tools" | "host_emails", value: unknown, staffId: string): Promise<void> {
  const { error } = await createAdminClient().from("site_settings").upsert({ key, value, updated_by: staffId, updated_at: new Date().toISOString() });
  if (error) throw new Error(`site_settings: ${error.message}`);
  cache = null;
}

// ── Member notices ─────────────────────────────────────────────────────

export interface MemberNotice {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

const toNotice = (r: { id: string; kind: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null }): MemberNotice => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, readAt: r.read_at });

/** Notices a member hasn't dismissed yet, newest first. */
export async function unreadNotices(userId: string): Promise<MemberNotice[]> {
  const { data, error } = await createAdminClient().from("member_notices").select("id, kind, title, body, link, created_at, read_at").eq("user_id", userId).is("read_at", null).order("created_at", { ascending: false }).limit(5);
  return error ? [] : (data ?? []).map(toNotice);
}

/** Every notice sent to a member (their profile card in /admin). */
export async function noticesFor(userId: string): Promise<MemberNotice[]> {
  const { data, error } = await createAdminClient().from("member_notices").select("id, kind, title, body, link, created_at, read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  return error ? [] : (data ?? []).map(toNotice);
}

export async function sendNotice(userId: string, n: { kind: string; title: string; body: string; link: string | null }, staffId: string): Promise<string> {
  const { data, error } = await createAdminClient().from("member_notices").insert({ user_id: userId, ...n, created_by: staffId }).select("id").single();
  if (error || !data) throw new Error(`member_notices: ${error?.message ?? "no row"}`);
  return data.id;
}

/** The member dismisses their own notice; the user id comes from the session, never the request. */
export async function dismissNotice(userId: string, noticeId: string): Promise<void> {
  await createAdminClient().from("member_notices").update({ read_at: new Date().toISOString() }).eq("id", noticeId).eq("user_id", userId).is("read_at", null);
}

// ── Announcements: banners and patch notes ─────────────────────────────

export interface Announcement {
  id: string;
  kind: "banner" | "patch";
  level: "info" | "warning" | "success";
  title: { ko: string; en: string };
  body: { ko: string; en: string };
  version: string | null;
  link: string | null;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  /** Where it stands right now (worked out on the server, so the page renders the same everywhere). */
  status: "live" | "scheduled" | "ended" | "draft";
}

type AnnouncementRow = { id: string; kind: "banner" | "patch"; level: "info" | "warning" | "success"; title_ko: string; title_en: string; body_ko: string; body_en: string; version: string | null; link: string | null; published: boolean; starts_at: string | null; ends_at: string | null; created_at: string };
const COLS = "id, kind, level, title_ko, title_en, body_ko, body_en, version, link, published, starts_at, ends_at, created_at";

const toAnnouncement = (r: AnnouncementRow): Announcement => ({
  id: r.id,
  kind: r.kind,
  level: r.level,
  title: { ko: r.title_ko, en: r.title_en || r.title_ko },
  body: { ko: r.body_ko, en: r.body_en || r.body_ko },
  version: r.version,
  link: r.link,
  published: r.published,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  createdAt: r.created_at,
  status: !r.published ? "draft" : r.ends_at && new Date(r.ends_at).getTime() <= Date.now() ? "ended" : r.starts_at && new Date(r.starts_at).getTime() > Date.now() ? "scheduled" : "live",
});

/** Everything, for the /admin editor. */
export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await createAdminClient().from("announcements").select(COLS).order("created_at", { ascending: false }).limit(100);
  return error ? [] : (data as AnnouncementRow[]).map(toAnnouncement);
}

let liveCache: { at: number; value: Announcement[] } | null = null;

/** Published and in their time window — the site banner and the What's new page. Cached briefly. */
export async function liveAnnouncements(): Promise<Announcement[]> {
  if (liveCache && Date.now() - liveCache.at < CACHE_MS) return liveCache.value;
  const { data, error } = await createAdminClient().from("announcements").select(COLS).eq("published", true).order("created_at", { ascending: false }).limit(50);
  const now = Date.now();
  const value = error ? [] : (data as AnnouncementRow[]).filter((r) => isLive(r, now)).map(toAnnouncement);
  liveCache = { at: now, value };
  return value;
}

export function clearAnnouncementCache() {
  liveCache = null;
}

// ── Activation funnel ──────────────────────────────────────────────────

export async function getFunnel(range: { from: string; to: string }): Promise<FunnelResult & { members: Map<string, { email: string; name: string | null }> }> {
  const admin = createAdminClient();
  const users: { id: string; email?: string; created_at: string; app_metadata: Record<string, unknown> }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const { since, until } = kstRange(range.from, range.to);
  const inRange = users.filter((u) => (!since || u.created_at >= since) && (!until || u.created_at < until));
  const [keys, runs, settings] = await Promise.all([
    SAAS ? admin.from("payments").select("user_id").eq("status", "done").in("plan", ["plus", "pro"]) : admin.from("user_api_keys").select("user_id"),
    admin.from("generations").select("user_id, status, created_at").order("created_at", { ascending: false }).limit(RUN_ROWS),
    getSiteSettings(),
  ]);
  // The funnel's third step: a paid plan (or host) in SaaS mode, a saved key in own-key mode.
  const withKey = new Set((keys.data ?? []).map((k) => k.user_id));
  if (SAAS) for (const u of inRange) if (canUsePlatformKey(u.email, process.env, settings.hostEmails)) withKey.add(u.id);
  const ids = new Set(inRange.map((u) => u.id));
  const result = computeFunnel(
    inRange.map((u) => ({ id: u.id, createdAt: u.created_at, onboarded: hasCurrentConsent(u.app_metadata) && hasProfileName(u.app_metadata), hasKey: withKey.has(u.id) })),
    (runs.data ?? []).filter((r) => ids.has(r.user_id)).map((r) => ({ userId: r.user_id, status: r.status, createdAt: r.created_at })),
  );
  const members = new Map(inRange.map((u) => [u.id, { email: u.email ?? "", name: typeof u.app_metadata?.name === "string" ? (u.app_metadata.name as string) : null }]));
  return { ...result, members };
}

// ── Failure reasons ────────────────────────────────────────────────────

export interface ErrorReport {
  total: number;
  failed: number;
  byClass: { cls: ErrorClass; count: number; members: number; tools: string[] }[];
  byTool: { toolId: string; failed: number; runs: number }[];
  days: { day: string; failed: number; runs: number }[];
  recent: { userId: string; toolId: string | null; cls: ErrorClass; error: string; createdAt: string }[];
}

export async function getErrorReport(range: { from: string; to: string } | { days: number }): Promise<ErrorReport> {
  let q = createAdminClient().from("generations").select("user_id, tool_id, status, error, created_at").order("created_at", { ascending: false }).limit(RUN_ROWS);
  const span = "days" in range ? { since: new Date(Date.now() - range.days * DAY_MS).toISOString(), until: null } : kstRange(range.from, range.to);
  if (span.since) q = q.gte("created_at", span.since);
  if (span.until) q = q.lt("created_at", span.until);
  const { data } = await q;
  const rows = data ?? [];

  const classes = new Map<ErrorClass, { count: number; members: Set<string>; tools: Map<string, number> }>();
  const tools = new Map<string, { failed: number; runs: number }>();
  const days = new Map<string, { failed: number; runs: number }>();
  const recent: ErrorReport["recent"] = [];
  let failed = 0;
  for (const r of rows) {
    const day = new Date(new Date(r.created_at).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const d = days.get(day) ?? { failed: 0, runs: 0 };
    d.runs += 1;
    const t = tools.get(r.tool_id ?? "?") ?? { failed: 0, runs: 0 };
    t.runs += 1;
    if (r.status === "error") {
      failed += 1;
      d.failed += 1;
      t.failed += 1;
      const cls = classifyError(r.error);
      const c = classes.get(cls) ?? { count: 0, members: new Set(), tools: new Map() };
      c.count += 1;
      c.members.add(r.user_id);
      if (r.tool_id) c.tools.set(r.tool_id, (c.tools.get(r.tool_id) ?? 0) + 1);
      classes.set(cls, c);
      if (recent.length < 40) recent.push({ userId: r.user_id, toolId: r.tool_id, cls, error: String(r.error ?? "").slice(0, 300), createdAt: r.created_at });
    }
    days.set(day, d);
    tools.set(r.tool_id ?? "?", t);
  }
  return {
    total: rows.length,
    failed,
    byClass: [...classes.entries()].map(([cls, c]) => ({ cls, count: c.count, members: c.members.size, tools: [...c.tools.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id) })).sort((a, b) => b.count - a.count),
    byTool: [...tools.entries()].filter(([, v]) => v.failed > 0).map(([toolId, v]) => ({ toolId, ...v })).sort((a, b) => b.failed - a.failed),
    days: [...days.entries()].map(([day, v]) => ({ day, ...v })).sort((a, b) => (a.day < b.day ? -1 : 1)),
    recent,
  };
}

/** Dashboard alerts: the last 24 hours against the 7 days before. */
export async function getFailureAlerts(): Promise<FailureAlert[]> {
  const now = Date.now();
  const { data } = await createAdminClient().from("generations").select("status, created_at").gte("created_at", new Date(now - 8 * DAY_MS).toISOString()).limit(RUN_ROWS);
  const last = { runs: 0, failed: 0 };
  const prev = { runs: 0, failed: 0 };
  for (const r of data ?? []) {
    const bucket = new Date(r.created_at).getTime() >= now - DAY_MS ? last : prev;
    bucket.runs += 1;
    if (r.status === "error") bucket.failed += 1;
  }
  return failureAlerts(last, prev);
}
