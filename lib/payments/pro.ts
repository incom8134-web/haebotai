// Pro plan purchase — one-time 30-day pass via Toss Payments (결제위젯).
// No auto-renewal: 자동결제(빌링) needs a separate Toss contract, so a
// purchase adds 30 days (stacking on a running Pro period) and 2,000
// credits. Prices here are the source of truth — the confirm route
// checks Toss's redirect against the server-recorded order, never the
// client's numbers.

export const PRO_ORDER = {
  amount: 19_900,
  days: 30,
  credits: 2_000,
  orderName: "해봇 AI 프로 30일",
} as const;

/** Toss orderId: 6–64 chars of [A-Za-z0-9_-]. */
export function newOrderId(randomUUID: () => string = () => crypto.randomUUID()): string {
  return `pro_${randomUUID().replace(/-/g, "")}`;
}

export interface PendingOrder {
  amount: number;
  status: "pending" | "done" | "failed";
}

export type ConfirmCheck = { ok: true } | { ok: false; reason: "already_done" | "not_pending" | "amount_mismatch" };

/** Validates a success redirect against the stored order before calling Toss. */
export function checkConfirm(order: PendingOrder, amount: number): ConfirmCheck {
  if (order.status === "done") return { ok: false, reason: "already_done" };
  if (order.status !== "pending") return { ok: false, reason: "not_pending" };
  if (!Number.isInteger(amount) || amount !== order.amount) return { ok: false, reason: "amount_mismatch" };
  return { ok: true };
}
