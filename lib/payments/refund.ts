// Refund amount for one paid order, from the refund policy
// (lib/site/legal.ts, SAAS_REFUND §1):
//   - only within 7 days of payment;
//   - none of that payment's credits used → full amount;
//   - some used → amount × unused ÷ granted, rounded down (the policy's
//     own example: ₩29,900, 500 of 2,000 used → ₩22,425);
//   - credits held from before this payment count as used first, so usage
//     only eats into this payment once those are gone.
// Pure and tested in refund.test.ts; the server reads are in
// refund-server.ts.

export const REFUND_WINDOW_DAYS = 7;

export interface RefundInput {
  /** What the member paid for this order (KRW). */
  amount: number;
  /** Credits this order granted (PRODUCTS[plan].credits). */
  productCredits: number;
  /** Credits spent since this payment. */
  creditsUsedSince: number;
  /** Days since the payment was approved (fractions allowed). */
  daysSincePayment: number;
  /** Credits the member still had from earlier payments when this one landed; they're used first. */
  earlierCredits?: number;
}

export type RefundQuote =
  | { ok: true; refundAmount: number; full: boolean; usedFromOrder: number; unusedCredits: number }
  | { ok: false; reason: "bad_input" | "window_passed" | "fully_used"; usedFromOrder: number };

const isCount = (n: number) => Number.isFinite(n) && n >= 0;

export function quoteRefund(input: RefundInput): RefundQuote {
  const { amount, productCredits, creditsUsedSince, daysSincePayment } = input;
  const earlier = input.earlierCredits ?? 0;
  if (!Number.isInteger(amount) || amount <= 0 || !Number.isInteger(productCredits) || productCredits <= 0 || !isCount(creditsUsedSince) || !isCount(daysSincePayment) || !isCount(earlier)) {
    return { ok: false, reason: "bad_input", usedFromOrder: 0 };
  }

  const usedFromOrder = Math.min(productCredits, Math.max(0, Math.ceil(creditsUsedSince - earlier)));
  if (daysSincePayment > REFUND_WINDOW_DAYS) return { ok: false, reason: "window_passed", usedFromOrder };

  const unusedCredits = productCredits - usedFromOrder;
  if (unusedCredits === 0) return { ok: false, reason: "fully_used", usedFromOrder };
  if (usedFromOrder === 0) return { ok: true, refundAmount: amount, full: true, usedFromOrder, unusedCredits };
  return { ok: true, refundAmount: Math.floor((amount * unusedCredits) / productCredits), full: false, usedFromOrder, unusedCredits };
}

/**
 * Credits left over from before this payment, worked out from today's
 * balance: balance = earlier + this order + later orders − used since.
 * Other grants (referral bonus, hand fixes) aren't tracked per payment,
 * so this is an estimate; it's clamped at 0.
 */
export function earlierCreditsFrom(p: { balanceNow: number; creditsUsedSince: number; productCredits: number; laterOrderCredits: number }): number {
  return Math.max(0, p.balanceNow + p.creditsUsedSince - p.productCredits - p.laterOrderCredits);
}

// ── The refund action's steps (lib/actions/admin.ts refundPayment) ─────
// Kept here with its dependencies passed in, so the order of checks —
// staff first, then the quote, then Toss, then our ledger — is tested
// without a database or Toss.

export interface RefundOrder {
  orderId: string;
  userId: string;
  paymentKey: string | null;
  amount: number;
  status: string;
  paidAt: string;
  product: { id: string; credits: number; days: number };
}

export type OrderQuote = { order: RefundOrder; quote: RefundQuote } | { order: null; reason: "unknown_order" | "not_refundable" };

export interface RefundDeps {
  getStaff(): Promise<{ id: string } | null>;
  quote(orderId: string): Promise<OrderQuote>;
  cancelAtToss(p: { paymentKey: string; orderId: string; cancelAmount: number; cancelReason: string }): Promise<{ ok: true; raw: unknown } | { ok: false; code: string; message: string }>;
  applyRefund(p: { orderId: string; refundAmount: number; credits: number; days: number; raw: unknown }): Promise<boolean>;
  log(staffId: string, action: string, targetTable: string, targetId: string, detail: Record<string, unknown>): Promise<void>;
}

export type RefundResult = { ok: boolean; message: string; userId?: string };

const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;
export const DEFAULT_CANCEL_REASON = "고객 요청 환불";

export async function runRefund(deps: RefundDeps, input: { orderId: string; expectedAmount: number; reason?: string }): Promise<RefundResult> {
  const staff = await deps.getStaff();
  if (!staff) return { ok: false, message: "not_admin" };
  if (!ORDER_ID.test(input.orderId)) return { ok: false, message: "refund_not_refundable" };

  const q = await deps.quote(input.orderId);
  if (!q.order) return { ok: false, message: `refund_${q.reason}` };
  const { order, quote } = q;
  if (!quote.ok) return { ok: false, message: `refund_${quote.reason}`, userId: order.userId };
  // The member may have used credits since the preview was shown.
  if (input.expectedAmount !== quote.refundAmount) return { ok: false, message: "refund_changed", userId: order.userId };
  if (!order.paymentKey) return { ok: false, message: "refund_no_payment_key", userId: order.userId };

  const cancelReason = (input.reason ?? "").trim().slice(0, 200) || DEFAULT_CANCEL_REASON;
  const toss = await deps.cancelAtToss({ paymentKey: order.paymentKey, orderId: order.orderId, cancelAmount: quote.refundAmount, cancelReason });
  const detail = { member: order.userId, amount: quote.refundAmount, paid: order.amount, full: quote.full, usedFromOrder: quote.usedFromOrder, creditsTakenBack: quote.unusedCredits, days: order.product.days, reason: cancelReason };
  if (!toss.ok) {
    await deps.log(staff.id, "refund_payment_failed", "payments", order.orderId, { ...detail, step: "toss", code: toss.code, message: toss.message });
    return { ok: false, message: "refund_toss_failed", userId: order.userId };
  }

  // Only the order's unused credits come back: the used ones are what the
  // kept part of the payment paid for, and taking more would eat into
  // credits from later orders.
  // Toss has refunded; a ledger failure now needs a hand fix, so it's logged loudly.
  const applied = await deps.applyRefund({ orderId: order.orderId, refundAmount: quote.refundAmount, credits: quote.unusedCredits, days: order.product.days, raw: toss.raw }).catch(() => false);
  await deps.log(staff.id, applied ? "refund_payment" : "refund_payment_failed", "payments", order.orderId, applied ? detail : { ...detail, step: "ledger" });
  return applied ? { ok: true, message: "refunded", userId: order.userId } : { ok: false, message: "refund_ledger_failed", userId: order.userId };
}
