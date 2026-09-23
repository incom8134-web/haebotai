"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Staff actions for /admin. Every one re-checks getAdminUser() itself —
// the page is gated, but a server action is a reachable endpoint on its
// own, so the gate has to live here too, not just in the UI. All writes
// go through the service-role client (support_tickets/student_verifications
// only grant authenticated select+insert of their OWN rows — see
// supabase/migrations/0007_support_keys_membership.sql — staff replying
// or approving someone else's row was never something RLS could allow).

export type AdminActionState = { ok: boolean; message: string } | null;

const TICKET_STATUSES = ["answered", "closed"] as const;

export async function replyToTicket(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin_ = await getAdminUser();
  if (!admin_) return { ok: false, message: "not_admin" };

  const ticketId = String(formData.get("ticketId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  const status = String(formData.get("status") ?? "answered");
  if (!ticketId) return { ok: false, message: "missing_ticket" };
  if (reply.length < 1 || reply.length > 4000) return { ok: false, message: "reply_length" };
  if (!TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) return { ok: false, message: "bad_status" };

  const admin = createAdminClient();
  const { error } = await admin.from("support_tickets").update({ reply, status }).eq("id", ticketId);
  if (error) return { ok: false, message: error.message };

  await logAdminAction(admin_.id, "reply_ticket", "support_tickets", ticketId, { status });
  revalidatePath("/admin/tickets");
  return { ok: true, message: "replied" };
}

const STUDENT_PLAN_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export async function approveStudentVerification(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin_ = await getAdminUser();
  if (!admin_) return { ok: false, message: "not_admin" };

  const requestId = String(formData.get("requestId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!requestId || !userId) return { ok: false, message: "missing_request" };

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + STUDENT_PLAN_DURATION_MS).toISOString();

  const { error: membershipError } = await admin.from("memberships").upsert({ user_id: userId, plan: "student", expires_at: expiresAt });
  if (membershipError) return { ok: false, message: membershipError.message };

  const { error: requestError } = await admin.from("student_verifications").update({ status: "approved" }).eq("id", requestId);
  if (requestError) return { ok: false, message: requestError.message };

  await logAdminAction(admin_.id, "approve_student", "student_verifications", requestId, { userId, expiresAt });
  revalidatePath("/admin/students");
  return { ok: true, message: "approved" };
}

export async function rejectStudentVerification(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin_ = await getAdminUser();
  if (!admin_) return { ok: false, message: "not_admin" };

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { ok: false, message: "missing_request" };

  const admin = createAdminClient();
  const { error } = await admin.from("student_verifications").update({ status: "rejected" }).eq("id", requestId);
  if (error) return { ok: false, message: error.message };

  await logAdminAction(admin_.id, "reject_student", "student_verifications", requestId, {});
  revalidatePath("/admin/students");
  return { ok: true, message: "rejected" };
}
