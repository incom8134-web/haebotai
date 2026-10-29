// Plan purchases via Toss Payments (결제위젯): Plus and Pro are 30-day
// passes, a top-up adds credits to a running plan. No auto-renewal yet:
// 자동결제(빌링) needs a separate Toss contract (see docs/billing.md).
// Prices here are the source of truth — the order route records the
// amount server-side and the confirm route checks Toss's redirect
// against that row, never the client's numbers.
//
// 1 credit ≈ ₩5 of AI cost (tool prices in lib/tools/registry). Each
// payment grants at most this much AI cost (prices include 10% VAT):
//   Plus  ₩29,900 → 2,000 credits ≈ ₩10,000
//   Pro   ₩59,900 → 6,000 credits ≈ ₩30,000
//   Top-up ₩5,900 →   500 credits ≈ ₩2,500

export type ProductId = "plus" | "pro" | "topup";

export interface Product {
  id: ProductId;
  amount: number;
  /** Days of membership added (0 for a top-up). */
  days: number;
  credits: number;
  orderName: string;
}

export const PRODUCTS: Record<ProductId, Product> = {
  plus: { id: "plus", amount: 29_900, days: 30, credits: 2_000, orderName: "AI 해바 플러스 30일" },
  pro: { id: "pro", amount: 59_900, days: 30, credits: 6_000, orderName: "AI 해바 프로 30일" },
  topup: { id: "topup", amount: 5_900, days: 0, credits: 500, orderName: "AI 해바 크레딧 500" },
};

/** Kept for code that still names the Pro pass. */
export const PRO_ORDER = PRODUCTS.pro;

export function productFor(id: unknown): Product | null {
  return typeof id === "string" && id in PRODUCTS ? PRODUCTS[id as ProductId] : null;
}

/** Plans that can run tools. */
export function isPaidPlan(plan: string | null | undefined): plan is "plus" | "pro" {
  return plan === "plus" || plan === "pro";
}

/** Who may buy what: a top-up only on a running Plus or Pro. */
export function canBuy(product: ProductId, currentPlan: string): { ok: true } | { ok: false; reason: "plan_required" } {
  if (product === "topup" && !isPaidPlan(currentPlan)) return { ok: false, reason: "plan_required" };
  return { ok: true };
}

/** Toss orderId: 6–64 chars of [A-Za-z0-9_-]. */
export function newOrderId(product: ProductId = "pro", randomUUID: () => string = () => crypto.randomUUID()): string {
  return `${product}_${randomUUID().replace(/-/g, "")}`;
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
 * stored amount ever grants anything — WAITING_FOR_DEPOSIT (가상계좌) waits.
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
