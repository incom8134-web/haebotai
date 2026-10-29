import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTossPaymentByOrderId, type TossPayment } from "./toss";
import { isRetryable, planReconcile, productFor, type LedgerOrder, type TossView } from "./pro";

// Shared by the confirm route, the Toss webhook and the scheduled job.
// Whatever triggered it, the order's state is always re-read from Toss
// with our secret key — a webhook body is only a hint, never trusted.

type Admin = ReturnType<typeof createAdminClient>;

type ReconcileOutcome = "activated" | "activate_failed" | "closed" | "waiting" | "amount_mismatch" | "unknown_order" | "toss_error" | "noop";

/** pending → done + the order's plan days + credits, in one transaction (activate_order, migration 0022). The grant comes from the order's stored plan, never from the caller. */
export async function activateOrder(admin: Admin, orderId: string, payment: TossPayment): Promise<boolean> {
  const { data: row } = await admin.from("payments").select("plan").eq("order_id", orderId).maybeSingle();
  const product = productFor(row?.plan);
  if (!product) {
    console.error("[payments] unknown plan on order", orderId, row?.plan);
    return false;
  }
  const { data, error } = await admin.rpc("activate_order", {
    p_order_id: orderId,
    p_payment_key: payment.paymentKey,
    p_method: payment.method,
    p_approved_at: payment.approvedAt,
    p_raw: payment.raw,
    p_days: product.days,
    p_credits: product.credits,
  });
  if (error) {
    console.error("[payments] activate_order failed", orderId, error.message);
    return false;
  }
  return data === true;
}

export async function reconcileOrder(orderId: string): Promise<ReconcileOutcome> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("payments").select("status, amount, fail_reason, created_at").eq("order_id", orderId).maybeSingle();
  if (!row) return "unknown_order";
  const order: LedgerOrder = { status: row.status, amount: row.amount, failReason: row.fail_reason, createdAt: row.created_at };
  if (!isRetryable(order)) return "noop";

  const toss = await getTossPaymentByOrderId(orderId);
  let view: TossView;
  if (toss.ok) view = { found: true, status: toss.payment.status, totalAmount: toss.payment.totalAmount };
  else if (toss.code === "NOT_FOUND_PAYMENT" || toss.code === "HTTP_404") view = { found: false };
  else return "toss_error";

  const action = planReconcile(order, view);
  switch (action.kind) {
    case "activate": {
      if (!toss.ok) return "noop";
      if (order.status === "failed") {
        await admin.from("payments").update({ status: "pending", fail_reason: null }).eq("order_id", orderId).eq("status", "failed");
      }
      return (await activateOrder(admin, orderId, toss.payment)) ? "activated" : "activate_failed";
    }
    case "close":
      await admin
        .from("payments")
        .update({ status: action.status, fail_reason: action.reason, ...(toss.ok ? { raw: toss.payment.raw } : {}) })
        .eq("order_id", orderId)
        .in("status", ["pending", "failed"]);
      return "closed";
    case "amount_mismatch":
      // Charged a different amount than we recorded — a person must look.
      console.error("[payments] amount mismatch at Toss", orderId);
      await admin.from("payments").update({ status: "failed", fail_reason: "amount_mismatch_at_toss", ...(toss.ok ? { raw: toss.payment.raw } : {}) }).eq("order_id", orderId).in("status", ["pending", "failed"]);
      return "amount_mismatch";
    case "none":
      if (toss.ok && toss.payment.status === "WAITING_FOR_DEPOSIT") {
        await admin.from("payments").update({ payment_key: toss.payment.paymentKey, raw: toss.payment.raw }).eq("order_id", orderId).eq("status", "pending");
        return "waiting";
      }
      return "noop";
  }
}
