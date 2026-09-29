import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkConfirm } from "@/lib/payments/pro";
import { activateOrder, reconcileOrder } from "@/lib/payments/reconcile";
import { confirmTossPayment } from "@/lib/payments/toss";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";

const PENDING_MESSAGE = "결제 확인이 늦어지고 있어요. 결제가 완료됐다면 몇 분 안에 자동으로 적용돼요.";

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

  const rate = await checkRateLimit(paymentLimiter, user.id);
  if (!rate.ok) {
    return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

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
      return Response.json({ error: "결제 금액이 주문과 다릅니다" }, { status: 400 });
    }
    // Not pending: e.g. an earlier confirm timed out. Ask Toss what happened.
    const outcome = await reconcileOrder(orderId);
    if (outcome === "activated") return Response.json({ ok: true });
    return Response.json({ error: "이미 처리된 주문이에요. 멤버십 화면에서 결제 내역을 확인해 주세요." }, { status: 409 });
  }

  const toss = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!toss.ok) {
    // No answer from Toss: it may have approved anyway. Keep the order
    // retryable (reconcile treats NETWORK_ERROR failures as open) and tell
    // the user not to pay again.
    if (toss.code === "NETWORK_ERROR") {
      await admin.from("payments").update({ status: "failed", fail_reason: `${toss.code}: ${toss.message}` }).eq("order_id", orderId).eq("status", "pending");
      return Response.json({ pending: true, error: PENDING_MESSAGE }, { status: 202 });
    }
    // A previous confirm already went through at Toss but its reply was lost.
    if (toss.code === "ALREADY_PROCESSED_PAYMENT") {
      const outcome = await reconcileOrder(orderId);
      return outcome === "activated" ? Response.json({ ok: true }) : Response.json({ pending: true, error: PENDING_MESSAGE }, { status: 202 });
    }
    await admin.from("payments").update({ status: "failed", fail_reason: `${toss.code}: ${toss.message}`, raw: toss.raw }).eq("order_id", orderId).eq("status", "pending");
    return Response.json({ error: toss.message, code: toss.code }, { status: 400 });
  }

  // 가상계좌: approved means "account issued", not "paid". Pro waits for the
  // deposit, which the webhook / scheduled job pick up.
  if (toss.payment.status === "WAITING_FOR_DEPOSIT") {
    await admin.from("payments").update({ payment_key: toss.payment.paymentKey, raw: toss.payment.raw }).eq("order_id", orderId).eq("status", "pending");
    return Response.json({ pending: true, error: "입금을 기다리고 있어요. 입금이 확인되면 자동으로 프로가 적용돼요." }, { status: 202 });
  }
  if (toss.payment.status !== "DONE") return Response.json({ pending: true, error: PENDING_MESSAGE }, { status: 202 });

  if (!(await activateOrder(admin, orderId, toss.payment))) {
    // The webhook may have activated it first.
    const { data: now } = await admin.from("payments").select("status").eq("order_id", orderId).maybeSingle();
    if (now?.status === "done") return Response.json({ ok: true });
    // Charged but not activated yet. The order stays pending, so the
    // webhook / scheduled job retry activation automatically.
    return Response.json({ pending: true, error: `결제는 완료됐어요. 프로 적용을 자동으로 다시 시도하고 있어요. 한 시간 넘게 적용되지 않으면 주문번호 ${orderId}로 문의해주세요.` }, { status: 202 });
  }

  return Response.json({ ok: true });
}
