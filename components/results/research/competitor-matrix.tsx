"use client";

import { Cited } from "@/components/results/cited";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { PALETTES } from "@/lib/tools/report/util";
import { Chart } from "@/components/results/report-view";
import { Kicker, SectionTitle } from "@/components/results/discover/shared";
import { Origin } from "./origin";

// 경쟁사 렌즈 result: the matrix (criteria × companies, 1–5, our column
// highlighted), the positioning map with us in the open space, each
// competitor's card with where its facts came from, and the openings.

const US = "우리";
const CELL = ["", "bg-danger/15", "bg-warn/15", "bg-surface-2", "bg-grounded-dim", "bg-grounded/25"];

export function CompetitorMatrix({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const axes = obj(output.axes);
  const us = obj(output.us);
  const comps = objs(output.competitors);
  const matrix = objs(output.matrix).map((m) => ({ criterion: str(m.criterion), scores: objs(m.scores).map((s) => ({ name: str(s.name), score: Math.max(0, Math.min(5, Math.round(Number(s.score) || 0))), note: str(s.note) })) }));
  const names = [...new Set(matrix.flatMap((m) => m.scores.map((s) => s.name)))].sort((a, b) => (a === US ? -1 : b === US ? 1 : 0));
  const total = (n: string) => matrix.reduce((a, m) => a + (m.scores.find((s) => s.name === n)?.score ?? 0), 0);

  return (
    <div className="mt-3 flex flex-col gap-6">
      {str(output.summary) ? <p className="text-sm leading-relaxed text-fg-muted break-keep"><Cited text={str(output.summary)} /></p> : null}

      {matrix.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "비교", en: "Compare" })} title={L({ ko: "고객이 고르는 기준으로", en: "On the criteria customers choose by" })} />
          <div className="overflow-x-auto rounded-2xl border border-hairline">
            <table className="w-full min-w-[34rem] text-xs">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="p-2 text-left font-normal text-fg-subtle">{L({ ko: "기준", en: "Criterion" })}</th>
                  {names.map((n) => (
                    <th key={n} className={cn("p-2 text-center font-semibold text-fg", n === US && "bg-accent-dim text-accent")}>{n === US ? L({ ko: "우리", en: "Us" }) : n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((m) => (
                  <tr key={m.criterion} className="border-b border-hairline last:border-0">
                    <th className="p-2 text-left font-medium text-fg break-keep">{m.criterion}</th>
                    {names.map((n) => {
                      const s = m.scores.find((x) => x.name === n);
                      return (
                        <td key={n} className={cn("p-1 text-center", n === US && "bg-accent-dim/50")} title={s?.note}>
                          <span className={cn("inline-block min-w-8 rounded-md px-1.5 py-1 font-semibold tabular-nums text-fg", CELL[s?.score ?? 0])}>{s ? s.score : "—"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-hairline-str">
                  <th className="p-2 text-left font-semibold text-fg">{L({ ko: "합계", en: "Total" })}</th>
                  {names.map((n) => (
                    <td key={n} className={cn("p-2 text-center font-bold tabular-nums text-fg", n === US && "bg-accent-dim/50 text-accent")}>{total(n)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-2xs text-fg-subtle">{L({ ko: "칸에 마우스를 올리면 점수 근거가 보여요. 점수는 AI의 비교 평가입니다.", en: "Hover a cell for the reason. Scores are the AI's comparative judgement." })}</p>
        </section>
      ) : null}

      {comps.length ? (
        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <Kicker>{L({ ko: "포지셔닝 맵", en: "Positioning map" })}</Kicker>
            <Chart
              half
              palette={PALETTES["competitor-lens"]}
              spec={{
                kind: "scatter",
                xLabel: str(axes.x),
                yLabel: str(axes.y),
                xMax: 10,
                yMax: 10,
                points: [
                  ...comps.map((c) => ({ label: str(c.name), x: Number(c.x) || 0, y: Number(c.y) || 0 })),
                  { label: L({ ko: "우리", en: "Us" }), x: Number(us.x) || 0, y: Number(us.y) || 0, highlight: true },
                ],
              }}
            />
            {str(us.position) ? <p className="mt-2 text-xs text-fg-muted break-keep">{str(us.position)}</p> : null}
          </div>
          <ul className="flex flex-col gap-2">
            {comps.map((c, i) => (
              <li key={i} className="rounded-xl border border-hairline p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-fg">{str(c.name)}</p>
                  <Origin origin={str(c.origin)} />
                  {str(c.price) ? <span className="ml-auto text-2xs text-fg-muted">{str(c.price)}</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-fg-muted break-keep"><Cited text={str(c.positioning)} /></p>
                <p className="mt-1 text-2xs text-grounded break-keep">+ {strs(c.strengths).join(" · ")}</p>
                <p className="text-2xs text-danger break-keep">− {strs(c.weaknesses).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {objs(output.opportunities).length ? (
        <section>
          <SectionTitle kicker={L({ ko: "기회", en: "Openings" })} title={L({ ko: "경쟁사가 비워 둔 자리", en: "What competitors leave open" })} />
          <div className="grid gap-3 md:grid-cols-2">
            {objs(output.opportunities).map((o, i) => (
              <article key={i} className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
                <p className="text-base font-bold text-fg break-keep">{str(o.title)}</p>
                <p className="mt-1.5 text-xs text-fg break-keep"><b className="font-semibold">{L({ ko: "빈자리", en: "Gap" })}</b> <Cited text={str(o.gap)} /></p>
                <p className="mt-1 text-xs text-fg break-keep"><b className="font-semibold">{L({ ko: "할 일", en: "Move" })}</b> {str(o.move)}</p>
                {str(o.risk) ? <p className="mt-1 text-2xs text-fg-muted break-keep">{L({ ko: "위험", en: "Risk" })}: {str(o.risk)}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
