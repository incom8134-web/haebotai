import { reconcileOrder } from "@/lib/payments/reconcile";

// Toss webhook (register this URL in the Toss developer center for
// PAYMENT_STATUS_CHANGED and DEPOSIT_CALLBACK). The body only tells us
// WHICH order changed; its state is re-read from Toss with our secret key
// in reconcileOrder, so a forged request can't grant anything. Always
// answer 200 — Toss retries non-2xx deliveries.

type WebhookBody = { eventType?: string; orderId?: unknown; data?: { orderId?: unknown } };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WebhookBody | null;
  const orderId = typeof body?.data?.orderId === "string" ? body.data.orderId : typeof body?.orderId === "string" ? body.orderId : "";
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) return Response.json({ ok: true });

  const outcome = await reconcileOrder(orderId).catch((err) => {
    console.error("[payments] webhook reconcile failed", orderId, err);
    return "error";
  });
  if (outcome !== "noop" && outcome !== "unknown_order") console.info("[payments] webhook", body?.eventType ?? "deposit", orderId, outcome);
  return Response.json({ ok: true });
}
