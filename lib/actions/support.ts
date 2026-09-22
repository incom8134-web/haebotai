"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TicketKind } from "@/lib/support";

export type TicketState = { ok: boolean; message: string } | null;

const KINDS: TicketKind[] = ["question", "bug", "billing", "feature", "remote"];

export async function createTicket(_prev: TicketState, formData: FormData): Promise<TicketState> {
  const kind = String(formData.get("kind") ?? "question") as TicketKind;
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 120);
  const preferredTime = String(formData.get("preferredTime") ?? "").trim().slice(0, 80);

  if (!KINDS.includes(kind)) return { ok: false, message: "bad_kind" };
  if (subject.length < 2 || subject.length > 120) return { ok: false, message: "subject_length" };
  if (body.length < 5 || body.length > 4000) return { ok: false, message: "body_length" };
  if (kind === "remote" && !preferredTime) return { ok: false, message: "time_required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "signed_out" };

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    kind,
    subject,
    body,
    contact: contact || user.email || null,
    preferred_time: preferredTime || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/help/contact");
  return { ok: true, message: "created" };
}
