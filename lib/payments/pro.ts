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
  orderName: "AI 해바 프로 30일",
} as const;

/** Toss orderId: 6–64 chars of [A-Za-z0-9_-]. */
export function newOrderId(randomUUID: () => string = () => crypto.randomUUID()): string {
  return `pro_${randomUUID().replace(/-/g, "")}`;
}

interface PendingOrder {
  amount: number;
  status: "pending" | "done" | "failed";
}

type ConfirmCheck = { ok: true } | { ok: false; reason: "already_done" | "not_pending" | "amount_mismatch" };

export interface LedgerOrder {
  status: "pending" | "done" | "failed" | "canceled";
  amount: number;
  failReason: string | null;
  createdAt: string;
}

/** What Toss reports for the order; `found: false` = Toss never saw a payment for it. */
export type TossView = { found: false } | { found: true; status: string; totalAmount: number };

type ReconcileAction =
  | { kind: "none" }
  | { kind: "activate" }
  | { kind: "close"; status: "failed" | "canceled"; reason: string }
  | { kind: "amount_mismatch" };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Brings our ledger in line with Toss. Retries orders still pending and
 * orders we marked failed only because the confirm call never got an
 * answer (Toss may have approved it anyway). Only a DONE payment at the
 * stored amount ever grants Pro — WAITING_FOR_DEPOSIT (가상계좌) waits.
 */
export function isRetryable(order: Pick<LedgerOrder, "status" | "failReason">): boolean {
  return order.status === "pending" || (order.status === "failed" && (order.failReason ?? "").startsWith("NETWORK_ERROR"));
}

export function planReconcile(order: LedgerOrder, toss: TossView, now: number = Date.now()): ReconcileAction {
  if (!isRetryable(order)) return { kind: "none" };
  if (!toss.found) {
    const stale = now - Date.parse(order.createdAt) > DAY_MS;
    return order.status === "pending" && stale ? { kind: "close", status: "failed", reason: "abandoned" } : { kind: "none" };
  }
  switch (toss.status) {
    case "DONE":
      return toss.totalAmount === order.amount ? { kind: "activate" } : { kind: "amount_mismatch" };
    case "CANCELED":
      return { kind: "close", status: "canceled", reason: "canceled_at_toss" };
    case "ABORTED":
    case "EXPIRED":
      return order.status === "pending" ? { kind: "close", status: "failed", reason: toss.status.toLowerCase() } : { kind: "none" };
    default:
      return { kind: "none" };
  }
}

/** Validates a success redirect against the stored order before calling Toss. */
export function checkConfirm(order: PendingOrder, amount: number): ConfirmCheck {
  if (order.status === "done") return { ok: false, reason: "already_done" };
  if (order.status !== "pending") return { ok: false, reason: "not_pending" };
  if (!Number.isInteger(amount) || amount !== order.amount) return { ok: false, reason: "amount_mismatch" };
  return { ok: true };
}
