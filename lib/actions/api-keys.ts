"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { looksLikeAnthropicKey, looksLikeGoogleKey, looksLikeOpenAIKey, seal } from "@/lib/crypto/secret-box";
import { getUserApiKeySlot, verifyAnthropicKey, verifyGoogleKey, verifyOpenAIKey, type ApiKeyPriority, type ApiKeyProvider } from "@/lib/api-keys";

export type ApiKeyActionState = { ok: boolean; message: string } | null;

const CHECKS: Record<ApiKeyProvider, { looksLike: (key: string) => boolean; verify: (key: string) => Promise<boolean> }> = {
  google: { looksLike: looksLikeGoogleKey, verify: verifyGoogleKey },
  anthropic: { looksLike: looksLikeAnthropicKey, verify: verifyAnthropicKey },
  openai: { looksLike: looksLikeOpenAIKey, verify: verifyOpenAIKey },
};

function parsePriority(value: FormDataEntryValue | null): ApiKeyPriority | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

// user_api_keys has no direct grants for authenticated at all
// (supabase/migrations/0011) — every write here goes through the
// service-role client, after this same function has already verified
// the key with the provider and derived the caller's own user id from a
// real supabase.auth.getUser() call.

export async function saveApiKey(_prev: ApiKeyActionState, formData: FormData): Promise<ApiKeyActionState> {
  const secret = env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) return { ok: false, message: "server_disabled" };

  const provider = String(formData.get("provider") ?? "") as ApiKeyProvider;
  const priority = parsePriority(formData.get("priority"));
  const check = CHECKS[provider];
  if (!check || !priority) return { ok: false, message: "invalid_format" };

  const key = String(formData.get("apiKey") ?? "").trim();
  if (!check.looksLike(key)) return { ok: false, message: "invalid_format" };
  if (!(await check.verify(key))) return { ok: false, message: "rejected_by_provider" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "signed_out" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, priority, ciphertext: seal(key, secret), last4: key.slice(-4), broken: false });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/account/api-key");
  return { ok: true, message: "saved" };
}

export async function deleteApiKey(provider: ApiKeyProvider, priority: ApiKeyPriority): Promise<ApiKeyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "signed_out" };
  const admin = createAdminClient();
  const { error } = await admin.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider).eq("priority", priority);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/account/api-key");
  return { ok: true, message: "deleted" };
}

export async function testApiKey(provider: ApiKeyProvider, priority: ApiKeyPriority): Promise<ApiKeyActionState> {
  const key = await getUserApiKeySlot(provider, priority);
  if (!key) return { ok: false, message: "no_key" };
  const valid = await CHECKS[provider].verify(key);
  if (valid) {
    // A slot the rotation classifier flagged broken (401/403) is worth
    // retrying — the user may have just fixed it on the provider's side.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      await admin.from("user_api_keys").update({ broken: false }).eq("user_id", user.id).eq("provider", provider).eq("priority", priority);
    }
  }
  return valid ? { ok: true, message: "valid" } : { ok: false, message: "rejected_by_provider" };
}
