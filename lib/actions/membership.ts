"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StudentRequestState = { ok: boolean; message: string } | null;

export async function requestStudentVerification(_prev: StudentRequestState, formData: FormData): Promise<StudentRequestState> {
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
