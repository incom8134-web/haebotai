"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Clock, Plus, Search, Send } from "lucide-react";
import { createTicket, type TicketState } from "@/lib/actions/support";
import { FAQ, FAQ_CATEGORIES, type FaqCategory } from "@/lib/site/faq";
import { PATCH_NOTES, type NoteKind } from "@/lib/site/patch-notes";
import { getTool } from "@/lib/tools/registry";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { Ticket, TicketKind } from "@/lib/support";
import { Segmented, inputClass, primaryButton, textareaClass } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Help building blocks, each rendered on its own page under /help:
// FAQ (/help/faq), customer service (/help/contact), what's new
// (/help/whats-new).

const KIND_LABEL: Record<TicketKind, { ko: string; en: string }> = {
  question: { ko: "사용 문의", en: "Question" },
  bug: { ko: "오류", en: "Bug" },
  billing: { ko: "결제·멤버십", en: "Billing" },
  feature: { ko: "제안", en: "Idea" },
  remote: { ko: "원격 지원", en: "Remote help" },
};
const MESSAGES: Record<string, { ko: string; en: string }> = {
  created: { ko: "보냈어요. 답변이 오면 도움말 아이콘에 표시돼요.", en: "Sent. The Help icon lights up when we reply." },
  subject_length: { ko: "제목은 2~120자로 적어 주세요.", en: "Subject must be 2–120 characters." },
  body_length: { ko: "내용을 5자 이상 적어 주세요.", en: "Please write at least 5 characters." },
  time_required: { ko: "원격 지원은 가능한 시간을 적어 주세요.", en: "Remote help needs a time that works for you." },
  signed_out: { ko: "로그인 후 보낼 수 있어요.", en: "Sign in to send." },
};
const NOTE: Record<NoteKind, { label: { ko: string; en: string }; className: string }> = {
  new: { label: { ko: "새 기능", en: "New" }, className: "bg-studio-cyan/15 text-studio-cyan" },
  improved: { label: { ko: "개선", en: "Better" }, className: "bg-studio-violet/15 text-studio-violet" },
  fixed: { label: { ko: "수정", en: "Fixed" }, className: "bg-studio-success/15 text-studio-success" },
};

function Faq() {
  const L = useBi();
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = FAQ.filter((f) => (category === "all" || f.category === category) && (!q || [f.q.ko, f.q.en, f.a.ko, f.a.en].some((s) => s.toLowerCase().includes(q))));
  return (
    <div className="space-y-4">
      <label className="glass flex h-12 items-center gap-2.5 rounded-2xl px-4">
        <Search size={16} className="text-fg-subtle" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L({ ko: "무엇이 궁금하세요? (예: 크레딧, API 키)", en: "What do you want to know? (e.g. credits, API key)" })} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={L({ ko: "질문 검색", en: "Search questions" })} />
      </label>
      <Segmented label={L({ ko: "주제", en: "Topic" })} value={category} onChange={setCategory} options={[{ value: "all" as const, label: L({ ko: "전체", en: "All" }) }, ...(Object.keys(FAQ_CATEGORIES) as FaqCategory[]).map((c) => ({ value: c, label: L(FAQ_CATEGORIES[c]) }))]} />
      {visible.length ? (
        <div className="glass divide-y divide-hairline rounded-[24px]">
          {visible.map((f) => (
            <details key={f.q.en} className="smooth px-6 py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <span className="font-medium">{L(f.q)}</span>
                <Plus size={16} className="smooth-plus mt-1 shrink-0 text-fg-subtle" aria-hidden />
              </summary>
              <div className="smooth-body"><div><p className="pt-3 text-sm leading-relaxed text-fg-muted">{L(f.a)}</p></div></div>
            </details>
          ))}
        </div>
      ) : (
        <p className="glass rounded-[24px] p-8 text-center text-sm text-fg-muted">{L({ ko: "맞는 답이 없어요. 고객센터에서 직접 물어보세요.", en: "No match. Ask customer service directly." })}</p>
      )}
    </div>
  );
}

function Ask({ signedIn, tickets, initialKind, toolId }: { signedIn: boolean; tickets: Ticket[]; initialKind: TicketKind; toolId?: string }) {
  const L = useBi();
  const { locale } = useLocale();
  const [kind, setKind] = useState<TicketKind>(initialKind);
  const [state, action, pending] = useActionState<TicketState, FormData>(createTicket, null);
  const tool = toolId ? getTool(toolId) : undefined;
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section className="glass rounded-[24px] p-6">
        <h2 className="text-lg font-semibold">{L({ ko: "사람에게 물어보기", en: "Ask a person" })}</h2>
        <p className="mt-1 text-sm text-fg-muted">{L({ ko: "평일 10–18시, 보통 하루 안에 답해요. 원격 지원은 화면을 보며 함께 해결해요.", en: "Weekdays 10–18 KST, usually within a day. Remote help means we solve it together on screen." })}</p>
        {!signedIn ? (
          <div className="mt-6 rounded-2xl border border-dashed border-hairline-str p-6 text-center">
            <p className="text-sm text-fg-muted">{L({ ko: "문의는 로그인 후 보낼 수 있어요.", en: "Sign in to send a message." })}</p>
            <Link href="/auth?next=/help/contact" className={cn(primaryButton, "mt-4")}>{L({ ko: "로그인", en: "Sign in" })}</Link>
          </div>
        ) : (
          <form action={action} className="mt-5 space-y-4">
            <Segmented label={L({ ko: "문의 유형", en: "Type" })} value={kind} onChange={setKind} options={(Object.keys(KIND_LABEL) as TicketKind[]).map((k) => ({ value: k, label: L(KIND_LABEL[k]) }))} />
            <input type="hidden" name="kind" value={kind} />
            <input name="subject" required minLength={2} maxLength={120} defaultValue={tool ? `[${locale === "en" ? tool.name_en : tool.name_ko}] ` : ""} className={inputClass} placeholder={L({ ko: "한 줄 요약", en: "One-line summary" })} aria-label={L({ ko: "제목", en: "Subject" })} />
            <textarea
              name="body"
              required
              minLength={5}
              maxLength={4000}
              rows={5}
              className={textareaClass}
              aria-label={L({ ko: "내용", en: "Details" })}
              placeholder={kind === "bug" ? L({ ko: "어떤 도구에서, 무엇을 눌렀을 때, 어떤 화면이 나왔나요?", en: "Which tool, what you clicked, what you saw." }) : L({ ko: "자세할수록 빨리 해결돼요.", en: "More detail means a faster fix." })}
            />
            <AnimatePresence initial={false}>
              {kind === "remote" ? (
                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="block overflow-hidden">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Clock size={14} aria-hidden /> {L({ ko: "가능한 시간", en: "When works for you" })}</span>
                  <input name="preferredTime" required maxLength={80} className={inputClass} placeholder={L({ ko: "예: 평일 오후 2~5시", en: "e.g. weekdays 2–5pm" })} />
                </motion.label>
              ) : null}
            </AnimatePresence>
            {state ? <p role="status" className={cn("text-sm", state.ok ? "text-studio-success" : "text-danger")}>{L(MESSAGES[state.message] ?? { ko: state.message, en: state.message })}</p> : null}
            <button type="submit" disabled={pending} className={primaryButton}><Send size={14} aria-hidden /> {pending ? L({ ko: "보내는 중…", en: "Sending…" }) : L({ ko: "보내기", en: "Send" })}</button>
          </form>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">{L({ ko: "내 문의", en: "Your messages" })}</h2>
        {tickets.length === 0 ? (
          <p className="glass rounded-[24px] p-8 text-center text-sm text-fg-muted">{L({ ko: "아직 없어요.", en: "Nothing yet." })}</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <details key={t.id} className="smooth glass rounded-[20px] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{t.subject}</span>
                    <span className="font-mono text-2xs text-fg-subtle">{L(KIND_LABEL[t.kind])} · {fmt.format(new Date(t.createdAt))}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-semibold", t.status === "answered" ? "bg-studio-success/15 text-studio-success" : "bg-surface-2/70 text-fg-muted")}>
                    {t.status === "answered" ? L({ ko: "답변 도착", en: "Replied" }) : t.status === "closed" ? L({ ko: "종료", en: "Closed" }) : L({ ko: "확인 중", en: "Open" })}
                  </span>
                </summary>
                <div className="smooth-body"><div>
                  <p className="pt-3 text-sm whitespace-pre-wrap text-fg-muted">{t.body}</p>
                  {t.reply ? <p className="mt-3 rounded-xl bg-studio-cyan/10 p-3 text-sm whitespace-pre-wrap">{t.reply}</p> : null}
                </div></div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WhatsNew() {
  const L = useBi();
  return (
    <ol className="space-y-4">
      {PATCH_NOTES.map((note) => (
        <li key={note.version} className="glass rounded-[24px] p-6">
          <p className="font-mono text-2xs text-fg-subtle">v{note.version} · {note.date}</p>
          <h2 className="mt-1 text-lg font-semibold">{L(note.title)}</h2>
          <ul className="mt-3 space-y-2">
            {note.items.map((item) => (
              <li key={item.text.en} className="flex items-start gap-2.5 text-sm">
                <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", NOTE[item.kind].className)}>{L(NOTE[item.kind].label)}</span>
                <span className="text-fg-muted">{L(item.text)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export { Faq, Ask, WhatsNew };
