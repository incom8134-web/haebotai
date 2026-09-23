import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmTossPayment } from "@/lib/payments";

// Toss redirects here after the buyer completes checkout, with
// paymentKey/orderId/amount as query params — never trust these alone.
// The pending row created at checkout start (lib/actions/payments.ts)
// is the source of truth for what was actually supposed to be charged;
// this route re-derives amount from OUR row, not the URL, before ever
// calling Toss's confirm API with it.
const PRO_PLAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const paymentKey = url.searchParams.get("paymentKey");
  const orderId = url.searchParams.get("orderId");
  const redirectAmount = Number(url.searchParams.get("amount"));

  if (!paymentKey || !orderId || !Number.isFinite(redirectAmount)) {
    return Response.redirect(new URL("/account/membership?paid=fail", url.origin));
  }

  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id, user_id, amount, status").eq("order_id", orderId).maybeSingle();

  if (!payment || payment.status !== "pending" || payment.amount !== redirectAmount) {
    return Response.redirect(new URL("/account/membership?paid=fail", url.origin));
  }

  const confirmed = await confirmTossPayment({ paymentKey, orderId, amount: payment.amount });

  if (!confirmed.ok) {
    await admin.from("payments").update({ status: "failed", fail_reason: confirmed.errorMessage, raw: confirmed.raw }).eq("id", payment.id);
    return Response.redirect(new URL("/account/membership?paid=fail", url.origin));
  }

  await admin.from("payments").update({ status: "done", payment_key: paymentKey, raw: confirmed.raw }).eq("id", payment.id);

  const expiresAt = new Date(Date.now() + PRO_PLAN_DURATION_MS).toISOString();
  await admin.from("memberships").upsert({ user_id: payment.user_id, plan: "pro", expires_at: expiresAt });

  return Response.redirect(new URL("/account/membership?paid=success", url.origin));
}
