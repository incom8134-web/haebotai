import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/consent";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/membership";
import { newOrderId, PRO_ORDER } from "@/lib/payments/pro";
import { tossConfigured } from "@/lib/payments/toss";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";

// Step 1 of checkout: record a pending order (amount fixed server-side)
// before the payment widget opens. The confirm route only ever approves
// an order that exists here, for this user, at this amount.
export async function POST() {
  // Credits aren't sold while members bring their own key (lib/site/access.ts).
  if (OWN_KEY_ONLY) return Response.json({ error: "크레딧 판매를 중단했어요 — 내 API 키를 등록하면 모든 도구를 쓸 수 있어요" }, { status: 410 });
  if (!tossConfigured()) return Response.json({ error: "결제가 아직 준비되지 않았습니다" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!hasCurrentConsent(user.app_metadata)) {
    return Response.json({ error: "서비스 이용 동의가 필요합니다", code: "consent_required" }, { status: 403 });
  }

  const rate = await checkRateLimit(paymentLimiter, user.id);
  if (!rate.ok) {
    return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const membership = await getMembership();
  if (membership.plan === "student") {
    return Response.json({ error: "학생 멤버십은 이미 크레딧 제한이 없어요" }, { status: 400 });
  }

  const orderId = newOrderId();
  const { error } = await createAdminClient()
    .from("payments")
    .insert({ user_id: user.id, order_id: orderId, plan: "pro", amount: PRO_ORDER.amount });
  if (error) return Response.json({ error: "주문을 만들지 못했습니다" }, { status: 500 });

  return Response.json({ orderId, amount: PRO_ORDER.amount, orderName: PRO_ORDER.orderName, customerEmail: user.email ?? null });
}
