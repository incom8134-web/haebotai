"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarRange,
  ImagePlus,
  KeyRound,
  Check,
  Clapperboard,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { getTool } from "@/lib/tools/registry";
import { QUICK_MAIN, QUICK_MORE, quickHref, type QuickId, type QuickTool } from "@/lib/site/quick";
import { primaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// 바로 만들기: one page, three steps an owner who has never used AI can
// follow — pick what to make, write a line about the shop, press one
// button. The tool page then opens in simple mode and runs by itself
// (lib/site/quick.ts). Sign-in, when needed, happens on that click and
// comes back to the same request.

const ICONS: Record<QuickId, LucideIcon> = {
  social: MessageSquareText,
  promo: Megaphone,
  shortform: Clapperboard,
  blog: Newspaper,
  photo: ImagePlus,
  plan: CalendarRange,
  reviews: MessagesSquare,
};

function minutes(tool: QuickTool) {
  const s = getTool(tool.engine)?.estimatedSeconds ?? 120;
  return Math.max(1, Math.round(s / 60));
}

export function QuickStart({ signedIn }: { signedIn: boolean }) {
  const L = useBi();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pick, setPick] = useState<QuickTool>(QUICK_MAIN[0]);
  const [text, setText] = useState("");
  const [going, setGoing] = useState(false);
  const ready = text.trim().length >= 4;

  const go = () => {
    if (!ready || going) return;
    setGoing(true);
    router.push(quickHref(pick, text));
  };

  const short = (s: string) => (s.length > 22 ? `${s.slice(0, 22)}…` : s);

  return (
    <div className="mx-auto max-w-[920px] px-4 pt-6 pb-16 md:px-8 md:pt-12">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl"
      >
        <p className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles size={13} aria-hidden /> {L({ ko: "바로 만들기", en: "Quick start" })}
        </p>
        <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.1] font-bold tracking-[-0.02em] break-keep text-fg">
          {L({ ko: "가게 홍보, 한 줄이면 시작돼요", en: "Shop marketing, started in one line" })}
        </h1>
        <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "만들 것을 고르고, 가게 이야기를 적고, 만들기를 누르면 끝이에요. 어려운 설정은 저희가 대신 정해 둘게요.",
            en: "Pick what to make, write about your shop, press Make. We set the tricky options for you.",
          })}
        </p>
      </motion.header>

      {/* 1 · What to make */}
      <section aria-labelledby="quick-what" className="mt-9">
        <h2 id="quick-what" className="flex items-center gap-2 text-base font-bold text-fg">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-sm text-white">1</span>
          {L({ ko: "무엇을 만들까요?", en: "What should we make?" })}
        </h2>
        <div role="radiogroup" aria-labelledby="quick-what" className="mt-4 grid gap-3 sm:grid-cols-3">
          {QUICK_MAIN.map((t, i) => {
            const Icon = ICONS[t.id];
            const on = pick.id === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPick(t)}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 + i * 0.06 }}
                className={cn(
                  "relative flex items-start gap-3 rounded-[22px] border-2 bg-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-300 sm:flex-col sm:gap-0 sm:p-5",
                  on ? "border-accent shadow-[0_18px_40px_-28px_var(--color-accent)]" : "border-hairline hover:-translate-y-0.5 hover:border-accent/40",
                )}
              >
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition-colors", on ? "bg-accent text-white" : "bg-accent-dim text-accent")}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className="min-w-0 sm:mt-4">
                  <span className="block text-[15px] font-bold break-keep text-fg">{L(t.title)}</span>
                  <span className="mt-1 block text-sm leading-relaxed break-keep text-fg-muted">{L(t.gives)}</span>
                </span>
                {on ? (
                  <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-accent text-white">
                    <Check size={14} aria-hidden />
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>

        <p className="mt-5 text-sm font-semibold text-fg-muted">{L({ ko: "다른 홍보 도구", en: "More marketing tools" })}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_MORE.map((t) => {
            const Icon = ICONS[t.id];
            const on = pick.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPick(t)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium break-keep transition-colors",
                  on ? "border-accent bg-accent text-white" : "border-hairline bg-surface text-fg hover:border-accent/50",
                )}
              >
                <Icon size={15} aria-hidden /> {L(t.title)}
              </button>
            );
          })}
        </div>
        {QUICK_MORE.includes(pick) ? <p className="mt-2 text-sm break-keep text-fg-muted">{L(pick.gives)}</p> : null}
        {pick.note ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-1.5 text-xs break-keep text-fg-muted">
            <KeyRound size={13} className="shrink-0 text-accent" aria-hidden /> {L(pick.note)}
          </p>
        ) : null}
      </section>

      {/* 2 · About the shop */}
      <section aria-labelledby="quick-text" className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-bold text-fg">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-sm text-white">2</span>
          <label id="quick-text" htmlFor="quick-line">{L(pick.ask)}</label>
        </h2>
        <textarea
          id="quick-line"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") go();
          }}
          rows={4}
          maxLength={2000}
          placeholder={`${L({ ko: "예: ", en: "e.g. " })}${L(pick.examples[0])}`}
          className="mt-4 w-full resize-y rounded-[20px] border-2 border-hairline bg-surface px-4 py-3.5 text-base leading-relaxed text-fg transition-colors outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-subtle">{L({ ko: "예시로 채우기", en: "Fill with an example" })}</span>
          {pick.examples.map((e) => (
            <button
              key={e.ko}
              type="button"
              onClick={() => setText(L(e))}
              className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs break-keep text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
            >
              {short(L(e))}
            </button>
          ))}
        </div>
      </section>

      {/* 3 · Make */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-bold text-fg">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-sm text-white">3</span>
          {L({ ko: "만들기를 누르세요", en: "Press Make" })}
        </h2>
        <button type="button" onClick={go} disabled={!ready || going} className={cn(primaryButton, "mt-4 h-14 w-full text-base sm:w-auto sm:px-10")}>
          {going ? L({ ko: "여는 중…", en: "Opening…" }) : L({ ko: `${L(pick.title)} 만들기`, en: `Make ${L(pick.title).toLowerCase()}` })}
          <ArrowRight size={18} aria-hidden />
        </button>
        <p className="mt-3 text-sm leading-relaxed break-keep text-fg-muted">
          {L({ ko: `약 ${minutes(pick)}분 걸려요. `, en: `Takes about ${minutes(pick)} min. ` })}
          {signedIn
            ? L({ ko: "내 API 키로 실행되고, 결과는 보관함에 저장돼요.", en: "It runs on your API key and is saved to your Library." })
            : L({ ko: "누르면 Google 로그인 후 바로 이어서 만들어요.", en: "You'll sign in with Google, then it carries on." })}
        </p>
      </section>

      <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-6 text-sm">
        <Link href="/tools" className="font-medium text-accent hover:underline">
          {L({ ko: "모든 도구 보기", en: "See all tools" })}
        </Link>
        <Link href={signedIn ? "/studio" : "/"} className="text-fg-muted hover:text-fg">
          {signedIn ? L({ ko: "스튜디오로", en: "Go to Studio" }) : L({ ko: "처음으로", en: "Home" })}
        </Link>
      </div>
    </div>
  );
}
