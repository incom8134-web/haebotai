import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileOrder } from "@/lib/payments/reconcile";

// Scheduled safety net (vercel.json → crons) for orders the success page
// and the webhook both missed. Vercel sends `Authorization: Bearer
// $CRON_SECRET`; without CRON_SECRET set, the job refuses to run.

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const settled = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("payments")
    .select("order_id")
    .or("status.eq.pending,and(status.eq.failed,fail_reason.like.NETWORK_ERROR*)")
    .gte("created_at", since)
    .lte("created_at", settled)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results: Record<string, number> = {};
  for (const { order_id } of data ?? []) {
    const outcome = await reconcileOrder(order_id).catch(() => "error");
    results[outcome] = (results[outcome] ?? 0) + 1;
  }
  console.info("[payments] reconcile run", results);
  return Response.json({ checked: data?.length ?? 0, results });
}
