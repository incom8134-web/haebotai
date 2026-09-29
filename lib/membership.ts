import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/site/plans";
import { getCurrentUser } from "@/lib/supabase/user";

export interface Membership {
  plan: PlanId;
  expiresAt: string | null;
  daysLeft: number | null;
  studentRequest: "pending" | "approved" | "rejected" | null;
}

export interface PaymentRecord {
  orderId: string;
  amount: number;
  status: "pending" | "done" | "failed" | "canceled";
  createdAt: string;
  receiptUrl: string | null;
}

/** The user's orders, newest first (RLS: own rows only). Receipt URL comes from Toss's stored payment object. */
export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await supabase
    .from("payments")
    .select("order_id, amount, status, created_at, receipt_url:raw->receipt->>url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);
  return (data ?? []).map((r) => ({
    orderId: r.order_id,
    amount: r.amount,
    status: r.status,
    createdAt: r.created_at,
    receiptUrl: typeof r.receipt_url === "string" && /^https:\/\/([a-z0-9-]+\.)*tosspayments\.com\//.test(r.receipt_url) ? r.receipt_url : null,
  }));
}

export async function getMembership(): Promise<Membership> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const empty: Membership = { plan: "free", expiresAt: null, daysLeft: null, studentRequest: null };
  if (!user) return empty;

  const [{ data: row }, { data: request }] = await Promise.all([
    supabase.from("memberships").select("plan, expires_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("student_verifications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const expired = row?.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  const plan = (row && !expired ? row.plan : "free") as PlanId;
  const daysLeft = row?.expires_at && !expired ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86_400_000) : null;
  return { plan, expiresAt: row?.expires_at ?? null, daysLeft, studentRequest: (request?.status as Membership["studentRequest"]) ?? null };
}
