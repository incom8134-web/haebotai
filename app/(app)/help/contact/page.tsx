import { HelpTitle } from "@/components/help/help-pages";
import { Ask } from "@/components/help/help-view";
import { listTickets, type TicketKind } from "@/lib/support";
import { getCurrentUser } from "@/lib/supabase/user";
import { ContactCard } from "@/components/help/contact-card";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("고객센터", "Support");

const KINDS: TicketKind[] = ["question", "bug", "billing", "feature", "remote"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string; tool?: string }> }) {
  const [{ kind, tool }, user, tickets] = await Promise.all([searchParams, getCurrentUser(), listTickets()]);
  return (
    <>
      <HelpTitle title={{ ko: "고객센터", en: "Customer service" }} lead={{ ko: "평일 10–18시에 사람이 직접 답해요. 원격 지원도 여기서 신청해요.", en: "A person answers weekdays 10–18 KST. Request remote help here too." }} />
      <ContactCard />
      <Ask signedIn={!!user} tickets={tickets} initialKind={KINDS.includes(kind as TicketKind) ? (kind as TicketKind) : "question"} toolId={tool} />
    </>
  );
}
