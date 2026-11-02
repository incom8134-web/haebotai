"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";
import { normalizeBusinessNo } from "@/lib/tax-invoice";

export type StudentRequestState = { ok: boolean; message: string } | null;

export async function requestStudentVerification(_prev: StudentRequestState, formData: FormData): Promise<StudentRequestState> {
  // The student plan granted unlimited platform credits; members now bring their own key (lib/site/access.ts).
  if (OWN_KEY_ONLY) return { ok: false, message: "closed" };
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const schoolEmail = String(formData.get("schoolEmail") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (schoolName.length < 2) return { ok: false, message: "school_required" };
  if (schoolEmail && !/^[^@\s]+@[^@\s]+\.(ac\.kr|edu|ac\.[a-z]{2}|edu\.[a-z]{2})$/i.test(schoolEmail))
    return { ok: false, message: "school_email_invalid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "signed_out" };

  const { data: pending } = await supabase
    .from("student_verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) return { ok: false, message: "already_pending" };

  const { error } = await supabase
    .from("student_verifications")
    .insert({ user_id: user.id, school_name: schoolName, school_email: schoolEmail || null, note: note || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/account/membership");
  return { ok: true, message: "submitted" };
}

export type TaxInvoiceState = { ok: boolean; message: string } | null;

/** A 세금계산서 request for one of the member's paid orders; staff issue it on 홈택스 (/admin/payments). */
export async function requestTaxInvoice(_prev: TaxInvoiceState, formData: FormData): Promise<TaxInvoiceState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "signed_out" };
  const rate = await checkRateLimit(paymentLimiter, user.id);
  if (!rate.ok) return { ok: false, message: "rate_limited" };
  const orderId = String(formData.get("orderId") ?? "");
  const businessNo = normalizeBusinessNo(formData.get("businessNo"));
  const company = String(formData.get("company") ?? "").trim().slice(0, 80);
  const ceo = String(formData.get("ceo") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, 120);
  if (!businessNo) return { ok: false, message: "business_no_invalid" };
  if (company.length < 2 || ceo.length < 2) return { ok: false, message: "company_required" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "email_invalid" };

  const admin = createAdminClient();
  const { data: order } = await admin.from("payments").select("order_id").eq("order_id", orderId).eq("user_id", user.id).eq("status", "done").maybeSingle();
  if (!order) return { ok: false, message: "order_missing" };
  const { error } = await admin.from("tax_invoice_requests").insert({ order_id: orderId, user_id: user.id, business_no: businessNo, company, ceo_name: ceo, email });
  if (error) return { ok: false, message: error.code === "23505" ? "already_requested" : "save_failed" };
  revalidatePath("/account/membership");
  return { ok: true, message: "invoice_requested" };
}
