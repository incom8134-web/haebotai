import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

// Access control for /admin: an email allow-list, not a role/permissions
// system — appropriate for a small staff list, not worth a table+RLS
// system of its own. ADMIN_EMAILS unset means no one gets in (fails
// closed), matching every other optional-feature default in lib/env.ts.

function adminEmails(): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** The signed-in user's own email if it's on the admin list, else null. */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const allow = adminEmails();
  if (allow.size === 0) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !allow.has(user.email.toLowerCase())) return null;
  return { id: user.id, email: user.email };
}

/**
 * One row per staff action (lib/actions/admin.ts), via the service-role
 * client — never client-writable (supabase/migrations/0013_audit_log.sql).
 * Best-effort: a logging failure must never block the action it's
 * recording, so this never throws.
 */
export async function logAdminAction(
  actorUserId: string,
  action: string,
  targetTable: string,
  targetId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const admin = createAdminClient();
  try {
    await admin.from("audit_log").insert({ actor_user_id: actorUserId, action, target_table: targetTable, target_id: targetId, detail });
  } catch {
    // best-effort — a logging failure must never block the action itself
  }
}

export interface AdminTicket {
  id: string;
  kind: string;
  subject: string;
  body: string;
  contact: string | null;
  preferredTime: string | null;
  status: "open" | "answered" | "closed";
  reply: string | null;
  createdAt: string;
}

/** All tickets, any user — the admin-side counterpart to lib/support.ts's own-tickets-only listTickets(). */
export async function listAllTickets(status?: "open" | "answered" | "closed"): Promise<AdminTicket[]> {
  const admin = createAdminClient();
  let query = admin
    .from("support_tickets")
    .select("id, kind, subject, body, contact, preferred_time, status, reply, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []).map((t) => ({
    id: t.id,
    kind: t.kind,
    subject: t.subject,
    body: t.body,
    contact: t.contact,
    preferredTime: t.preferred_time,
    status: t.status,
    reply: t.reply,
    createdAt: t.created_at,
  }));
}

export interface AdminStudentRequest {
  id: string;
  userId: string;
  schoolName: string;
  schoolEmail: string | null;
  note: string | null;
  createdAt: string;
}

export async function listPendingStudentVerifications(): Promise<AdminStudentRequest[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("student_verifications")
    .select("id, user_id, school_name, school_email, note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    schoolName: r.school_name,
    schoolEmail: r.school_email,
    note: r.note,
    createdAt: r.created_at,
  }));
}
