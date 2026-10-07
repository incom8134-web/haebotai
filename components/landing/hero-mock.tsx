"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, FolderKanban } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import { useBi } from "@/lib/i18n/context";
import type { Bilingual } from "@/lib/tools/content";
import { cn } from "@/lib/utils";

// The hero: one project moving through four tools. Each stage is a small,
// faithful sketch of that tool's real result screen, and what it settles
// lands in the project's memory on the left — which is what the next tool
// starts from. Example content, labelled as such.

const b = (ko: string, en: string): Bilingual => ({ ko, en });
const noop = () => () => {};

type Fact = { key: Bilingual; value: Bilingual };

const PALETTE = [
  { hex: "#F3EBDD", name: b("쌀 크림", "Rice cream") },
  { hex: "#8A5A2B", name: b("누룩", "Nuruk") },
  { hex: "#1F1B16", name: b("먹", "Ink") },
  { hex: "#5E8C7A", name: b("청자", "Celadon") },
  { hex: "#D9622B", name: b("홍시", "Persimmon") },
];

const STAGES: { tool: string; facts: Fact[] }[] = [
  {
    tool: "idea-radar",
    facts: [
      {
        key: b("제품", "Product"),
        value: b(
          "전통주 4종 미니 시음 키트",
          "Four-mini traditional liquor tasting kit",
        ),
      },
    ],
  },
  {
    tool: "offer-architect",
    facts: [
      {
        key: b("고객", "Customer"),
        value: b("선물을 고르는 20~30대", "Gift buyers in their 20s–30s"),
      },
      {
        key: b("가격", "Pricing"),
        value: b("29,000 · 45,000 · 69,000원", "₩29k · ₩45k · ₩69k"),
      },
    ],
  },
  {
    tool: "brand-dna",
    facts: [
      {
        key: b("브랜드 색", "Colours"),
        value: b(
          "쌀 크림 · 누룩 · 먹 · 청자 · 홍시",
          "Rice cream · Nuruk · Ink · Celadon · Persimmon",
        ),
      },
      {
        key: b("서체", "Type"),
        value: b("Gowun Batang / Pretendard", "Gowun Batang / Pretendard"),
      },
    ],
  },
  {
    tool: "hook-lab",
    facts: [
      {
        key: b("핵심 메시지", "Key message"),
        value: b(
          "뻔한 와인 대신, 취향을 선물하세요",
          "Skip the usual wine — gift a taste",
        ),
      },
    ],
  },
];

function Bar({
  label,
  score,
  on,
}: {
  label: string;
  score: number;
  on?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        on ? "border-accent/50 bg-accent-dim" : "border-hairline bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-fg">{label}</span>
        <span className="font-mono text-fg-muted">{score}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-fg/8">
        <motion.div
          className={cn(
            "h-full rounded-full",
            on ? "bg-accent" : "bg-fg-subtle/60",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function StageView({ index }: { index: number }) {
  const L = useBi();
  if (index === 0)
    return (
      <div className="space-y-2">
        <Bar
          label={L({
            ko: "전통주 미니 시음 키트",
            en: "Traditional liquor tasting kit",
          })}
          score={82}
          on
        />
        <Bar
          label={L({ ko: "양조장 투어 예약 대행", en: "Brewery tour booking" })}
          score={64}
        />
        <Bar
          label={L({
            ko: "막걸리 빚기 원데이 클래스",
            en: "Makgeolli one-day class",
          })}
          score={58}
        />
        <p className="pt-1 text-2xs text-fg-subtle">
          {L({
            ko: "적합도 · 시장 · 수익성 · 실행 난이도 · 위험",
            en: "Fit · market · margin · effort · risk",
          })}
        </p>
      </div>
    );
  if (index === 1)
    return (
      <div className="grid grid-cols-3 gap-2">
        {[
          [b("베이직", "Basic"), "29,000"],
          [b("쉐어링", "Sharing"), "45,000"],
          [b("프리미엄", "Premium"), "69,000"],
        ].map(([name, price], i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border p-2.5",
              i === 1
                ? "border-accent/50 bg-accent-dim"
                : "border-hairline bg-surface",
            )}
          >
            <p className="text-2xs text-fg-muted">{L(name as Bilingual)}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-fg">
              ₩{price as string}
            </p>
            <div className="mt-2 space-y-1">
              {Array.from({ length: 2 + i }).map((_, k) => (
                <div
                  key={k}
                  className="h-1 rounded-full bg-fg/10"
                  style={{ width: `${90 - k * 14}%` }}
                />
              ))}
            </div>
          </div>
        ))}
        <p className="col-span-3 rounded-lg bg-surface-2 px-2.5 py-1.5 text-2xs text-fg-muted">
          {L({
            ko: "보증 · 보너스 · 반론 대응 · CTA까지",
            en: "Guarantee, bonuses, objections and CTA too",
          })}
        </p>
      </div>
    );
  if (index === 2)
    return (
      <div>
        <div className="flex h-16 overflow-hidden rounded-xl border border-hairline">
          {PALETTE.map((c, i) => (
            <motion.div
              key={c.hex}
              className="flex flex-1 items-end p-1.5"
              style={{ background: c.hex }}
              initial={{ scaleY: 0.4, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
            >
              <span
                className={cn(
                  "font-mono text-[9px]",
                  i < 1 ? "text-black/60" : "text-white/80",
                )}
              >
                {c.hex}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-hairline bg-surface px-3 py-2">
          <span
            className="text-2xl font-semibold text-fg"
            style={{ fontFamily: "serif" }}
          >
            가 Aa
          </span>
          <span className="text-2xs leading-snug text-fg-muted">
            {L({
              ko: "제목 고운바탕 · 본문 프리텐다드 · 대비 4.5:1 이상",
              en: "Gowun Batang headings · Pretendard body · contrast 4.5:1+",
            })}
          </span>
        </div>
      </div>
    );
  return (
    <div className="space-y-2">
      {[
        [
          b("통념 뒤집기", "Flip a belief"),
          b(
            '"전통주는 아저씨 술"이라는 말, 이 키트 앞에선 안 통해요',
            '"Makgeolli is for uncles"? Not after this kit',
          ),
        ],
        [
          b("질문", "Question"),
          b(
            "집들이 선물, 올해도 와인 사실 건가요?",
            "Wine again for this housewarming?",
          ),
        ],
        [
          b("숫자", "Number"),
          b(
            "4병, 4가지 이야기, 단 하나의 취향",
            "4 bottles, 4 stories, one taste that's yours",
          ),
        ],
      ].map(([family, line], i) => (
        <motion.div
          key={i}
          className="rounded-xl border border-hairline bg-surface px-3 py-2"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12 }}
        >
          <p className="text-[10px] font-medium text-accent">
            {L(family as Bilingual)}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-fg">
            {L(line as Bilingual)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export function HeroMock() {
  const L = useBi();
  const reduce = useReducedMotion();
  // Always stage 0 on the server and first paint (the motion preference
  // isn't known there); with reduced motion, show the finished project.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [step, setStep] = useState(0);
  const stage = hydrated && reduce ? STAGES.length - 1 : step;
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STAGES.length), 3600);
    return () => clearTimeout(t);
  }, [step, paused, reduce]);

  const facts = STAGES.slice(0, stage + 1).flatMap((s) => s.facts);
  const tool = catalogTool(STAGES[stage].tool)!;
  const next =
    stage < STAGES.length - 1 ? STAGES[stage + 1].tool : "sales-page";

  return (
    <div
      // Sized for the tallest stage, so the page below never jumps as the
      // stages change.
      className="flex min-h-[584px] flex-col overflow-hidden rounded-[24px] border border-hairline bg-surface shadow-[0_30px_80px_-40px_rgba(15,30,60,0.45)] sm:min-h-[430px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-fg/12" />
          ))}
        </span>
        <span className="ml-2 flex items-center gap-1.5 text-xs font-medium text-fg">
          <FolderKanban size={13} className="text-accent" aria-hidden />{" "}
          {L({ ko: "전통주 시음 키트", en: "Tasting kit" })}
        </span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-fg-subtle">
          {L({ ko: "예시 화면", en: "Example" })}
        </span>
      </div>

      <div className="grid flex-1 sm:grid-cols-[0.85fr_1.15fr]">
        {/* Project memory */}
        <aside
          className="border-b border-hairline bg-bg/60 p-4 sm:border-r sm:border-b-0"
          aria-label={L({ ko: "프로젝트 메모리", en: "Project memory" })}
        >
          <p className="text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
            {L({ ko: "프로젝트가 기억하는 것", en: "What the project knows" })}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-1" aria-live="polite">
            <AnimatePresence initial={false}>
              {facts.map((f) => (
                <motion.li
                  key={f.key.en}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5"
                >
                  <span className="block text-[10px] text-fg-subtle">
                    {L(f.key)}
                  </span>
                  <span className="block truncate text-xs text-fg">
                    {L(f.value)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </aside>

        {/* Current tool */}
        <div className="flex min-h-[300px] flex-col p-4">
          <div
            role="tablist"
            aria-label={L({ ko: "도구 단계", en: "Tool steps" })}
            className="flex gap-1"
          >
            {STAGES.map((s, i) => (
              <button
                key={s.tool}
                type="button"
                role="tab"
                aria-selected={i === stage}
                aria-label={L(catalogTool(s.tool)!.name)}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= stage ? "bg-accent" : "bg-fg/10",
                )}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-accent-dim text-accent">
              <tool.icon size={15} aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">
                {L(tool.name)}
              </span>
              <span className="block text-[11px] text-fg-subtle">
                {L(tool.outputs[0])}
              </span>
            </span>
          </div>
          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <StageView index={stage} />
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-hairline-str px-2.5 py-1.5 text-[11px] text-fg-muted">
            {L({ ko: "이어서 만들기", en: "Continue in" })}{" "}
            <ArrowRight size={11} aria-hidden />{" "}
            <span className="font-medium text-fg">
              {L(catalogTool(next)!.name)}
            </span>
            <span className="ml-auto text-fg-subtle">
              {L({ ko: "입력칸 미리 채움", en: "fields pre-filled" })}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
