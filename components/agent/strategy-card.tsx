"use client";

import { useState } from "react";
import { ChevronDown, Compass, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBi } from "@/lib/i18n/context";

// How a result was made (output.agent, lib/agents/meta.ts): the request as
// understood, the strategy chosen with the alternatives it was weighed
// against (one honestly named as the obvious default), the workflow
// planned for it, the assumptions made instead of asking, and the review
// rounds.
// "다른 전략으로" re-runs the same inputs asking for a different approach.

export interface AgentMeta {
  summary?: string;
  strategy?: {
    chosen: string;
    rationale: string;
    considered: { name: string; summary: string; fit: number; why: string; isDefault?: boolean }[];
    blueprint: string[];
    direction?: string;
    /** Why the obvious default won, when it did. */
    defaultReason?: string;
  } | null;
  /** The workflow the planner chose for this request. */
  plan?: { steps: { ko: string; en: string }; reason: string } | null;
  assumptions?: string[];
  answers?: { question: string; answer: string }[];
  review?: { rounds: number; scores: number[]; fixed: number } | null;
}

export function StrategyCard({ meta, onRerun }: { meta: AgentMeta; onRerun?: (chosen: string) => void }) {
  const L = useBi();
  const [open, setOpen] = useState(false);
  const s = meta.strategy;
  if (!s && !meta.summary) return null;
  const others = s ? s.considered.filter((c) => c.name !== s.chosen) : [];
  const chosen = s?.considered.find((c) => c.name === s.chosen);
  const scores = meta.review?.scores ?? [];

  return (
    <section aria-label={L({ ko: "이번 결과의 전략", en: "How this was made" })} className="mt-3 rounded-2xl border border-hairline bg-surface-2/40 p-3.5">
      <div className="flex items-start gap-2.5">
        <Compass size={16} className="mt-0.5 shrink-0 text-studio-violet" aria-hidden />
        <div className="min-w-0 flex-1">
          {meta.summary ? <p className="text-xs break-keep text-fg-muted">{meta.summary}</p> : null}
          {s ? (
            <>
              <p className="mt-1 text-sm font-semibold break-keep">
                {L({ ko: "전략", en: "Strategy" })} · {s.chosen}
                {s.direction ? <span className="font-normal text-fg-muted"> — {s.direction}</span> : null}
              </p>
              {s.rationale ? <p className="mt-1 text-xs leading-relaxed break-keep text-fg-muted">{s.rationale}</p> : null}
            </>
          ) : null}
          {meta.plan ? (
            <p className="mt-1.5 text-2xs break-keep text-fg-subtle">
              {L({ ko: "작업 순서", en: "Workflow" })}: {L(meta.plan.steps)}
              {meta.plan.reason ? <span> — {meta.plan.reason}</span> : null}
            </p>
          ) : null}
          {scores.length ? (
            <p className="mt-1.5 font-mono text-2xs text-fg-subtle">
              {L({
                ko: `검토 ${meta.review!.rounds}회 · 점수 ${scores.join(" → ")}${meta.review!.fixed ? ` · 고친 점 ${meta.review!.fixed}개` : ""}`,
                en: `${meta.review!.rounds} review round(s) · score ${scores.join(" → ")}${meta.review!.fixed ? ` · ${meta.review!.fixed} fixes` : ""}`,
              })}
            </p>
          ) : null}
        </div>
      </div>

      {s || meta.assumptions?.length ? (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-2 flex items-center gap-1 text-2xs text-fg-subtle hover:text-fg">
          {L({ ko: "비교한 전략과 가정 보기", en: "Alternatives and assumptions" })}
          <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden />
        </button>
      ) : null}

      {open ? (
        <div className="mt-2 space-y-3 text-xs break-keep">
          {s ? (
            <ul className="space-y-1.5">
              {[...(chosen ? [chosen] : []), ...others].map((c) => (
                <li key={c.name} className={c.name === s.chosen ? "rounded-lg bg-studio-violet/10 px-2.5 py-1.5" : "px-2.5 py-1.5"}>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-1.5 font-mono text-2xs text-fg-subtle">{L({ ko: `적합도 ${c.fit}/10`, en: `fit ${c.fit}/10` })}</span>
                  {c.name === s.chosen ? <span className="ml-1.5 text-2xs text-studio-violet">{L({ ko: "선택", en: "chosen" })}</span> : null}
                  {c.isDefault ? (
                    <span className="ml-1.5 rounded-full border border-hairline px-1.5 py-px text-2xs text-fg-subtle">{L({ ko: "뻔한 기본안", en: "the obvious default" })}</span>
                  ) : null}
                  <p className="mt-0.5 text-fg-muted">{c.summary}</p>
                  {c.why ? <p className="mt-0.5 text-fg-subtle">{c.why}</p> : null}
                  {c.isDefault && c.name === s.chosen && s.defaultReason ? <p className="mt-0.5 text-fg-subtle">{L({ ko: "기본안을 고른 이유", en: "Why the default" })}: {s.defaultReason}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {s?.blueprint.length ? (
            <p className="text-fg-muted">
              <span className="text-fg-subtle">{L({ ko: "구성", en: "Structure" })}: </span>
              {s.blueprint.join(" → ")}
            </p>
          ) : null}
          {meta.answers?.length ? (
            <ul className="text-fg-muted">
              {meta.answers.map((a) => (
                <li key={a.question}>
                  <span className="text-fg-subtle">{a.question}</span> → {a.answer}
                </li>
              ))}
            </ul>
          ) : null}
          {meta.assumptions?.length ? (
            <div>
              <p className="text-fg-subtle">{L({ ko: "요청에 없어 이렇게 가정했어요", en: "Assumed (not in your request)" })}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-muted">
                {meta.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {s && onRerun && others.length ? (
        <Button variant="secondary" size="sm" onClick={() => onRerun(s.chosen)} className="mt-3 h-8 rounded-xl px-3 text-xs">
          <RotateCcw className="size-3.5" aria-hidden /> {L({ ko: "다른 전략으로 다시 만들기", en: "Try a different strategy" })}
        </Button>
      ) : null}
    </section>
  );
}
