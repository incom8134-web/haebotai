import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TicketKind = "question" | "bug" | "billing" | "feature" | "remote";

export interface Ticket {
  id: string;
  kind: TicketKind;
  subject: string;
  body: string;
  status: "open" | "answered" | "closed";
  reply: string | null;
  preferredTime: string | null;
  createdAt: string;
}

export async function listTickets(): Promise<Ticket[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("support_tickets")
    .select("id, kind, subject, body, status, reply, preferred_time, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((t) => ({
    id: t.id,
    kind: t.kind,
    subject: t.subject,
    body: t.body,
    status: t.status,
    reply: t.reply,
    preferredTime: t.preferred_time,
    createdAt: t.created_at,
  }));
}
