"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser, isStaffEmail, keyTierTarget, logAdminAction } from "@/lib/admin";
import { checkGoogleKeyTier, getUserApiKeySlotFor, type ApiKeyPriority } from "@/lib/api-keys";
import { PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import { NOTICE_TEMPLATES, safeLink } from "@/lib/admin-ops";
import { clearAnnouncementCache, getSiteSettings, saveSetting, sendNotice } from "@/lib/admin-ops-server";
import { publicTools } from "@/lib/tools/catalog";
import { deleteAccountData } from "@/lib/account-delete";
import { normalizeName } from "@/lib/member-name";
import { createAdminClient } from "@/lib/supabase/admin";
import { envHostList, normalizeHostEntry } from "@/lib/platform-access";

/** Enough for a team and its partners; a longer list belongs in a table. */
const HOST_LIMIT = 200;

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

// ── Notices to one member ──────────────────────────────────────────────

const NOTICE_TITLE_MAX = 120;
const NOTICE_BODY_MAX = 1000;

/** Sends a notice (a template or custom text) that shows as a banner in the member's app until they close it. */
export async function sendMemberNotice(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const templateId = String(formData.get("template") ?? "custom");
  const tpl = NOTICE_TEMPLATES.find((t) => t.id === templateId) ?? NOTICE_TEMPLATES[NOTICE_TEMPLATES.length - 1];
  const title = (String(formData.get("title") ?? "").trim() || tpl.title).slice(0, NOTICE_TITLE_MAX);
  const body = (String(formData.get("body") ?? "").trim() || tpl.body).slice(0, NOTICE_BODY_MAX);
  const link = safeLink(formData.get("link")) ?? tpl.link;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "missing_member" };
  if (!title) return { ok: false, message: "notice_empty" };

  try {
    const noticeId = await sendNotice(id, { kind: tpl.id, title, body, link }, staff.id);
    await logAdminAction(staff.id, "send_notice", "member_notices", noticeId, { member: id, kind: tpl.id });
  } catch (err) {
    console.error("notice send failed", err);
    return { ok: false, message: "ops_not_ready" };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "notice_sent" };
}

// ── Announcements and patch notes ──────────────────────────────────────

const kstInputToIso = (raw: FormDataEntryValue | null): string | null => {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}:00+09:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

/** Create or update a banner or patch note (id present = update). */
export async function saveAnnouncement(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const kind = formData.get("kind") === "patch" ? "patch" : "banner";
  const level = (["info", "warning", "success"] as const).find((l) => l === formData.get("level")) ?? "info";
  const row = {
    kind,
    level,
    title_ko: String(formData.get("title_ko") ?? "").trim().slice(0, 160),
    title_en: String(formData.get("title_en") ?? "").trim().slice(0, 160),
    body_ko: String(formData.get("body_ko") ?? "").trim().slice(0, 3000),
    body_en: String(formData.get("body_en") ?? "").trim().slice(0, 3000),
    version: String(formData.get("version") ?? "").trim().slice(0, 20) || null,
    link: safeLink(formData.get("link")),
    published: formData.get("published") === "on",
    starts_at: kstInputToIso(formData.get("starts_at")),
    ends_at: kstInputToIso(formData.get("ends_at")),
    updated_at: new Date().toISOString(),
  };
  if (!row.title_ko) return { ok: false, message: "announcement_title" };

  const admin = createAdminClient();
  const res = /^[0-9a-f-]{36}$/i.test(id)
    ? await admin.from("announcements").update(row).eq("id", id).select("id").single()
    : await admin.from("announcements").insert({ ...row, created_by: staff.id }).select("id").single();
  if (res.error || !res.data) return { ok: false, message: "ops_not_ready" };

  clearAnnouncementCache();
  await logAdminAction(staff.id, id ? "update_announcement" : "create_announcement", "announcements", res.data.id, { kind, published: row.published });
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "announcement_saved" : "announcement_created" };
}

/** Publish/unpublish or delete an announcement. */
export async function changeAnnouncement(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["publish", "unpublish", "delete"].includes(op)) return { ok: false, message: "save_failed" };
  const admin = createAdminClient();
  const { error } = op === "delete" ? await admin.from("announcements").delete().eq("id", id) : await admin.from("announcements").update({ published: op === "publish", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, message: "ops_not_ready" };
  clearAnnouncementCache();
  await logAdminAction(staff.id, `${op}_announcement`, "announcements", id);
  revalidatePath("/", "layout");
  return { ok: true, message: `announcement_${op}` };
}

// ── Maintenance mode and paused tools ──────────────────────────────────

export async function setMaintenance(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const on = formData.get("on") === "1";
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  try {
    await saveSetting("maintenance", { on, message }, staff.id);
  } catch {
    return { ok: false, message: "ops_not_ready" };
  }
  await logAdminAction(staff.id, on ? "maintenance_on" : "maintenance_off", "site_settings", "maintenance", { message });
  revalidatePath("/", "layout");
  return { ok: true, message: on ? "maintenance_on" : "maintenance_off" };
}

export async function setToolPaused(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const slug = String(formData.get("slug") ?? "");
  const pause = formData.get("pause") === "1";
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  if (!publicTools().some((t) => t.slug === slug)) return { ok: false, message: "save_failed" };

  const current = (await getSiteSettings(true)).pausedTools;
  const next = { ...current };
  if (pause) next[slug] = { message, at: new Date().toISOString() };
  else delete next[slug];
  try {
    await saveSetting("paused_tools", next, staff.id);
  } catch {
    return { ok: false, message: "ops_not_ready" };
  }
  await logAdminAction(staff.id, pause ? "pause_tool" : "resume_tool", "site_settings", slug, { message });
  revalidatePath("/", "layout");
  return { ok: true, message: pause ? "tool_paused" : "tool_resumed" };
}

// ── Hosts: free runs on the platform key ───────────────────────────────

/** Adds an email or "@domain" to the host list (lib/platform-access.ts). Live within 15 s. */
export async function addHostEmail(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const entry = normalizeHostEntry(formData.get("email"));
  if (!entry) return { ok: false, message: "host_invalid" };
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const settings = await getSiteSettings(true);
  if (settings.hostMeta[entry] || envHostList().includes(entry)) return { ok: false, message: "host_exists" };
  if (settings.hostEmails.length >= HOST_LIMIT) return { ok: false, message: "host_limit" };
  const next = { ...settings.hostMeta, [entry]: { addedAt: new Date().toISOString(), by: staff.email, note } };
  try {
    await saveSetting("host_emails", next, staff.id);
  } catch {
    return { ok: false, message: "ops_not_ready" };
  }
  await logAdminAction(staff.id, "host_add", "site_settings", entry, { note });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "host_added" };
}

export async function removeHostEmail(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const entry = normalizeHostEntry(formData.get("email"));
  const settings = await getSiteSettings(true);
  if (!entry || !settings.hostMeta[entry]) return { ok: false, message: "host_missing" };
  const next = { ...settings.hostMeta };
  delete next[entry];
  try {
    await saveSetting("host_emails", next, staff.id);
  } catch {
    return { ok: false, message: "ops_not_ready" };
  }
  await logAdminAction(staff.id, "host_remove", "site_settings", entry);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "host_removed" };
}

// ── Plans and credits (refunds, goodwill, corrections) ─────────────────

const CREDIT_ADJUST_MAX = 100_000;

/** Adds (or, negative, takes back) credits. Atomic and never below 0 (migration 0023). */
export async function adjustMemberCredits(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const delta = Math.trunc(Number(formData.get("delta")));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!id) return { ok: false, message: "missing_member" };
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > CREDIT_ADJUST_MAX) return { ok: false, message: "credits_invalid" };
  if (!reason) return { ok: false, message: "reason_required" };
  const { data, error } = await createAdminClient().rpc("admin_adjust_credits", { p_user_id: id, p_delta: delta });
  if (error) return { ok: false, message: "credits_not_ready" };
  await logAdminAction(staff.id, "adjust_credits", "user_credits", id, { delta, reason, balance: data });
  revalidatePath(`/admin/members/${id}`);
  return { ok: true, message: "credits_saved" };
}

/** Sets a member's plan: Plus or Pro for a number of days from today (or added to days left), or back to Free. */
export async function setMemberPlan(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await getAdminUser();
  if (!staff) return { ok: false, message: "not_admin" };
  const id = String(formData.get("id") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const days = Math.trunc(Number(formData.get("days")));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!id) return { ok: false, message: "missing_member" };
  if (!["free", "plus", "pro"].includes(plan)) return { ok: false, message: "plan_invalid" };
  if (plan !== "free" && (!Number.isFinite(days) || days < 1 || days > 366)) return { ok: false, message: "days_invalid" };
  if (!reason) return { ok: false, message: "reason_required" };
  const admin = createAdminClient();
  const { data: row } = await admin.from("memberships").select("plan, expires_at").eq("user_id", id).maybeSingle();
  const now = Date.now();
  const running = row && (row.plan === "plus" || row.plan === "pro") && row.expires_at && new Date(row.expires_at).getTime() > now ? new Date(row.expires_at).getTime() : now;
  // Same plan: days stack on what's left. A different plan starts today.
  const from = row?.plan === plan ? running : now;
  const next = plan === "free" ? { plan: "free", expires_at: null } : { plan, expires_at: new Date(from + days * 86_400_000).toISOString() };
  const { error } = await admin.from("memberships").upsert({ user_id: id, ...next });
  if (error) return { ok: false, message: "save_failed" };
  await logAdminAction(staff.id, "set_plan", "memberships", id, { from: row ?? null, to: next, reason });
  revalidatePath(`/admin/members/${id}`);
  return { ok: true, message: plan === "free" ? "plan_cleared" : "plan_saved" };
}
