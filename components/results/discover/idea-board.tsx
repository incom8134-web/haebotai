"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, FlaskConical, Star, Trophy } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { ARCHETYPE_LABELS, IDEA_AXES, readIdeas } from "@/lib/tools/report/idea-radar";
import { PALETTES } from "@/lib/tools/report/util";
import { Chart } from "@/components/results/report-view";
import { SectionTitle, useLocalSet } from "./shared";

// 아이디어 레이더 result: idea cards with five score bars, sortable by
// any axis, a favourites filter, a compare tray (radar + side-by-side
// table for up to three ideas) and "develop this idea" hand-offs that
// open the next tool pre-filled with the chosen idea (?pick=).

const AXIS_EN: Record<string, string> = { fit: "Fit", demand: "Demand", speed: "Speed", capital: "Low capital", edge: "Edge" };
const NEXT = [
  { slug: "revenue-mapper", ko: "수익 구조 짜기", en: "Map revenue" },
  { slug: "mvp-blueprint", ko: "MVP 설계", en: "Plan the MVP" },
  { slug: "market-gap", ko: "시장 빈틈 확인", en: "Check the market" },
  { slug: "offer-architect", ko: "오퍼 만들기", en: "Build the offer" },
];

type SortKey = "total" | (typeof IDEA_AXES)[number]["key"];

export function IdeaBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const ideas = useMemo(() => readIdeas(output).map((idea, index) => ({ ...idea, index })), [output]);
  const rec = (output.recommendation ?? {}) as { pick?: string; reason?: string; runner_up?: string };
  const [sort, setSort] = useState<SortKey>("total");
  const [onlyFav, setOnlyFav] = useState(false);
  const [compare, setCompare] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [favs, toggleFav] = useLocalSet(`haebot-idea-fav-${runId ?? "draft"}`);

  const axisIndex = (k: SortKey) => IDEA_AXES.findIndex((a) => a.key === k);
  const sorted = [...ideas]
    .filter((i) => !onlyFav || favs.has(String(i.index)))
    .sort((a, b) => (sort === "total" ? b.total - a.total : b.scores[axisIndex(sort)] - a.scores[axisIndex(sort)]));
  const compared = ideas.filter((i) => compare.includes(i.index));
  const axisLabel = (key: string, ko: string) => L({ ko, en: AXIS_EN[key] ?? ko });

  return (
    <div className="mt-3 flex flex-col gap-5">
      {output.summary ? <p className="text-sm leading-relaxed text-fg-muted break-keep">{String(output.summary)}</p> : null}

      {rec.pick ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
          <p className="flex items-center gap-1.5 text-2xs font-semibold text-accent">
            <Trophy className="size-3.5" aria-hidden /> {L({ ko: "먼저 해 볼 것", en: "Try this first" })}
          </p>
          <p className="mt-1 text-base font-bold text-fg break-keep">{rec.pick}</p>
          {rec.reason ? <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{rec.reason}</p> : null}
          {rec.runner_up ? (
            <p className="mt-1.5 text-xs text-fg-subtle">
              {L({ ko: "다음 후보", en: "Runner-up" })}: {rec.runner_up}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={L({ ko: "정렬", en: "Sort" })}>
        <span className="mr-1 text-2xs text-fg-subtle">{L({ ko: "정렬", en: "Sort" })}</span>
        {(["total", ...IDEA_AXES.map((a) => a.key)] as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={sort === k}
            onClick={() => setSort(k)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              sort === k ? "border-accent bg-accent text-white" : "border-hairline text-fg-muted hover:text-fg",
            )}
          >
            {k === "total" ? L({ ko: "총점", en: "Total" }) : axisLabel(k, IDEA_AXES[axisIndex(k)].label)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={onlyFav}
          onClick={() => setOnlyFav((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
            onlyFav ? "border-warn bg-warn/15 text-fg" : "border-hairline text-fg-muted",
          )}
        >
          <Star className="size-3" aria-hidden /> {L({ ko: "즐겨찾기만", en: "Favourites" })} {favs.size ? `(${favs.size})` : ""}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((idea) => {
          const fav = favs.has(String(idea.index));
          const inCompare = compare.includes(idea.index);
          const expanded = open === idea.index;
          return (
            <article key={idea.index} className={cn("flex flex-col rounded-2xl border bg-surface p-4", idea.name === rec.pick ? "border-accent/50" : "border-hairline")}>
              <header className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-2xs text-fg-subtle">
                    {ARCHETYPE_LABELS[idea.archetype] ?? idea.archetype} · {L({ ko: "총점", en: "Total" })} {idea.total}/50
                  </p>
                  <h4 className="mt-0.5 text-base leading-snug font-bold text-fg break-keep">{idea.name}</h4>
                  {idea.oneLiner ? <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{idea.oneLiner}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleFav(String(idea.index))}
                  aria-pressed={fav}
                  aria-label={L({ ko: "즐겨찾기", en: "Favourite" })}
                  className="rounded-md p-1 text-fg-subtle hover:text-fg"
                >
                  <Star className={cn("size-4", fav && "fill-warn text-warn")} aria-hidden />
                </button>
              </header>

              <dl className="mt-3 grid gap-1.5">
                {IDEA_AXES.map((a, i) => (
                  <div key={a.key} className="grid grid-cols-[4.5rem_1fr_1.5rem] items-center gap-2 text-xs">
                    <dt className="text-fg-subtle">{axisLabel(a.key, a.label)}</dt>
                    <dd className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${idea.scores[i] * 10}%`, opacity: sort === a.key ? 1 : 0.7 }} />
                    </dd>
                    <dd className="text-right font-medium tabular-nums text-fg">{idea.scores[i]}</dd>
                  </div>
                ))}
              </dl>

              {idea.test.action ? (
                <div className="mt-3 rounded-xl bg-ai-dim p-3 text-xs leading-relaxed">
                  <p className="flex items-center gap-1 font-semibold text-ai">
                    <FlaskConical className="size-3.5" aria-hidden /> {L({ ko: "첫 검증", en: "First test" })}
                    {idea.test.days ? ` · ${idea.test.days}${L({ ko: "일", en: " days" })}` : ""}
                  </p>
                  <p className="mt-1 text-fg break-keep">{idea.test.action}</p>
                  {idea.test.signal ? <p className="mt-1 text-fg-muted break-keep">{L({ ko: "성공 신호", en: "Signal" })}: {idea.test.signal}</p> : null}
                </div>
              ) : null}

              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : idea.index)}
                className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-fg-muted hover:text-fg"
              >
                {L({ ko: "자세히", en: "Details" })}
                <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
              </button>
              {expanded ? (
                <dl className="mt-2 grid gap-2 border-t border-hairline pt-3 text-xs leading-relaxed">
                  {[
                    [L({ ko: "고객", en: "Customer" }), [idea.who, idea.situation].filter(Boolean).join(" — ")],
                    [L({ ko: "문제", en: "Problem" }), idea.problem],
                    [L({ ko: "가치 제안", en: "Value" }), idea.value],
                    [L({ ko: "왜 당신인가", en: "Why you" }), idea.whyYou],
                    [L({ ko: "수익 방식", en: "Revenue" }), [idea.model, idea.price && `${idea.price} (${L({ ko: "추정", en: "est." })})`, idea.potential].filter(Boolean).join(" · ")],
                    ["MVP", idea.mvp],
                    [L({ ko: "갖춰야 할 것", en: "Resources" }), idea.resources.join(", ")],
                    [L({ ko: "위험", en: "Risks" }), idea.risks.join(" / ")],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-semibold text-fg">{k}</dt>
                        <dd className="text-fg-muted break-keep">{v}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
                <label className="mr-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
                  <input
                    type="checkbox"
                    checked={inCompare}
                    disabled={!inCompare && compare.length >= 3}
                    onChange={() => setCompare((c) => (inCompare ? c.filter((x) => x !== idea.index) : [...c, idea.index]))}
                    className="accent-[var(--color-accent)]"
                  />
                  {L({ ko: "비교", en: "Compare" })}
                </label>
                {runId
                  ? NEXT.map((n) => (
                      <Link
                        key={n.slug}
                        href={`/tools/${n.slug}/run?fromRun=${runId}&pick=${idea.index}`}
                        className="inline-flex items-center gap-0.5 rounded-md border border-hairline px-2 py-1 text-2xs text-fg-muted hover:border-accent hover:text-accent"
                      >
                        {L(n)} <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    ))
                  : null}
              </div>
            </article>
          );
        })}
        {sorted.length === 0 ? <p className="text-sm text-fg-subtle">{L({ ko: "즐겨찾기한 아이디어가 없어요.", en: "No favourites yet." })}</p> : null}
      </div>

      {compared.length >= 2 ? (
        <section className="rounded-2xl border border-hairline bg-surface p-4">
          <SectionTitle kicker={L({ ko: "비교", en: "Compare" })} title={L({ ko: `${compared.length}개 아이디어 나란히`, en: `${compared.length} ideas side by side` })} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Chart
              half
              palette={PALETTES["idea-radar"]}
              spec={{ kind: "radar", axes: IDEA_AXES.map((a) => axisLabel(a.key, a.label)), series: compared.map((i) => ({ name: i.name, values: i.scores })), max: 10 }}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-hairline text-left text-fg-subtle">
                    <th className="py-1.5 pr-2 font-normal" />
                    {compared.map((i) => (
                      <th key={i.index} className="py-1.5 pr-2 font-semibold text-fg">{i.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [L({ ko: "형태", en: "Type" }), (i: (typeof compared)[number]) => ARCHETYPE_LABELS[i.archetype] ?? i.archetype],
                    [L({ ko: "총점", en: "Total" }), (i: (typeof compared)[number]) => `${i.total}/50`],
                    [L({ ko: "가격(추정)", en: "Price (est.)" }), (i: (typeof compared)[number]) => i.price],
                    ["MVP", (i: (typeof compared)[number]) => i.mvp],
                    [L({ ko: "첫 검증", en: "First test" }), (i: (typeof compared)[number]) => i.test.action],
                  ].map(([label, get]) => (
                    <tr key={label as string} className="border-b border-hairline align-top last:border-0">
                      <th className="py-1.5 pr-2 text-left font-normal text-fg-subtle">{label as string}</th>
                      {compared.map((i) => (
                        <td key={i.index} className="py-1.5 pr-2 text-fg break-keep">{(get as (x: typeof i) => string)(i)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : compare.length === 1 ? (
        <p className="text-xs text-fg-subtle">{L({ ko: "비교할 아이디어를 하나 더 고르세요 (최대 3개).", en: "Pick one more idea to compare (up to 3)." })}</p>
      ) : null}

      <p className="text-2xs text-fg-subtle">{L({ ko: "점수는 입력한 조건과 검색 근거를 바탕으로 한 AI의 상대 평가이고, 가격은 모두 추정입니다.", en: "Scores are the AI's relative judgement from your inputs and research; prices are estimates." })}</p>
    </div>
  );
}
