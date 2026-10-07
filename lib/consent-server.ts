import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { CONSENT_VERSION, consentOf, type ConsentState } from "@/lib/consent";

// Server side of lib/consent.ts: writes the consent state to the user's
// app_metadata (service role only) and keeps the written record — one
// JSON line per change, with time, IP and browser — in the private
// "consents" storage bucket at <user id>/log.jsonl. The bucket has no
// policies for members; only the server reads or writes it.

const BUCKET = "consents";

interface ConsentEvent {
  at: string;
  kind: "signup_consent" | "marketing_opt_in" | "marketing_opt_out" | "unsubscribe_link";
  v: string;
  items: Record<string, boolean>;
  ip: string | null;
  ua: string | null;
}

export function requestMeta(request: Request): { ip: string | null; ua: string | null } {
  const fwd = request.headers.get("x-forwarded-for");
  return {
    ip: (fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip")) || null,
    ua: request.headers.get("user-agent")?.slice(0, 300) || null,
  };
}

type Admin = ReturnType<typeof createAdminClient>;

let bucketReady = false;
async function ensureBucket(admin: Admin) {
  if (bucketReady) return;
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 1024 * 1024 });
  bucketReady = true;
}

/** Appends one event to the user's consent log. */
export async function appendConsentLog(userId: string, event: ConsentEvent, admin: Admin = createAdminClient()) {
  await ensureBucket(admin);
  const path = `${userId}/log.jsonl`;
  const { data } = await admin.storage.from(BUCKET).download(path);
  const prev = data ? await data.text() : "";
  const next = `${prev}${JSON.stringify(event)}\n`;
  const { error } = await admin.storage.from(BUCKET).upload(path, new Blob([next], { type: "application/x-ndjson" }), { upsert: true, contentType: "application/x-ndjson" });
  if (error) throw new Error(`consent log: ${error.message}`);
}

/** Saves the consent state in app_metadata (merging, so other keys stay). */
export async function saveConsentState(userId: string, state: ConsentState, admin: Admin = createAdminClient()) {
  const { data, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !data.user) throw new Error(`consent: ${getErr?.message ?? "no user"}`);
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(data.user.app_metadata ?? {}), consent: state } });
  if (error) throw new Error(`consent: ${error.message}`);
}

/** Turns marketing email on or off for a user and records it. */
export async function setMarketing(userId: string, optIn: boolean, kind: ConsentEvent["kind"], meta: { ip: string | null; ua: string | null }) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const prev = consentOf(data.user?.app_metadata);
  if (!prev) throw new Error("no consent record");
  const now = new Date().toISOString();
  if (prev.marketing !== optIn) await saveConsentState(userId, { ...prev, marketing: optIn, marketing_at: now }, admin);
  await appendConsentLog(userId, { at: now, kind, v: prev.v ?? CONSENT_VERSION, items: { marketing: optIn }, ...meta }, admin);
}

// ------------------------------------------------------------ unsubscribe

function unsubscribeKey(): string {
  // A dedicated key derived from a server secret; the service role key is
  // always present, the encryption secret only with bring-your-own-key.
  return createHmac("sha256", env.API_KEY_ENCRYPTION_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY).update("haebot:unsubscribe:v1").digest("hex");
}

/** Token for the one-click unsubscribe link in marketing emails. */
function unsubscribeToken(userId: string): string {
  return createHmac("sha256", unsubscribeKey()).update(userId).digest("base64url");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(userId));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function unsubscribeUrl(userId: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}
