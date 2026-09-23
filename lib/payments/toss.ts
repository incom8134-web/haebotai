import "server-only";
import { env } from "@/lib/env";

// Toss Payments 결제 승인 API. The secret key never leaves the server;
// Basic auth is base64("<secretKey>:"). The orderId doubles as the
// Idempotency-Key, so a retried confirm for the same order can't approve
// twice on Toss's side either.

export type TossConfirmResult =
  | { ok: true; paymentKey: string; method: string | null; approvedAt: string | null; raw: unknown }
  | { ok: false; code: string; message: string; raw: unknown };

export function tossConfigured(): boolean {
  return Boolean(env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}

export async function confirmTossPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<TossConfirmResult> {
  if (!env.TOSS_SECRET_KEY) return { ok: false, code: "NOT_CONFIGURED", message: "결제가 설정되지 않았습니다", raw: null };
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.orderId,
    },
    body: JSON.stringify(params),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return { ok: false, code: "NETWORK_ERROR", message: "결제사에 연결하지 못했습니다", raw: null };
  const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string; paymentKey?: string; method?: string; approvedAt?: string };
  if (!res.ok) return { ok: false, code: data.code ?? `HTTP_${res.status}`, message: data.message ?? "결제 승인에 실패했습니다", raw: data };
  return { ok: true, paymentKey: data.paymentKey ?? params.paymentKey, method: data.method ?? null, approvedAt: data.approvedAt ?? null, raw: data };
}
