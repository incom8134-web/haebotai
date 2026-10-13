"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Staff actions for /admin. Each one re-checks getAdminUser() itself: the
// pages are gated, but a server action is a reachable endpoint on its own.
// Writes go through the service-role client because support_tickets only
// lets members read and insert their own rows (0007).

export type AdminActionState = { ok: boolean; message: string } | null;

const NEXT_STATUSES = ["answered", "closed"] as const;

export async function replyToTicket(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };

  const ticketId = String(formData.get("ticketId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  const status = String(formData.get("status") ?? "answered");
  if (!ticketId) return { ok: false, message: "missing_ticket" };
  if (!NEXT_STATUSES.includes(status as (typeof NEXT_STATUSES)[number])) return { ok: false, message: "bad_status" };
  // Closing without a reply is fine (spam, duplicates); answering needs one.
  if (status === "answered" && (reply.length < 1 || reply.length > 4000)) return { ok: false, message: "reply_length" };
  if (reply.length > 4000) return { ok: false, message: "reply_length" };

  const { error } = await createAdminClient()
    .from("support_tickets")
    .update({ status, ...(reply ? { reply } : {}) })
    .eq("id", ticketId);
  if (error) return { ok: false, message: "save_failed" };

  await logAdminAction(staff.id, status === "answered" ? "reply_ticket" : "close_ticket", "support_tickets", ticketId, { status });
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "answered" ? "replied" : "closed" };
}

export async function reopenTicket(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return { ok: false, message: "missing_ticket" };

  const { error } = await createAdminClient().from("support_tickets").update({ status: "open" }).eq("id", ticketId);
  if (error) return { ok: false, message: "save_failed" };

  await logAdminAction(staff.id, "reopen_ticket", "support_tickets", ticketId);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "reopened" };
}
