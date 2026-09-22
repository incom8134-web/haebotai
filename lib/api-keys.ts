import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { open } from "@/lib/crypto/secret-box";

// Server-only reads for "bring your own API key". Never import from a
// client component and never return the plaintext to the browser —
// actions in lib/actions/api-keys.ts return only last4/status.
//
// user_api_keys has no direct client access at all, not even select
// (supabase/migrations/0011) — `ciphertext` must never reach a browser.
// Anything touching the raw table (ciphertext reads, any write) goes
// through the service-role client and derives the user id from a real
// supabase.auth.getUser() call, never from caller input, since RLS no
// longer enforces that. The one exception is getApiKeyStatus(), which
// reads the user_api_key_status view — a security-definer view scoped
// to auth.uid() that only ever exposes non-secret columns, safe for a
// normal per-user client.
//
// Each provider allows up to 3 keys, priority 1-3. getUserApiKeys()
// returns them in priority order for the caller to try in turn and
// advance past on a quota error (see runWithApiKey in lib/tools/generate.ts).
// Gemini and Anthropic both call out for real now; OpenAI keys are
// stored and verified but sit unused until a tool calls them.

export const API_KEY_PROVIDERS = ["google", "anthropic", "openai"] as const;
export type ApiKeyProvider = (typeof API_KEY_PROVIDERS)[number];
export type ApiKeyPriority = 1 | 2 | 3;

export interface ApiKeySlot {
  priority: ApiKeyPriority;
  connected: boolean;
  last4: string | null;
  updatedAt: string | null;
}

export interface ApiKeyStatus {
  enabled: boolean; // server has an encryption secret configured
  connected: boolean; // any provider has any key registered
  providers: Record<ApiKeyProvider, ApiKeySlot[]>;
}

function emptySlots(): ApiKeySlot[] {
  return [1, 2, 3].map((priority) => ({ priority: priority as ApiKeyPriority, connected: false, last4: null, updatedAt: null }));
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const enabled = !!env.API_KEY_ENCRYPTION_SECRET;
  const providers = Object.fromEntries(API_KEY_PROVIDERS.map((p) => [p, emptySlots()])) as Record<ApiKeyProvider, ApiKeySlot[]>;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { enabled, connected: false, providers };

  // The view is already scoped to auth.uid() — no extra filter needed,
  // and it never has a ciphertext column to accidentally select.
  const { data } = await supabase.from("user_api_key_status").select("provider, priority, last4, updated_at");
  for (const row of data ?? []) {
    const slot = providers[row.provider as ApiKeyProvider]?.[row.priority - 1];
    if (!slot) continue;
    slot.connected = true;
    slot.last4 = row.last4;
    slot.updatedAt = row.updated_at;
  }
  const connected = API_KEY_PROVIDERS.some((p) => providers[p].some((s) => s.connected));
  return { enabled, connected, providers };
}

/** Decrypted keys for the current user, in priority order. Used by the run route only. */
export async function getUserApiKeys(provider: ApiKeyProvider, options?: { excludeBroken?: boolean }): Promise<string[]> {
  const secret = env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_api_keys")
    .select("ciphertext, broken")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .order("priority", { ascending: true });

  const keys: string[] = [];
  for (const row of data ?? []) {
    if (options?.excludeBroken && row.broken) continue; // rotation shouldn't keep retrying a key already known dead
    try {
      keys.push(open(row.ciphertext, secret));
    } catch {
      // secret rotated or row corrupted — skip this one key, try the rest
    }
  }
  return keys;
}

/** A single decrypted slot, for the "test this key" action. */
export async function getUserApiKeySlot(provider: ApiKeyProvider, priority: ApiKeyPriority): Promise<string | null> {
  const secret = env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_api_keys")
    .select("ciphertext")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("priority", priority)
    .maybeSingle();
  if (!data?.ciphertext) return null;
  try {
    return open(data.ciphertext, secret);
  } catch {
    return null;
  }
}

/** Flags a slot the rotation classifier found invalid/revoked (401/403). Best-effort — never blocks generation. */
export async function markApiKeySlotBroken(userId: string, provider: ApiKeyProvider, priority: ApiKeyPriority): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_api_keys").update({ broken: true }).eq("user_id", userId).eq("provider", provider).eq("priority", priority);
}

export async function verifyGoogleKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyAnthropicKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyOpenAIKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
