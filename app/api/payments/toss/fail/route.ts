import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Toss redirects here when the buyer cancels or the payment is
// declined — no charge happened, just mark our pending row so it
// doesn't sit around looking actionable.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const message = url.searchParams.get("message");

  if (orderId) {
    const admin = createAdminClient();
    await admin.from("payments").update({ status: "failed", fail_reason: message }).eq("order_id", orderId).eq("status", "pending");
  }

  return Response.redirect(new URL("/account/membership?paid=fail", url.origin));
}
