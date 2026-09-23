"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsEnabled, PRO_PLAN_PRICE_KRW } from "@/lib/payments";

export type CheckoutState = { ok: true; orderId: string; amount: number; orderName: string } | { ok: false; message: string };

// Creates the pending payment row server-side, before the browser ever
// talks to Toss — the success route (app/api/payments/toss/success)
// then looks this row up by orderId and checks the amount matches
// exactly what Toss confirms, so a tampered client-side amount can
// never be accepted (never trust the redirect query params alone).
export async function createProCheckout(): Promise<CheckoutState> {
  if (!paymentsEnabled()) return { ok: false, message: "payments_disabled" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "signed_out" };

  const orderId = `pro-${randomUUID()}`;
  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({ user_id: user.id, order_id: orderId, amount: PRO_PLAN_PRICE_KRW, plan: "pro", status: "pending" });
  if (error) return { ok: false, message: error.message };

  return { ok: true, orderId, amount: PRO_PLAN_PRICE_KRW, orderName: "해봇 AI 프로 (1개월)" };
}
