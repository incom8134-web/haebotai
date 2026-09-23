import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/membership";
import { newOrderId, PRO_ORDER } from "@/lib/payments/pro";
import { tossConfigured } from "@/lib/payments/toss";

// Step 1 of checkout: record a pending order (amount fixed server-side)
// before the payment widget opens. The confirm route only ever approves
// an order that exists here, for this user, at this amount.
export async function POST() {
  if (!tossConfigured()) return Response.json({ error: "결제가 아직 준비되지 않았습니다" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

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
