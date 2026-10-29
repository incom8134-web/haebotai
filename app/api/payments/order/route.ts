import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/consent";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/membership";
import { canBuy, newOrderId, productFor } from "@/lib/payments/pro";
import { tossConfigured } from "@/lib/payments/toss";
import { SAAS } from "@/lib/site/access";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";

// Step 1 of checkout: record a pending order (amount fixed server-side)
// before the payment widget opens. The confirm route only ever approves
// an order that exists here, for this user, at this amount.
export async function POST(request: Request) {
  // Plans are sold only in SaaS mode (lib/site/access.ts).
  if (!SAAS) return Response.json({ error: "지금은 결제를 받지 않아요" }, { status: 410 });
  const body = (await request.json().catch(() => null)) as { product?: unknown } | null;
  const product = productFor(body?.product ?? "plus");
  if (!product) return Response.json({ error: "알 수 없는 상품입니다" }, { status: 400 });
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
  if (!canBuy(product.id, membership.plan).ok) {
    return Response.json({ error: "크레딧 충전은 플러스·프로 이용 중에만 할 수 있어요", code: "plan_required" }, { status: 400 });
  }

  const orderId = newOrderId(product.id);
  const { error } = await createAdminClient()
    .from("payments")
    .insert({ user_id: user.id, order_id: orderId, plan: product.id, amount: product.amount });
  if (error) return Response.json({ error: "주문을 만들지 못했습니다" }, { status: 500 });

  return Response.json({ orderId, amount: product.amount, orderName: product.orderName, customerEmail: user.email ?? null });
}
