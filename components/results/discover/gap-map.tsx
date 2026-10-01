"use client";

import { Cited } from "@/components/results/cited";
import { useMemo, useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { CONFIDENCE_LABELS, ORIGIN_LABELS, readGapMap, SOLUTION_KINDS } from "@/lib/tools/report/market-gap";
import { objs, sourcesOf, str } from "@/lib/tools/report/util";
import { SectionTitle } from "./shared";

// 시장 빈틈 탐지기 result: a needs × solutions heatmap where empty cells
// are the gaps (tap a gap card to light up its needs), every need and gap
// labelled with where it came from — search, the member's input, or a
// hypothesis — then the validation questions and sources.

const CELL = ["bg-danger/15 text-danger", "bg-warn/20 text-fg", "bg-grounded-dim text-grounded"];
const ORIGIN_STYLE: Record<string, string> = {
  search: "border-grounded/40 text-grounded",
  user: "border-ai/40 text-ai",
  hypothesis: "border-dashed border-hairline-str text-fg-subtle",
};

function Origin({ origin }: { origin: string }) {
  return <span className={cn("inline-block rounded-full border px-1.5 py-px text-[10px] leading-4", ORIGIN_STYLE[origin] ?? "border-hairline")}>{ORIGIN_LABELS[origin] ?? origin}</span>;
}

export function GapMap({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const { needs, solutions, gaps } = useMemo(() => readGapMap(output), [output]);
  const [active, setActive] = useState<number | null>(null);
  const lit = active === null ? null : new Set(gaps[active]?.needIds ?? []);
  const questions = objs(output.validation_questions);
  const sources = sourcesOf(output.sources);
  const levelLabel = [L({ ko: "못 풂", en: "Unserved" }), L({ ko: "일부", en: "Partly" }), L({ ko: "잘 풂", en: "Served" })];

  return (
    <div className="mt-3 flex flex-col gap-6">
      {output.market_summary ? <p className="text-sm leading-relaxed text-fg-muted break-keep"><Cited text={String(output.market_summary)} /></p> : null}

      <section>
        <SectionTitle kicker={L({ ko: "지도", en: "Map" })} title={L({ ko: "니즈 × 기존 해결책", en: "Needs × existing solutions" })} lead={L({ ko: "빨간 칸이 아무도 제대로 풀지 못하는 자리예요.", en: "Red cells are needs nobody serves well." })} />
        <div className="overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full min-w-[36rem] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 bg-surface p-2 text-left font-normal text-fg-subtle">{L({ ko: "해결책 \\ 니즈", en: "Solution \\ need" })}</th>
                {needs.map((n) => (
                  <th key={n.id} scope="col" className={cn("min-w-28 p-2 text-left align-bottom font-normal transition-opacity", lit && !lit.has(n.id) && "opacity-40")}>
                    <span className="block font-semibold text-fg break-keep">{n.need}</span>
                    <span className="mt-1 flex items-center gap-1">
                      <span className="text-accent" aria-label={`${L({ ko: "강도", en: "Intensity" })} ${n.intensity}/5`}>{"●".repeat(Math.round(n.intensity))}<span className="text-hairline-str">{"●".repeat(5 - Math.round(n.intensity))}</span></span>
                      <Origin origin={n.origin} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solutions.map((s) => (
                <tr key={s.name} className="border-t border-hairline">
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-2 text-left font-normal">
                    <span className="block font-semibold text-fg break-keep">{s.name}</span>
                    <span className="text-2xs text-fg-subtle">{SOLUTION_KINDS[s.kind] ?? s.kind}</span>
                  </th>
                  {s.levels.map((lv, j) => (
                    <td key={j} className="p-1">
                      <span
                        className={cn(
                          "grid h-10 place-items-center rounded-lg text-2xs font-medium transition-opacity",
                          CELL[lv] ?? CELL[0],
                          lit && !lit.has(needs[j].id) && "opacity-30",
                          lit?.has(needs[j].id) && lv === 0 && "ring-2 ring-danger",
                        )}
                      >
                        {levelLabel[lv]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-2 text-xs text-fg-muted">
          <summary className="cursor-pointer text-fg-subtle">{L({ ko: "니즈별 근거 보기", en: "Evidence per need" })}</summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {needs.map((n) => (
              <li key={n.id} className="break-keep">
                <span className="font-semibold text-fg">{n.need}</span> ({n.who}) — {n.evidence} <Origin origin={n.origin} />
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section>
        <SectionTitle kicker={L({ ko: "빈틈", en: "Gaps" })} title={L({ ko: "비어 있는 자리", en: "Where the openings are" })} lead={L({ ko: "카드를 누르면 지도에서 관련 니즈가 표시돼요.", en: "Tap a card to highlight its needs on the map." })} />
        <div className="grid gap-3 md:grid-cols-2">
          {gaps.map((g, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(active === i ? null : i)}
              className={cn("rounded-2xl border p-4 text-left transition-colors", active === i ? "border-accent bg-accent-dim" : "border-hairline bg-surface hover:border-hairline-str")}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs text-fg-subtle">
                  {L({ ko: "신뢰도", en: "Confidence" })} {CONFIDENCE_LABELS[g.confidence] ?? g.confidence}
                </span>
                <Origin origin={g.origin} />
              </span>
              <span className="mt-1 block text-base font-bold text-fg break-keep">{g.title}</span>
              <span className="mt-2 block text-xs leading-relaxed text-fg-muted break-keep">
                <b className="font-semibold text-fg">{L({ ko: "왜 비어 있나", en: "Why unserved" })}</b> {g.why}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-fg-muted break-keep">
                <b className="font-semibold text-fg">{L({ ko: "기회", en: "Opportunity" })}</b> {g.opportunity}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-fg-muted break-keep">
                <b className="font-semibold text-fg">{L({ ko: "차별화", en: "Differentiation" })}</b> {g.diff}
              </span>
            </button>
          ))}
        </div>
      </section>

      {questions.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "검증", en: "Validate" })} title={L({ ko: "진짜 빈틈인지 확인할 질문", en: "Questions that prove the gap" })} />
          <ol className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <li key={i} className="rounded-xl border border-hairline p-3 text-sm">
                <p className="font-medium text-fg break-keep">{i + 1}. {str(q.question)}</p>
                <p className="mt-1 text-xs text-fg-muted break-keep">
                  {L({ ko: "누구에게", en: "Ask" })}: {str(q.ask_whom)} · {L({ ko: "신호", en: "Signal" })}: {str(q.signal)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="text-2xs text-fg-subtle">
        {sources.length
          ? L({ ko: "'검색 근거' 표시는 아래 출처 목록의 자료에서 확인한 내용입니다. 나머지는 입력 내용이나 가설이에요.", en: "\"Search evidence\" items come from the sources listed below; the rest is your input or hypotheses." })
          : L({ ko: "이번 결과에는 검색 출처가 없어 모든 항목을 가설로 보세요.", en: "No search sources this time — treat every finding as a hypothesis." })}
      </p>
    </div>
  );
}
