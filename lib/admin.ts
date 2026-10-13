import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";

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
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const allow = adminEmails();
  if (allow.size === 0) return null;
  const user = await getCurrentUser();
  if (!user?.email || !allow.has(user.email.toLowerCase())) return null;
  return { id: user.id, email: user.email };
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

// ── Members ────────────────────────────────────────────────────────────

const USER_PAGE = 1000;
const USER_PAGE_LIMIT = 10; // up to 10,000 members; plenty for now

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
  return users.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface AdminMember {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
  keys: string[];
  runs: number;
  lastRunAt: string | null;
}

export async function listMembers({ q = "", page = 1, perPage = 50 }: { q?: string; page?: number; perPage?: number }): Promise<{ members: AdminMember[]; total: number; page: number; pages: number }> {
  const needle = q.trim().toLowerCase();
  const all = (await listAllUsers()).filter((u) => !needle || (u.email ?? "").toLowerCase().includes(needle));
  const pages = Math.max(1, Math.ceil(all.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const slice = all.slice((current - 1) * perPage, current * perPage);
  const ids = slice.map((u) => u.id);

  const keys = new Map<string, Set<string>>();
  const runs = new Map<string, { count: number; last: string | null }>();
  if (ids.length) {
    const admin = createAdminClient();
    const [keyRows, runRows] = await Promise.all([
      admin.from("user_api_keys").select("user_id, provider").in("user_id", ids),
      admin.from("generations").select("user_id, created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(20000),
    ]);
    for (const r of keyRows.data ?? []) {
      if (!keys.has(r.user_id)) keys.set(r.user_id, new Set());
      keys.get(r.user_id)!.add(r.provider);
    }
    for (const r of runRows.data ?? []) {
      const cur = runs.get(r.user_id) ?? { count: 0, last: null };
      cur.count += 1;
      if (!cur.last) cur.last = r.created_at; // rows arrive newest first
      runs.set(r.user_id, cur);
    }
  }

  return {
    members: slice.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      provider: u.app_metadata?.provider ?? "email",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      keys: [...(keys.get(u.id) ?? [])].sort(),
      runs: runs.get(u.id)?.count ?? 0,
      lastRunAt: runs.get(u.id)?.last ?? null,
    })),
    total: all.length,
    page: current,
    pages,
  };
}

// ── Overview ───────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
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
    })),
    counts: { open: open.count ?? 0, answered: answered.count ?? 0, closed: closed.count ?? 0 },
  };
}
