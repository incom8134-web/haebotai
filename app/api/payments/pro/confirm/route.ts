import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkConfirm, PRO_ORDER } from "@/lib/payments/pro";
import { confirmTossPayment } from "@/lib/payments/toss";

// Step 2 of checkout: Toss redirected to the success page with
// paymentKey/orderId/amount. Check them against the stored order, ask
// Toss to approve, then activate Pro in one transaction (activate_pro in
// supabase/migrations/0012 only acts on a still-pending order).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { paymentKey?: unknown; orderId?: unknown; amount?: unknown } | null;
  const paymentKey = typeof body?.paymentKey === "string" ? body.paymentKey : "";
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const amount = Number(body?.amount);
  if (!paymentKey || !orderId) return Response.json({ error: "결제 정보가 올바르지 않습니다" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("payments")
    .select("amount, status")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return Response.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });

  const check = checkConfirm(order, amount);
  if (!check.ok) {
    // A refresh of the success page after it already worked.
    if (check.reason === "already_done") return Response.json({ ok: true, alreadyDone: true });
    if (check.reason === "amount_mismatch") {
      await admin.from("payments").update({ status: "failed", fail_reason: "amount_mismatch" }).eq("order_id", orderId).eq("status", "pending");
    }
    return Response.json({ error: "결제 금액이 주문과 다릅니다" }, { status: 400 });
  }

  const toss = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!toss.ok) {
    await admin.from("payments").update({ status: "failed", fail_reason: `${toss.code}: ${toss.message}`, raw: toss.raw }).eq("order_id", orderId).eq("status", "pending");
    return Response.json({ error: toss.message, code: toss.code }, { status: 400 });
  }

  const { error } = await admin.rpc("activate_pro", {
    p_order_id: orderId,
    p_payment_key: toss.paymentKey,
    p_method: toss.method,
    p_approved_at: toss.approvedAt,
    p_raw: toss.raw,
    p_days: PRO_ORDER.days,
    p_credits: PRO_ORDER.credits,
  });
  if (error) {
    // Charged but not activated — needs a human. The order id is what
    // support looks up (and what a Toss cancel would use).
    console.error("activate_pro failed", orderId, error.message);
    return Response.json({ error: `결제는 완료됐지만 프로 적용에 실패했습니다. 주문번호 ${orderId}로 문의해주세요.` }, { status: 500 });
  }

  return Response.json({ ok: true });
}
