import "server-only";
import { env } from "@/lib/env";

// Toss Payments — one-time card charge per Pro period (see
// supabase/migrations/0014_payments.sql for why this isn't silent
// recurring billing yet). Verified against docs.tosspayments.com,
// 2026-09-23: POST /v1/payments/confirm, Basic auth with
// base64(secretKey + ":"), body { paymentKey, orderId, amount }.
//
// The redirect flow (not the in-page promise flow) is the documented
// default (@docsDefaultSignature RequestPaymentWithRedirection in the
// SDK's own types) — successUrl/failUrl must be full origin URLs.

export const PRO_PLAN_PRICE_KRW = 19_900; // matches lib/site/plans.ts's ₩19,900/월

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

export interface TossConfirmResult {
  ok: boolean;
  status?: string;
  method?: string;
  approvedAt?: string;
  raw: unknown;
  errorMessage?: string;
}

/** True once TOSS_SECRET_KEY/NEXT_PUBLIC_TOSS_CLIENT_KEY are both set — gates the checkout entry point. */
export function paymentsEnabled(): boolean {
  return !!env.TOSS_SECRET_KEY && !!env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
}

export async function confirmTossPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<TossConfirmResult> {
  if (!env.TOSS_SECRET_KEY) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다");
  const auth = Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString("base64");

  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, raw: body, errorMessage: body?.message ?? `결제 승인 실패 (HTTP ${res.status})` };
  }
  return { ok: true, status: body?.status, method: body?.method, approvedAt: body?.approvedAt, raw: body };
}
