import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL, normalizeReferralCode } from "./referral";

export type RedeemOutcome = "ok" | "invalid" | "self" | "not_new" | "already" | "unavailable";

/** Credits both sides for a new member who arrived with an invite code. Never throws. */
export async function redeemReferral(refereeId: string, rawCode: string | undefined): Promise<RedeemOutcome> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return "invalid";
  const { data, error } = await createAdminClient().rpc("redeem_referral", {
    p_referee_id: refereeId,
    p_code: code,
    p_bonus: REFERRAL.bonus,
    p_max_per_referrer: REFERRAL.maxRewardedInvites,
  });
  if (error) {
    console.error("[referral] redeem failed", error.message);
    return "unavailable";
  }
  return data as RedeemOutcome;
}

export interface ReferralStatus {
  code: string;
  invited: number;
  rewarded: number;
}

/** null when the referral tables aren't installed yet (migration 0014). */
export async function getReferralStatus(userId: string): Promise<ReferralStatus | null> {
  const { data: code, error } = await createAdminClient().rpc("get_or_create_referral_code", { p_user_id: userId });
  if (error || typeof code !== "string") return null;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("referral_redemptions").select("referrer_rewarded").eq("referrer_id", userId);
  return { code, invited: rows?.length ?? 0, rewarded: (rows ?? []).filter((r) => r.referrer_rewarded).length };
}
