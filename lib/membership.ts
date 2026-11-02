import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/site/plans";
import { getCurrentUser } from "@/lib/supabase/user";
import { STUDENT_PLAN } from "@/lib/site/access";
import type { TaxInvoiceStatus } from "@/lib/tax-invoice";

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
  /** plus | pro | topup */
  plan: string | null;
  /** Won refunded so far (migration 0025; 0 before it). */
  refundedAmount: number;
  /** The member's tax invoice request for this order, if any. */
  taxInvoice: TaxInvoiceStatus | null;
}

type PaymentRow = { order_id: string; amount: number; status: PaymentRecord["status"]; created_at: string; plan: string | null; receipt_url: unknown; refunded_amount?: number };

/** The user's orders, newest first (RLS: own rows only). Receipt URL comes from Toss's stored payment object. */
export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];
  const base = "order_id, amount, status, created_at, plan, receipt_url:raw->receipt->>url";
  const query = (cols: string) => supabase.from("payments").select(cols).eq("user_id", user.id).order("created_at", { ascending: false }).limit(24);
  // refunded_amount and tax invoices arrive with migration 0025; read without them until then.
  const first = await query(`${base}, refunded_amount`);
  const { data } = first.error ? await query(base) : first;
  const { data: invoices } = await supabase.from("tax_invoice_requests").select("order_id, status").eq("user_id", user.id);
  const invoiceOf = new Map((invoices ?? []).map((i) => [i.order_id as string, i.status as TaxInvoiceStatus]));
  return ((data ?? []) as unknown as PaymentRow[]).map((r) => ({
    orderId: r.order_id,
    amount: r.amount,
    status: r.status,
    createdAt: r.created_at,
    receiptUrl: typeof r.receipt_url === "string" && /^https:\/\/([a-z0-9-]+\.)*tosspayments\.com\//.test(r.receipt_url) ? r.receipt_url : null,
    plan: r.plan ?? null,
    refundedAmount: r.refunded_amount ?? 0,
    taxInvoice: invoiceOf.get(r.order_id) ?? null,
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
  // A student row counts as free while the student plan is off (lib/site/access.ts).
  const active = row && !expired && (row.plan !== "student" || STUDENT_PLAN);
  const plan = (active ? row.plan : "free") as PlanId;
  const daysLeft = active && row?.expires_at ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86_400_000) : null;
  return { plan, expiresAt: row?.expires_at ?? null, daysLeft, studentRequest: (request?.status as Membership["studentRequest"]) ?? null };
}
