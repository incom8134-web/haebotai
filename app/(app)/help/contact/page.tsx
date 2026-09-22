import { HelpTitle } from "@/components/help/help-pages";
import { Ask } from "@/components/help/help-view";
import { listTickets, type TicketKind } from "@/lib/support";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "고객센터 — 해봇 AI" };

const KINDS: TicketKind[] = ["question", "bug", "billing", "feature", "remote"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string; tool?: string }> }) {
  const supabase = await createClient();
  const [{ kind, tool }, { data: { user } }, tickets] = await Promise.all([searchParams, supabase.auth.getUser(), listTickets()]);
  return (
    <>
      <HelpTitle title={{ ko: "고객센터", en: "Customer service" }} lead={{ ko: "평일 10–18시에 사람이 직접 답해요. 원격 지원도 여기서 신청해요.", en: "A person answers weekdays 10–18 KST. Request remote help here too." }} />
      <Ask signedIn={!!user} tickets={tickets} initialKind={KINDS.includes(kind as TicketKind) ? (kind as TicketKind) : "question"} toolId={tool} />
    </>
  );
}
