import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL, normalizeReferralCode } from "./referral";

export type RedeemOutcome = "ok" | "invalid" | "self" | "not_new" | "already" | "unavailable";

// PostgREST's "function not found" — the database is behind this code.
const missingFunction = (code: string | undefined) => code === "PGRST202" || code === "42883";

/**
 * Records that a new member arrived with an invite code (paid later, on
 * their first successful run — payReferralAfterRun). Until migration 0017
 * is applied it falls back to 0014's pay-at-sign-up. Never throws.
 */
export async function claimReferral(refereeId: string, rawCode: string | undefined): Promise<RedeemOutcome> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return "invalid";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_referral", { p_referee_id: refereeId, p_code: code });
  if (!error) return data as RedeemOutcome;
  if (!missingFunction(error.code)) {
    console.error("[referral] claim failed", error.message);
    return "unavailable";
  }
  const legacy = await admin.rpc("redeem_referral", {
    p_referee_id: refereeId,
    p_code: code,
    p_bonus: REFERRAL.refereeBonus,
    p_max_per_referrer: REFERRAL.maxRewardedInvites,
  });
  if (legacy.error) {
    console.error("[referral] redeem failed", legacy.error.message);
    return "unavailable";
  }
  return legacy.data as RedeemOutcome;
}

/** After a run finishes: pays a pending invite (first run only). Never throws. */
export async function payReferralAfterRun(refereeId: string): Promise<void> {
  try {
    const { error } = await createAdminClient().rpc("pay_referral", {
      p_referee_id: refereeId,
      p_referee_bonus: REFERRAL.refereeBonus,
      p_referrer_bonus: REFERRAL.referrerBonus,
      p_max_per_referrer: REFERRAL.maxRewardedInvites,
    });
    if (error && !missingFunction(error.code)) console.warn("[referral] pay failed", error.message);
  } catch (err) {
    console.warn("[referral] pay failed", err);
  }
}

export interface ReferralStatus {
  code: string;
  /** Friends who signed up with the link. */
  invited: number;
  /** Signed up but no finished run yet. */
  pending: number;
  /** Credits this member has earned from invites. */
  earned: number;
}

/** null when the referral tables aren't installed yet (migration 0014). */
export async function getReferralStatus(userId: string): Promise<ReferralStatus | null> {
  const { data: code, error } = await createAdminClient().rpc("get_or_create_referral_code", { p_user_id: userId });
  if (error || typeof code !== "string") return null;
  const supabase = await createClient();
  const withStatus = await supabase.from("referral_redemptions").select("referrer_rewarded, status, referrer_bonus, bonus").eq("referrer_id", userId);
  if (!withStatus.error) {
    const rows = withStatus.data ?? [];
    return {
      code,
      invited: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      earned: rows.filter((r) => r.referrer_rewarded).reduce((sum, r) => sum + (r.referrer_bonus ?? r.bonus ?? 0), 0),
    };
  }
  // Before 0017: everything was paid at sign-up, same amount both sides.
  const { data: rows } = await supabase.from("referral_redemptions").select("referrer_rewarded, bonus").eq("referrer_id", userId);
  return { code, invited: rows?.length ?? 0, pending: 0, earned: (rows ?? []).filter((r) => r.referrer_rewarded).reduce((sum, r) => sum + (r.bonus ?? 0), 0) };
}
