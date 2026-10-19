import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";
import { applyMemberFilters, type MemberFacts, type MemberFilters } from "@/lib/admin-filters";
import { consentOf } from "@/lib/consent";
import { formatKoreanPhone, profileNameOf } from "@/lib/member-name";
import { displayName } from "@/lib/site/display-name";

// Staff tools behind /admin. Access is an email allow-list (ADMIN_EMAILS,
// comma-separated), not a role system — right for a small team. Unset
// means no one gets in (fails closed). Everything here reads through the
// service-role client, so every caller must check getAdminUser() first:
// the /admin layout does for pages, lib/actions/admin.ts does per action.

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** The signed-in user if their email is on ADMIN_EMAILS, else null. */
export async function getAdminUser(): Promise<{ id: string; email: string; name: string | null } | null> {
  const allow = adminEmails();
  if (allow.size === 0) return null;
  const user = await getCurrentUser();
  if (!user?.email || !allow.has(user.email.toLowerCase())) return null;
  return { id: user.id, email: user.email, name: profileNameOf(user.app_metadata) ?? displayName(user.user_metadata) };
}

/** Open support tickets — the badge on the sidebar. */
export async function countOpenTickets(): Promise<number> {
  const { count } = await createAdminClient().from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}

/**
 * One row per staff action (supabase/migrations/0019_audit_log.sql).
 * Best-effort: a logging failure never blocks the action it records.
 */
export async function logAdminAction(actorUserId: string, action: string, targetTable: string, targetId: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    await createAdminClient().from("audit_log").insert({ actor_user_id: actorUserId, action, target_table: targetTable, target_id: targetId, detail });
  } catch {
    // best-effort
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Members ────────────────────────────────────────────────────────────

const USER_PAGE = 1000;
const USER_PAGE_LIMIT = 10; // up to 10,000 members; plenty for now
const RUN_ROWS = 50000; // run rows read for member stats; past this, move to SQL

/** Every auth user, newest first. Cheap at this scale; page through if it ever isn't. */
async function listAllUsers(): Promise<User[]> {
  const admin = createAdminClient();
  const users: User[] = [];
  for (let page = 1; page <= USER_PAGE_LIMIT; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE });
    if (error || !data) break;
    users.push(...data.users);
    if (data.users.length < USER_PAGE) break;
  }
  return users.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

/** Sign-in providers on the account (google, kakao, …). */
function providersOf(u: User): string[] {
  const fromIdentities = (u.identities ?? []).map((i) => i.provider);
  const listed = (u.app_metadata?.providers as string[] | undefined) ?? [];
  const all = [...new Set([...fromIdentities, ...listed, ...(u.app_metadata?.provider ? [u.app_metadata.provider as string] : [])])];
  return all.filter((p) => p && p !== "email").length ? all.filter((p) => p !== "email") : all;
}

/** The member's Kakao account number (회원번호), when they signed in with Kakao. */
function kakaoIdOf(u: User): string | null {
  const k = (u.identities ?? []).find((i) => i.provider === "kakao");
  const raw = k?.identity_data?.provider_id ?? k?.identity_data?.sub ?? k?.id;
  return raw ? String(raw) : null;
}

const isSuspended = (u: User) => !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();

export interface AdminMember extends MemberFacts {
  provider: string;
}

function toMember(u: User, keys: string[], runs: { count: number; failed: number; last: string | null }): AdminMember {
  const providers = providersOf(u);
  return {
    id: u.id,
    email: u.email ?? "",
    name: profileNameOf(u.app_metadata) ?? displayName(u.user_metadata),
    providers,
    provider: providers[0] ?? "email",
    kakaoId: kakaoIdOf(u),
    phone: formatKoreanPhone(u.app_metadata?.phone),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    suspended: isSuspended(u),
    keys,
    runs: runs.count,
    failedRuns: runs.failed,
    lastRunAt: runs.last,
  };
}

/** Every member with their key and run counts — the rows the list filters. */
async function allMembers(): Promise<AdminMember[]> {
  const admin = createAdminClient();
  const [users, keyRows, runRows] = await Promise.all([
    listAllUsers(),
    admin.from("user_api_keys").select("user_id, provider"),
    admin.from("generations").select("user_id, status, created_at").order("created_at", { ascending: false }).limit(RUN_ROWS),
  ]);
  const keys = new Map<string, Set<string>>();
  for (const r of keyRows.data ?? []) {
    if (!keys.has(r.user_id)) keys.set(r.user_id, new Set());
    keys.get(r.user_id)!.add(r.provider);
  }
  const runs = new Map<string, { count: number; failed: number; last: string | null }>();
  for (const r of runRows.data ?? []) {
    const cur = runs.get(r.user_id) ?? { count: 0, failed: 0, last: null };
    cur.count += 1;
    if (r.status === "error") cur.failed += 1;
    if (!cur.last) cur.last = r.created_at; // rows arrive newest first
    runs.set(r.user_id, cur);
  }
  return users.map((u) => toMember(u, [...(keys.get(u.id) ?? [])].sort(), runs.get(u.id) ?? { count: 0, failed: 0, last: null }));
}

export async function listMembers(filters: MemberFilters): Promise<{ members: AdminMember[]; total: number; all: number; page: number; pages: number }> {
  const everyone = await allMembers();
  const { rows, total, page, pages } = applyMemberFilters(everyone, filters, Date.now());
  return { members: rows, total, all: everyone.length, page, pages };
}

// ── One member (profile card) ──────────────────────────────────────────

export interface AdminMemberDetail extends AdminMember {
  identities: { provider: string; email: string | null; providerId: string | null; lastSignInAt: string | null }[];
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  note: string;
  isStaff: boolean;
  consent: { version: string | null; marketing: boolean; agreedAt: string | null };
  keyDetails: { provider: string; priority: number | null; last4: string | null; broken: boolean; updatedAt: string | null }[];
  credits: number | null;
  plan: string | null;
  planExpiresAt: string | null;
  brand: { name: string; industry: string | null; region: string | null } | null;
  projects: number;
  toolUsage: { toolId: string; runs: number; failed: number }[];
  recentRuns: { id: string; toolId: string | null; title: string | null; status: string; createdAt: string; error: string | null; provider: string | null }[];
  payments: { orderId: string; amount: number; plan: string | null; status: string; method: string | null; createdAt: string }[];
  tickets: { id: string; kind: string; subject: string; status: string; createdAt: string }[];
}

export async function getMemberDetail(id: string): Promise<AdminMemberDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) return null;
  const u = data.user;

  const [keys, runs, runCount, failedCount, payments, membership, credits, tickets, brand, projects] = await Promise.all([
    admin.from("user_api_keys").select("provider, priority, last4, broken, updated_at").eq("user_id", id).order("priority"),
    admin.from("generations").select("id, tool_id, title, status, created_at, error, provider").eq("user_id", id).order("created_at", { ascending: false }).limit(RUN_ROWS),
    admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", id).eq("status", "error"),
    admin.from("payments").select("order_id, amount, plan, status, method, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    admin.from("memberships").select("plan, expires_at").eq("user_id", id).maybeSingle(),
    admin.from("user_credits").select("balance").eq("user_id", id).maybeSingle(),
    admin.from("support_tickets").select("id, kind, subject, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    admin.from("brands").select("name, industry, region").eq("user_id", id).maybeSingle(),
    admin.from("projects").select("id", { count: "exact", head: true }).eq("user_id", id),
  ]);

  const runRows = runs.data ?? [];
  const byTool = new Map<string, { runs: number; failed: number }>();
  for (const r of runRows) {
    if (!r.tool_id) continue;
    const cur = byTool.get(r.tool_id) ?? { runs: 0, failed: 0 };
    cur.runs += 1;
    if (r.status === "error") cur.failed += 1;
    byTool.set(r.tool_id, cur);
  }
  const consent = consentOf(u.app_metadata);
  const base = toMember(
    u,
    [...new Set((keys.data ?? []).map((k) => k.provider))].sort(),
    { count: runCount.count ?? runRows.length, failed: failedCount.count ?? 0, last: runRows[0]?.created_at ?? null },
  );

  return {
    ...base,
    identities: (u.identities ?? []).map((i) => ({
      provider: i.provider,
      email: (i.identity_data?.email as string | undefined) ?? null,
      providerId: i.identity_data?.provider_id ? String(i.identity_data.provider_id) : null,
      lastSignInAt: i.last_sign_in_at ?? null,
    })),
    emailConfirmedAt: u.email_confirmed_at ?? null,
    bannedUntil: base.suspended ? (u.banned_until ?? null) : null,
    note: typeof u.app_metadata?.admin_note === "string" ? u.app_metadata.admin_note : "",
    isStaff: !!u.email && adminEmails().has(u.email.toLowerCase()),
    consent: { version: consent?.v ?? null, marketing: !!consent?.marketing, agreedAt: consent?.terms_at ?? null },
    keyDetails: (keys.data ?? []).map((k) => ({ provider: k.provider, priority: k.priority ?? null, last4: k.last4 ?? null, broken: !!k.broken, updatedAt: k.updated_at ?? null })),
    credits: credits.data?.balance ?? null,
    plan: membership.data?.plan ?? null,
    planExpiresAt: membership.data?.expires_at ?? null,
    brand: brand.data ? { name: brand.data.name, industry: brand.data.industry ?? null, region: brand.data.region ?? null } : null,
    projects: projects.count ?? 0,
    toolUsage: [...byTool.entries()].map(([toolId, v]) => ({ toolId, ...v })).sort((a, b) => b.runs - a.runs),
    recentRuns: runRows.slice(0, 15).map((r) => ({ id: r.id, toolId: r.tool_id, title: r.title ?? null, status: r.status, createdAt: r.created_at, error: r.error ? String(r.error).slice(0, 200) : null, provider: r.provider ?? null })),
    payments: (payments.data ?? []).map((p) => ({ orderId: p.order_id, amount: p.amount, plan: p.plan ?? null, status: p.status, method: p.method ?? null, createdAt: p.created_at })),
    tickets: (tickets.data ?? []).map((t) => ({ id: t.id, kind: t.kind, subject: t.subject, status: t.status, createdAt: t.created_at })),
  };
}

/** True if this email is staff (ADMIN_EMAILS) — staff can't be suspended or deleted from /admin. */
export function isStaffEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().has(email.toLowerCase());
}

// ── Tool usage ─────────────────────────────────────────────────────────

export type UsagePeriod = 7 | 30 | 90 | 0; // 0 = all time

export interface ToolUsageRow {
  toolId: string;
  runs: number;
  failed: number;
  members: number;
  lastRunAt: string | null;
}

/** Runs per tool in a period, most used first. */
export async function getToolUsage(period: UsagePeriod): Promise<{ rows: ToolUsageRow[]; totalRuns: number; totalMembers: number }> {
  let q = createAdminClient().from("generations").select("tool_id, user_id, status, created_at").order("created_at", { ascending: false }).limit(RUN_ROWS);
  if (period) q = q.gte("created_at", new Date(Date.now() - period * DAY_MS).toISOString());
  const { data } = await q;
  const by = new Map<string, { runs: number; failed: number; members: Set<string>; last: string | null }>();
  const everyone = new Set<string>();
  for (const r of data ?? []) {
    everyone.add(r.user_id);
    if (!r.tool_id) continue;
    const cur = by.get(r.tool_id) ?? { runs: 0, failed: 0, members: new Set<string>(), last: null };
    cur.runs += 1;
    if (r.status === "error") cur.failed += 1;
    cur.members.add(r.user_id);
    if (!cur.last) cur.last = r.created_at;
    by.set(r.tool_id, cur);
  }
  const rows = [...by.entries()]
    .map(([toolId, v]) => ({ toolId, runs: v.runs, failed: v.failed, members: v.members.size, lastRunAt: v.last }))
    .sort((a, b) => b.runs - a.runs || (a.toolId < b.toolId ? -1 : 1));
  return { rows, totalRuns: (data ?? []).length, totalMembers: everyone.size };
}

// ── Overview ───────────────────────────────────────────────────────────

const DAYS = 14;

/** Calendar day in Korea (YYYY-MM-DD) — the team's working day, not UTC's. */
export function kstDay(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export interface AdminDay {
  day: string;
  signups: number;
  runs: number;
  failed: number;
  activeMembers: number;
}

export interface AdminOverview {
  members: number;
  newMembers7d: number;
  membersWithKey: number;
  activeMembers7d: number;
  runsToday: number;
  runs7d: number;
  failed7d: number;
  runsAllTime: number;
  openTickets: number;
  topTools7d: { toolId: string; runs: number }[];
  days: AdminDay[];
  /** Members by sign-in provider (a member with both counts once each). */
  providers: { provider: string; members: number }[];
  /** Newest five members. */
  recentMembers: { id: string; name: string | null; email: string; provider: string; createdAt: string }[];
  /** Latest runs across everyone, with who ran them. */
  recentRuns: { userId: string; name: string | null; email: string; toolId: string | null; status: string; createdAt: string }[];
}

export async function getOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();
  const now = Date.now();
  const since = new Date(now - DAYS * DAY_MS).toISOString();
  const weekAgo = now - 7 * DAY_MS;

  const [users, keyRows, recentRuns, allRuns, openTickets] = await Promise.all([
    listAllUsers(),
    admin.from("user_api_keys").select("user_id"),
    admin.from("generations").select("user_id, tool_id, status, created_at").gte("created_at", since).limit(50000),
    admin.from("generations").select("id", { count: "exact", head: true }),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const latest = await admin.from("generations").select("user_id, tool_id, status, created_at").order("created_at", { ascending: false }).limit(8);
  const byId = new Map(users.map((u) => [u.id, u]));
  const nameOf = (u: User | undefined) => (u ? (profileNameOf(u.app_metadata) ?? displayName(u.user_metadata)) : null);
  const providerCount = new Map<string, number>();
  for (const u of users) for (const p of providersOf(u)) providerCount.set(p, (providerCount.get(p) ?? 0) + 1);

  const today = kstDay(now);
  const days = new Map<string, AdminDay & { users: Set<string> }>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const day = kstDay(now - i * DAY_MS);
    days.set(day, { day, signups: 0, runs: 0, failed: 0, activeMembers: 0, users: new Set() });
  }

  for (const u of users) {
    const d = days.get(kstDay(u.created_at));
    if (d) d.signups++;
  }

  let runsToday = 0;
  let runs7d = 0;
  let failed7d = 0;
  const active7d = new Set<string>();
  const tools = new Map<string, number>();
  for (const r of recentRuns.data ?? []) {
    const d = days.get(kstDay(r.created_at));
    if (d) {
      d.runs++;
      if (r.status === "error") d.failed++;
      d.users.add(r.user_id);
    }
    if (kstDay(r.created_at) === today) runsToday++;
    if (new Date(r.created_at).getTime() >= weekAgo) {
      runs7d++;
      if (r.status === "error") failed7d++;
      active7d.add(r.user_id);
      if (r.tool_id) tools.set(r.tool_id, (tools.get(r.tool_id) ?? 0) + 1);
    }
  }

  return {
    members: users.length,
    newMembers7d: users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
    membersWithKey: new Set((keyRows.data ?? []).map((r) => r.user_id)).size,
    activeMembers7d: active7d.size,
    runsToday,
    runs7d,
    failed7d,
    runsAllTime: allRuns.count ?? 0,
    openTickets: openTickets.count ?? 0,
    topTools7d: [...tools.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([toolId, runs]) => ({ toolId, runs })),
    days: [...days.values()].reverse().map(({ users: u, ...d }) => ({ ...d, activeMembers: u.size })),
    providers: [...providerCount.entries()].map(([provider, members]) => ({ provider, members })).sort((a, b) => b.members - a.members),
    recentMembers: users.slice(0, 5).map((u) => ({ id: u.id, name: nameOf(u), email: u.email ?? "", provider: providersOf(u)[0] ?? "email", createdAt: u.created_at })),
    recentRuns: (latest.data ?? []).slice(0, 8).map((r) => ({ userId: r.user_id, name: nameOf(byId.get(r.user_id)), email: byId.get(r.user_id)?.email ?? "", toolId: r.tool_id, status: r.status, createdAt: r.created_at })),
  };
}

// ── Support tickets ────────────────────────────────────────────────────

export type TicketStatus = "open" | "answered" | "closed";

export interface AdminTicket {
  id: string;
  kind: string;
  subject: string;
  body: string;
  contact: string | null;
  preferredTime: string | null;
  status: TicketStatus;
  reply: string | null;
  createdAt: string;
  email: string;
  userId: string;
}

/** All members' tickets in one status — the staff side of lib/support.ts. */
export async function listAllTickets(status: TicketStatus): Promise<{ tickets: AdminTicket[]; counts: Record<TicketStatus, number> }> {
  const admin = createAdminClient();
  const count = (s: TicketStatus) => admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", s);
  const [rows, open, answered, closed] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id, user_id, kind, subject, body, contact, preferred_time, status, reply, created_at")
      .eq("status", status)
      .order("created_at", { ascending: status === "open" }) // oldest open first; newest answered/closed first
      .limit(100),
    count("open"),
    count("answered"),
    count("closed"),
  ]);

  const ids = [...new Set((rows.data ?? []).map((t) => t.user_id))];
  const emails = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.email) emails.set(id, data.user.email);
    }),
  );

  return {
    tickets: (rows.data ?? []).map((t) => ({
      id: t.id,
      kind: t.kind,
      subject: t.subject,
      body: t.body,
      contact: t.contact,
      preferredTime: t.preferred_time,
      status: t.status,
      reply: t.reply,
      createdAt: t.created_at,
      email: emails.get(t.user_id) ?? "",
      userId: t.user_id,
    })),
    counts: { open: open.count ?? 0, answered: answered.count ?? 0, closed: closed.count ?? 0 },
  };
}
