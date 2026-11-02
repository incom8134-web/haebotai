import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL, normalizeReferralCode } from "./referral";

type RedeemOutcome = "ok" | "invalid" | "self" | "not_new" | "already" | "unavailable";

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

// ── Revenue share (migration 0024) ─────────────────────────────────────

export interface RevenueShareStatus {
  code: string;
  /** Friends who joined through the link. */
  invited: number;
  /** Of those, how many have bought something that earned a share. */
  buyers: number;
  wallet: { pending: number; available: number; requested: number; paid: number };
  commissions: { id: string; buyer: string; amount: number; commission: number; status: "held" | "available" | "canceled"; availableAt: string; createdAt: string }[];
  payouts: { id: string; gross: number; tax: number; net: number; status: "requested" | "paid" | "rejected"; requestedAt: string; processedAt: string | null; note: string | null }[];
  account: { holder: string; bank: string; last4: string } | null;
}

/** "kim***@gmail.com": enough for a referrer to recognize a friend, no more. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "—";
  return `${name.slice(0, Math.min(3, Math.max(1, name.length - 2)))}***@${domain}`;
}

/** The member's referral wallet; null when migration 0024 isn't applied yet. */
export async function getRevenueShareStatus(userId: string): Promise<RevenueShareStatus | null> {
  const admin = createAdminClient();
  const { data: code, error: codeError } = await admin.rpc("get_or_create_referral_code", { p_user_id: userId });
  if (codeError || typeof code !== "string") return null;
  const [invites, commissions, payouts, wallet, account] = await Promise.all([
    admin.from("referral_redemptions").select("referee_id").eq("referrer_id", userId),
    admin.from("referral_commissions").select("id, buyer_id, order_amount, commission, status, available_at, created_at").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(100),
    admin.from("referral_payouts").select("id, gross, tax, net, status, requested_at, processed_at, note").eq("user_id", userId).order("requested_at", { ascending: false }).limit(50),
    admin.rpc("referral_wallet", { p_user_id: userId }),
    admin.from("referral_payout_accounts").select("holder_name, bank_name, account_last4").eq("user_id", userId).maybeSingle(),
  ]);
  if (commissions.error || wallet.error) return null;
  const buyerIds = [...new Set((commissions.data ?? []).map((c) => c.buyer_id))];
  const emails = new Map<string, string>();
  await Promise.all(
    buyerIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      emails.set(id, data.user?.email ? maskEmail(data.user.email) : "—");
    }),
  );
  const w = (Array.isArray(wallet.data) ? wallet.data[0] : wallet.data) as { pending: number; available: number; requested: number; paid: number } | null;
  const now = Date.now();
  return {
    code,
    invited: invites.data?.length ?? 0,
    buyers: new Set((commissions.data ?? []).filter((c) => c.status !== "canceled").map((c) => c.buyer_id)).size,
    wallet: { pending: w?.pending ?? 0, available: w?.available ?? 0, requested: w?.requested ?? 0, paid: w?.paid ?? 0 },
    commissions: (commissions.data ?? []).map((c) => ({
      id: c.id,
      buyer: emails.get(c.buyer_id) ?? "—",
      amount: c.order_amount,
      commission: c.commission,
      status: c.status === "canceled" ? "canceled" : new Date(c.available_at).getTime() <= now ? "available" : "held",
      availableAt: c.available_at,
      createdAt: c.created_at,
    })),
    payouts: (payouts.data ?? []).map((p) => ({ id: p.id, gross: p.gross, tax: p.tax, net: p.net, status: p.status, requestedAt: p.requested_at, processedAt: p.processed_at, note: p.note })),
    account: account.data ? { holder: account.data.holder_name, bank: account.data.bank_name, last4: account.data.account_last4 } : null,
  };
}
