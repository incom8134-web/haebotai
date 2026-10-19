"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser, isStaffEmail, keyTierTarget, logAdminAction } from "@/lib/admin";
import { checkGoogleKeyTier, getUserApiKeySlotFor, type ApiKeyPriority } from "@/lib/api-keys";
import { PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import { deleteAccountData } from "@/lib/account-delete";
import { normalizeName } from "@/lib/member-name";
import { createAdminClient } from "@/lib/supabase/admin";

// Staff actions for /admin. Each one re-checks getAdminUser() itself: the
// pages are gated, but a server action is a reachable endpoint on its own.
// Writes go through the service-role client because support_tickets only
// lets members read and insert their own rows (0007).

export type AdminActionState = { ok: boolean; message: string; id?: string } | null;

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

// ── Members (create / update / suspend / delete) ───────────────────────

const NOTE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds a member by email (e.g. a customer signed up over the phone). They
 * sign in later with Google or Kakao on the same email; until then they
 * still go through the consent page like everyone else, since only their
 * name is filled in here.
 */
export async function createMember(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = normalizeName(formData.get("name"));
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, message: "bad_email" };
  if (!name) return { ok: false, message: "bad_name" };

  const { data, error } = await createAdminClient().auth.admin.createUser({ email, email_confirm: true, app_metadata: { name } });
  if (error || !data.user) return { ok: false, message: /already|exists|registered/i.test(error?.message ?? "") ? "email_taken" : "save_failed" };

  await logAdminAction(staff.id, "create_member", "auth.users", data.user.id, { email });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "member_created", id: data.user.id };
}

/** Name and staff note. */
export async function updateMember(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const name = normalizeName(formData.get("name"));
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { ok: false, message: "missing_member" };
  if (!name) return { ok: false, message: "bad_name" };
  if (note.length > NOTE_MAX) return { ok: false, message: "note_length" };

  const admin = createAdminClient();
  const { data, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !data.user) return { ok: false, message: "missing_member" };
  const prev = data.user.app_metadata ?? {};
  const { error } = await admin.auth.admin.updateUserById(id, { app_metadata: { ...prev, name, admin_note: note } });
  if (error) return { ok: false, message: "save_failed" };

  await logAdminAction(staff.id, "update_member", "auth.users", id, { nameChanged: prev.name !== name, noteChanged: (prev.admin_note ?? "") !== note });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "member_saved" };
}

/** Suspend (sign-in blocked) or restore a member. Staff can't be suspended here. */
export async function setMemberSuspended(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const suspend = formData.get("suspend") === "1";
  if (!id) return { ok: false, message: "missing_member" };

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  if (!data.user) return { ok: false, message: "missing_member" };
  if (isStaffEmail(data.user.email)) return { ok: false, message: "staff_protected" };

  // ~100 years: Supabase has no "forever"; "none" lifts it.
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: suspend ? "876000h" : "none" });
  if (error) return { ok: false, message: "save_failed" };

  await logAdminAction(staff.id, suspend ? "suspend_member" : "restore_member", "auth.users", id);
  revalidatePath("/admin", "layout");
  return { ok: true, message: suspend ? "member_suspended" : "member_restored" };
}

/** Deletes a member exactly like their own withdrawal (lib/account-delete.ts). Needs the email typed back. */
export async function deleteMember(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (!id) return { ok: false, message: "missing_member" };

  const { data } = await createAdminClient().auth.admin.getUserById(id);
  if (!data.user) return { ok: false, message: "missing_member" };
  if (isStaffEmail(data.user.email)) return { ok: false, message: "staff_protected" };
  if (!confirm || confirm !== (data.user.email ?? "").toLowerCase()) return { ok: false, message: "confirm_mismatch" };

  try {
    await deleteAccountData(id);
  } catch (err) {
    console.error("admin delete failed", id, err);
    return { ok: false, message: "save_failed" };
  }
  await logAdminAction(staff.id, "delete_member", "auth.users", id);
  revalidatePath("/admin", "layout");
  redirect("/admin/members?deleted=1");
}

// ── API key tier (free / paid) ─────────────────────────────────────────

/**
 * Checks whether a member's Gemini key is free-tier or paid
 * (lib/ai/key-tier.ts). The key never leaves the server and isn't
 * returned; only the verdict is, and it's kept in the audit log, which is
 * where the profile card reads the last result from.
 */
export async function checkMemberKeyTier(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const priority = Number(formData.get("priority"));
  if (!id || ![1, 2, 3].includes(priority)) return { ok: false, message: "missing_member" };

  const key = await getUserApiKeySlotFor(id, "google", priority as ApiKeyPriority);
  if (!key) return { ok: false, message: "no_key" };
  const tier = await checkGoogleKeyTier(key, PRO_TEXT_MODEL);

  await logAdminAction(staff.id, "check_key_tier", "user_api_keys", keyTierTarget(id, priority), { tier });
  revalidatePath("/admin/members", "layout");
  return { ok: tier !== "unknown", message: `tier_${tier}` };
}
