// Revenue against costs for /admin/payments. Pure, so it's tested.
//
// Everything is an estimate except the money Toss moved: the card fee is
// a typical small-merchant rate (check the Toss contract), and AI cost is
// credits spent on the platform key × ₩5 (lib/payments/pro.ts). Runs on a
// member's own key cost the company nothing; host runs are on /admin/hosts.

export const COSTS = {
  /** Toss card/easy-pay fee, VAT included — replace with the contract rate. */
  tossFeeRate: 0.034,
  /** AI cost per credit on the platform key (lib/payments/pro.ts). */
  wonPerCredit: 5,
} as const;

export interface RevenueInput {
  /** approved: Toss approved it (approved_at set), so money moved even if it was refunded later. */
  payments: { amount: number; refunded: number; status: string; plan: string | null; approved: boolean }[];
  /** Credits charged for finished runs in the period (platform key only). */
  creditsUsed: number;
  /** Referral shares earned in the period and not canceled. */
  referralShares: number;
}

export interface RevenueSummary {
  orders: number;
  gross: number;
  refunds: number;
  /** Gross − refunds. */
  net: number;
  vat: number;
  tossFee: number;
  aiCost: number;
  referral: number;
  /** Net without VAT, minus fees, AI cost and referral shares. */
  margin: number;
  byPlan: Record<string, { orders: number; net: number }>;
}

export function revenueSummary(input: RevenueInput): RevenueSummary {
  const paid = input.payments.filter((p) => p.approved && (p.status === "done" || p.status === "canceled"));
  // A canceled paid order was refunded in full (before migration 0025 it has no refunded amount).
  const refundOf = (p: (typeof paid)[number]) => (p.status === "canceled" ? p.amount : p.refunded);
  const gross = paid.reduce((s, p) => s + p.amount, 0);
  const refunds = paid.reduce((s, p) => s + refundOf(p), 0);
  const net = gross - refunds;
  const vat = Math.round(net / 11);
  const tossFee = Math.round(net * COSTS.tossFeeRate);
  const aiCost = input.creditsUsed * COSTS.wonPerCredit;
  const byPlan: RevenueSummary["byPlan"] = {};
  for (const p of paid) {
    const k = p.plan ?? "other";
    byPlan[k] ??= { orders: 0, net: 0 };
    byPlan[k].orders++;
    byPlan[k].net += p.amount - refundOf(p);
  }
  return { orders: paid.length, gross, refunds, net, vat, tossFee, aiCost, referral: input.referralShares, margin: net - vat - tossFee - aiCost - input.referralShares, byPlan };
}
