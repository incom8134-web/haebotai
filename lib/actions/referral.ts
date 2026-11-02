"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";
import { env } from "@/lib/env";
import { seal } from "@/lib/crypto/secret-box";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";
import { normalizeAccountNumber, normalizeRrn, PAYOUT_BANKS, REVENUE_SHARE } from "@/lib/referral";
import { REFERRAL_REVENUE_SHARE } from "@/lib/site/access";

// Member actions for the referral wallet (/account/referral). The bank
// account and resident registration number are sealed here (AES-256-GCM,
// lib/crypto/secret-box.ts) before they reach the database; only staff
// processing a payout open them (lib/actions/admin.ts).

export type ReferralActionState = { ok: boolean; message: string } | null;

export async function saveReferralPayoutAccount(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  if (!REFERRAL_REVENUE_SHARE) return { ok: false, message: "closed" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "signed_out" };
  const rate = await checkRateLimit(paymentLimiter, user.id);
  if (!rate.ok) return { ok: false, message: "rate_limited" };
  const secret = env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) return { ok: false, message: "server_disabled" };

  const holder = String(formData.get("holder") ?? "").trim().slice(0, 40);
  const bank = String(formData.get("bank") ?? "");
  const account = normalizeAccountNumber(formData.get("account"));
  const rrn = normalizeRrn(formData.get("rrn"));
  if (formData.get("agree") !== "on") return { ok: false, message: "consent_required" };
  if (holder.length < 2) return { ok: false, message: "holder_required" };
  if (!(PAYOUT_BANKS as readonly string[]).includes(bank)) return { ok: false, message: "bank_required" };
  if (!account) return { ok: false, message: "account_invalid" };
  if (!rrn) return { ok: false, message: "rrn_invalid" };

  const { error } = await createAdminClient()
    .from("referral_payout_accounts")
    .upsert({ user_id: user.id, holder_name: holder, bank_name: bank, account_sealed: seal(account, secret), account_last4: account.slice(-4), rrn_sealed: seal(rrn, secret), agreed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: "save_failed" };
  revalidatePath("/account/referral");
  return { ok: true, message: "account_saved" };
}

export async function requestReferralPayout(): Promise<ReferralActionState> {
  if (!REFERRAL_REVENUE_SHARE) return { ok: false, message: "closed" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "signed_out" };
  const rate = await checkRateLimit(paymentLimiter, user.id);
  if (!rate.ok) return { ok: false, message: "rate_limited" };
  const { data, error } = await createAdminClient().rpc("request_referral_payout", { p_user_id: user.id, p_min: REVENUE_SHARE.minPayout, p_tax_rate: REVENUE_SHARE.withholdingRate });
  if (error) return { ok: false, message: "save_failed" };
  revalidatePath("/account/referral");
  return { ok: data === "ok", message: data === "ok" ? "payout_requested" : String(data) };
}
