"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpenText,
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
import { primaryButton, secondaryButton } from "@/components/site/page";
import { ApiKeyPrompt } from "@/components/api-key-prompt";
import { PlanPrompt } from "@/components/plan-prompt";
import { OutputLanguagePicker } from "@/components/output-language-picker";
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

/** Glass illustrations for the three main choices (made with Gemini, public/images/quick). */
const ART: Partial<Record<QuickId, string>> = {
  social: "/images/quick/social.webp",
  promo: "/images/quick/promo.webp",
  photo: "/images/quick/photo.webp",
};

/** A numbered step on the rail that joins steps 1–3. */
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span className={cn("absolute top-0 left-0 z-10 grid size-9 place-items-center rounded-full text-sm font-bold ring-4 ring-bg transition-colors duration-300", done ? "bg-accent text-white" : "border-2 border-accent bg-surface text-accent")} aria-hidden>
      {done ? <Check size={16} /> : n}
    </span>
  );
}

function minutes(tool: QuickTool) {
  const s = getTool(tool.engine)?.estimatedSeconds ?? 120;
  return Math.max(1, Math.round(s / 60));
}

export function QuickStart({ signedIn, needsKey = false, needsPlan = false, onOwnKey = false, plans = false }: { signedIn: boolean; needsKey?: boolean; needsPlan?: boolean; onOwnKey?: boolean; plans?: boolean }) {
  const L = useBi();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pick, setPick] = useState<QuickTool>(QUICK_MAIN[0]);
  const [text, setText] = useState("");
  const [going, setGoing] = useState(false);
  const [keyPrompt, setKeyPrompt] = useState(false);
  const [planPrompt, setPlanPrompt] = useState(false);
  const ready = text.trim().length >= 4;

  const go = () => {
    if (!ready || going) return;
    // Signed in without a key: say so here, before the tool page opens and can't run.
    if (needsKey) {
      setKeyPrompt(true);
      return;
    }
    // Signed in on Free: running needs a plan (lib/run-access.ts).
    if (needsPlan) {
      setPlanPrompt(true);
      return;
    }
    setGoing(true);
    router.push(quickHref(pick, text));
  };

  const short = (s: string) => (s.length > 22 ? `${s.slice(0, 22)}…` : s);

  return (
    <div className="mx-auto max-w-[1040px] px-4 pt-6 pb-16 md:px-8 md:pt-10">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="grid items-center gap-6 overflow-hidden rounded-[32px] border border-hairline bg-surface p-6 md:grid-cols-[1.25fr_1fr] md:p-10"
      >
        <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-semibold text-accent">
            <Sparkles size={13} aria-hidden /> {L({ ko: "바로 만들기", en: "Quick start" })}
          </p>
          {/* The illustrated manual, for owners who'd rather read first. */}
          <Link href="/help/user-guide" className={cn(secondaryButton, "h-10 px-4")}>
            <BookOpenText size={15} className="text-accent" aria-hidden /> {L({ ko: "사용 설명서 보기", en: "Read the user guide" })}
          </Link>
        </div>
        <h1 className="mt-4 max-w-2xl font-display text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.1] font-bold tracking-[-0.02em] break-keep text-fg">
          {L({ ko: "가게 홍보, 한 줄이면 시작돼요", en: "Shop marketing, started in one line" })}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "만들 것을 고르고, 가게 이야기를 적고, 만들기를 누르면 끝이에요. 어려운 설정은 저희가 대신 정해 둘게요.",
            en: "Pick what to make, write about your shop, press Make. We set the tricky options for you.",
          })}
        </p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#dfe6ee] max-md:hidden"
          aria-hidden
        >
          <Image src="/images/quick/hero.webp" alt="" fill priority sizes="(min-width: 768px) 400px, 0px" className="object-cover dark:brightness-[0.92]" />
        </motion.div>
      </motion.header>

      <div className="relative mt-10">
      {/* The rail joining the three steps. */}
      <span aria-hidden className="absolute top-4 bottom-4 left-[17px] w-0.5 rounded-full bg-[linear-gradient(to_bottom,var(--color-accent)_var(--rail,0%),var(--color-hairline-str)_var(--rail,0%))] transition-all duration-500" style={{ ["--rail" as string]: ready ? "100%" : "38%" }} />
      {/* 1 · What to make */}
      <section aria-labelledby="quick-what" className="relative pl-14">
        <StepBadge n={1} done />
        <h2 id="quick-what" className="flex min-h-9 items-center text-lg font-bold text-fg">
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
                  "group relative flex items-start gap-3 overflow-hidden rounded-[24px] border-2 bg-surface p-4 text-left transition-[border-color,box-shadow,translate] duration-300 sm:flex-col sm:gap-0 sm:p-0",
                  on ? "border-accent shadow-[0_22px_44px_-26px_var(--color-accent)]" : "border-hairline hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_22px_44px_-30px_oklch(0.3_0.04_60/45%)]",
                )}
              >
                {ART[t.id] ? (
                  <span className="relative hidden aspect-[4/3] w-full overflow-hidden bg-[#dfe6ee] sm:block" aria-hidden>
                    <Image src={ART[t.id]!} alt="" fill sizes="(min-width: 640px) 300px, 0px" className="object-cover transition-transform duration-500 group-hover:scale-[1.05] dark:brightness-[0.92]" />
                  </span>
                ) : null}
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition-colors sm:absolute sm:top-3 sm:left-3 sm:size-9 sm:rounded-xl", on ? "bg-accent text-white" : "bg-accent-dim text-accent sm:bg-surface")}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 sm:p-5 sm:pt-4">
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
      <section aria-labelledby="quick-text" className="relative mt-12 pl-14">
        <StepBadge n={2} done={ready} />
        <h2 className="flex min-h-9 items-center text-lg font-bold text-fg">
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
          className="mt-4 w-full resize-y rounded-[22px] border-2 border-hairline bg-surface px-5 py-4 text-base leading-relaxed text-fg shadow-[0_1px_2px_oklch(0.25_0.03_60/6%)] transition-[border-color,box-shadow] outline-none placeholder:text-fg-subtle focus:border-accent focus:shadow-[0_0_0_5px_color-mix(in_oklch,var(--color-accent)_14%,transparent)]"
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
      <section className="relative mt-12 pl-14">
        <StepBadge n={3} />
        <h2 className="flex min-h-9 items-center text-lg font-bold text-fg">
          {L({ ko: "만들기를 누르세요", en: "Press Make" })}
        </h2>
        <OutputLanguagePicker className="mt-4" />
        <button type="button" onClick={go} disabled={!ready || going} className={cn(primaryButton, "mt-4 h-14 w-full rounded-full text-base sm:w-auto sm:px-10", ready && !going && "quick-pulse")}>
          {going ? L({ ko: "여는 중…", en: "Opening…" }) : L({ ko: `${L(pick.title)} 만들기`, en: `Make ${L(pick.title).toLowerCase()}` })}
          <ArrowRight size={18} aria-hidden />
        </button>
        <p className="mt-3 text-sm leading-relaxed break-keep text-fg-muted">
          {L({ ko: `약 ${minutes(pick)}분 걸려요. `, en: `Takes about ${minutes(pick)} min. ` })}
          {signedIn
            ? onOwnKey
              ? L({ ko: "내 API 키로 실행되고, 결과는 보관함에 저장돼요.", en: "It runs on your API key and is saved to your Library." })
              : L({ ko: "플랜 크레딧으로 실행되고, 결과는 보관함에 저장돼요.", en: "It runs on your plan's credits and is saved to your Library." })
            : L({ ko: "누르면 Google 로그인 후 바로 이어서 만들어요.", en: "You'll sign in with Google, then it carries on." })}
        </p>
        {needsKey ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-studio-cyan/40 bg-studio-cyan/10 px-4 py-3 text-sm font-medium break-keep text-fg">
            <KeyRound size={15} className="shrink-0 text-studio-cyan" aria-hidden />
            {L({ ko: "아직 API 키가 없어요. 만들기 전에 먼저 등록해 주세요.", en: "You don't have an API key yet. Add one before you make anything." })}
            <Link href="/help/api-guide#video" className="font-semibold text-studio-cyan hover:underline">{L({ ko: "키 받는 방법 보기", en: "How to get a key" })}</Link>
          </p>
        ) : null}
        <ApiKeyPrompt open={keyPrompt} onOpenChange={setKeyPrompt} next={quickHref(pick, text)} plans={plans} />
        <PlanPrompt open={planPrompt} onOpenChange={setPlanPrompt} />
      </section>
      </div>

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
