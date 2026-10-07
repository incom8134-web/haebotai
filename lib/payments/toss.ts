import "server-only";
import { env } from "@/lib/env";
import { BUSINESS } from "@/lib/site/business";

// Toss Payments 결제 승인 / 조회 API. The secret key never leaves the server;
// Basic auth is base64("<secretKey>:"). The orderId doubles as the
// Idempotency-Key, so a retried confirm for the same order can't approve
// twice on Toss's side either.

export type TossPaymentStatus = "READY" | "IN_PROGRESS" | "WAITING_FOR_DEPOSIT" | "DONE" | "CANCELED" | "PARTIAL_CANCELED" | "ABORTED" | "EXPIRED";

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  status: TossPaymentStatus;
  totalAmount: number;
  method: string | null;
  approvedAt: string | null;
  receiptUrl: string | null;
  raw: unknown;
}

type TossResult = { ok: true; payment: TossPayment } | { ok: false; code: string; message: string; raw: unknown };

export function tossConfigured(): boolean {
  if (!env.TOSS_SECRET_KEY || !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) return false;
  // Real (live) payments only once the 통신판매업 신고번호 is on the site:
  // selling online without it, or without showing it, breaks
  // 전자상거래법 §10·§12. Test keys keep working for checkout testing.
  if (env.TOSS_SECRET_KEY.startsWith("live_") && !BUSINESS.mailOrderNumber.trim()) return false;
  return true;
}

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

type RawPayment = { paymentKey?: string; orderId?: string; status?: string; totalAmount?: number; method?: string; approvedAt?: string; receipt?: { url?: string } | null; code?: string; message?: string };

function parsePayment(data: RawPayment, fallback: { paymentKey?: string; orderId?: string } = {}): TossPayment {
  return {
    paymentKey: data.paymentKey ?? fallback.paymentKey ?? "",
    orderId: data.orderId ?? fallback.orderId ?? "",
    status: (data.status ?? "READY") as TossPaymentStatus,
    totalAmount: typeof data.totalAmount === "number" ? data.totalAmount : NaN,
    method: data.method ?? null,
    approvedAt: data.approvedAt ?? null,
    receiptUrl: typeof data.receipt?.url === "string" ? data.receipt.url : null,
    raw: data,
  };
}

async function call(url: string, init: RequestInit, fallback: { paymentKey?: string; orderId?: string }): Promise<TossResult> {
  if (!env.TOSS_SECRET_KEY) return { ok: false, code: "NOT_CONFIGURED", message: "결제가 설정되지 않았습니다", raw: null };
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: authHeader(env.TOSS_SECRET_KEY), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res) return { ok: false, code: "NETWORK_ERROR", message: "결제사에 연결하지 못했습니다", raw: null };
  const data = (await res.json().catch(() => ({}))) as RawPayment;
  if (!res.ok) return { ok: false, code: data.code ?? `HTTP_${res.status}`, message: data.message ?? "결제사 요청에 실패했습니다", raw: data };
  return { ok: true, payment: parsePayment(data, fallback) };
}

export function confirmTossPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<TossResult> {
  return call(
    "https://api.tosspayments.com/v1/payments/confirm",
    { method: "POST", headers: { "Idempotency-Key": params.orderId }, body: JSON.stringify(params) },
    params,
  );
}

/** The payment as Toss currently sees it — the source of truth for reconciliation. */
export function getTossPaymentByOrderId(orderId: string): Promise<TossResult> {
  return call(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, { method: "GET" }, { orderId });
}
