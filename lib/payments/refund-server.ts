import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { productFor } from "./pro";
import { earlierCreditsFrom, quoteRefund, type OrderQuote, type RefundOrder } from "./refund";

// Reads behind a refund quote: the order, credits spent since it was paid,
// later orders and today's balance. Used by the admin member page (the
// preview on the button) and by the refund action (the amount sent to
// Toss), so both always agree. Callers must have checked getAdminUser().

type Admin = ReturnType<typeof createAdminClient>;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function quoteOrderRefund(orderId: string, now: number = Date.now(), admin: Admin = createAdminClient()): Promise<OrderQuote> {
  const { data: row } = await admin
    .from("payments")
    .select("order_id, user_id, payment_key, amount, plan, status, approved_at, created_at, refunded_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!row) return { order: null, reason: "unknown_order" };
  const product = productFor(row.plan);
  if (!product || row.status !== "done" || row.refunded_at) return { order: null, reason: "not_refundable" };

  const paidAt: string = row.approved_at ?? row.created_at;
  const order: RefundOrder = { orderId: row.order_id, userId: row.user_id, paymentKey: row.payment_key ?? null, amount: row.amount, status: row.status, paidAt, product };

  const [runs, later, credits] = await Promise.all([
    admin.from("generations").select("credits_used, credits_reserved, credits_settled").eq("user_id", row.user_id).gte("created_at", paidAt),
    admin.from("payments").select("order_id, plan, approved_at, created_at").eq("user_id", row.user_id).eq("status", "done").gte("created_at", row.created_at).neq("order_id", orderId),
    admin.from("user_credits").select("balance").eq("user_id", row.user_id).maybeSingle(),
  ]);
  if (runs.error || later.error || credits.error) throw new Error("refund quote read failed");

  // A settled run counts what it used; an unsettled one still holds its reservation.
  const creditsUsedSince = (runs.data ?? []).reduce((sum, r) => sum + (r.credits_settled ? (r.credits_used ?? 0) : (r.credits_reserved ?? 0)), 0);
  const laterOrderCredits = (later.data ?? []).filter((p) => Date.parse(p.approved_at ?? p.created_at) >= Date.parse(paidAt)).reduce((sum, p) => sum + (productFor(p.plan)?.credits ?? 0), 0);
  const earlierCredits = earlierCreditsFrom({ balanceNow: credits.data?.balance ?? 0, creditsUsedSince, productCredits: product.credits, laterOrderCredits });

  const quote = quoteRefund({
    amount: row.amount,
    productCredits: product.credits,
    creditsUsedSince,
    earlierCredits,
    daysSincePayment: Math.max(0, (now - Date.parse(paidAt)) / DAY_MS),
  });
  return { order, quote };
}
