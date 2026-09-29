import { HelpTitle } from "@/components/help/help-pages";
import { Ask } from "@/components/help/help-view";
import { listTickets, type TicketKind } from "@/lib/support";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/site/business";

export const metadata = { title: "고객센터 — 해봇 AI" };

const KINDS: TicketKind[] = ["question", "bug", "billing", "feature", "remote"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string; tool?: string }> }) {
  const supabase = await createClient();
  const [{ kind, tool }, { data: { user } }, tickets] = await Promise.all([searchParams, supabase.auth.getUser(), listTickets()]);
  return (
    <>
      <HelpTitle title={{ ko: "고객센터", en: "Customer service" }} lead={{ ko: "평일 10–18시에 사람이 직접 답해요. 원격 지원도 여기서 신청해요.", en: "A person answers weekdays 10–18 KST. Request remote help here too." }} />
      {BUSINESS.phone || BUSINESS.email ? (
        <section className="glass mb-6 grid gap-3 rounded-[24px] p-5 sm:grid-cols-3" aria-label="연락처">
          {BUSINESS.phone ? (
            <a href={`tel:${BUSINESS.phone.replace(/[^0-9]/g, "")}`} className="rounded-2xl border border-hairline p-4 hover:border-hairline-str">
              <p className="text-2xs text-fg-subtle">전화 (평일 10–18시)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{BUSINESS.phone}</p>
            </a>
          ) : null}
          {BUSINESS.email ? (
            <a href={`mailto:${BUSINESS.email}`} className="rounded-2xl border border-hairline p-4 hover:border-hairline-str">
              <p className="text-2xs text-fg-subtle">이메일</p>
              <p className="mt-1 text-lg font-semibold break-all">{BUSINESS.email}</p>
            </a>
          ) : null}
          <div className="rounded-2xl border border-hairline p-4">
            <p className="text-2xs text-fg-subtle">운영</p>
            <p className="mt-1 text-sm font-medium break-keep">{BUSINESS.companyName || "해봇 AI"}</p>
            <p className="text-2xs break-keep text-fg-muted">{BUSINESS.address}</p>
          </div>
        </section>
      ) : null}
      <Ask signedIn={!!user} tickets={tickets} initialKind={KINDS.includes(kind as TicketKind) ? (kind as TicketKind) : "question"} toolId={tool} />
    </>
  );
}
