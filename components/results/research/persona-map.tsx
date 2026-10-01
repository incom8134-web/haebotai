"use client";

import { useBi } from "@/lib/i18n/context";
import { objs, str, strs } from "@/lib/tools/report/util";
import { PALETTES } from "@/lib/tools/report/util";
import { Chart } from "@/components/results/report-view";
import { Kicker, SectionTitle } from "@/components/results/discover/shared";

// 고객 페르소나 지도 result: persona cards (in their own words, what they
// want, what frustrates them, what makes them buy and what holds them
// back, how much each decision factor weighs), then the journey from first
// hearing of you to recommending you, with the mood curve across stages
// and what to say at each one. The basis note says what came from data.

const STAGES: Record<string, { ko: string; en: string }> = {
  aware: { ko: "인지", en: "Aware" },
  consider: { ko: "고려", en: "Consider" },
  decide: { ko: "결정", en: "Decide" },
  use: { ko: "사용", en: "Use" },
  advocate: { ko: "추천", en: "Advocate" },
};

function List({ title, items, tone }: { title: string; items: string[]; tone?: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-2xs font-semibold ${tone ?? "text-fg-subtle"}`}>{title}</p>
      <ul className="mt-1 flex flex-col gap-0.5 text-xs text-fg">
        {items.map((x, i) => (
          <li key={i} className="break-keep">· {x}</li>
        ))}
      </ul>
    </div>
  );
}

export function PersonaMap({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const personas = objs(output.personas);
  const journey = objs(output.journey);
  const messaging = objs(output.messaging);

  return (
    <div className="mt-3 flex flex-col gap-6">
      {str(output.summary) ? <p className="text-sm leading-relaxed text-fg-muted break-keep">{str(output.summary)}</p> : null}

      <div className={`grid gap-3 ${personas.length > 1 ? "md:grid-cols-2" : ""}`}>
        {personas.map((p, i) => (
          <article key={i} className="rounded-2xl border border-hairline bg-surface p-4">
            <header className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-white" aria-hidden>
                {str(p.name).slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-fg break-keep">{str(p.name)}</p>
                <p className="text-xs text-fg-muted break-keep">
                  {str(p.age_range)} · {str(p.situation)}
                </p>
              </div>
            </header>
            {str(p.quote) ? <blockquote className="mt-3 border-l-4 border-accent pl-3 text-sm leading-relaxed font-medium text-fg break-keep">“{str(p.quote)}”</blockquote> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <List title={L({ ko: "원하는 것", en: "Goals" })} items={strs(p.goals)} tone="text-grounded" />
              <List title={L({ ko: "불편한 것", en: "Frustrations" })} items={strs(p.frustrations)} tone="text-danger" />
              <List title={L({ ko: "사게 되는 계기", en: "Triggers" })} items={strs(p.triggers)} tone="text-accent" />
              <List title={L({ ko: "망설이는 이유", en: "Objections" })} items={strs(p.objections)} />
            </div>
            {objs(p.decision_factors).length ? (
              <div className="mt-3">
                <p className="text-2xs font-semibold text-fg-subtle">{L({ ko: "결정할 때 보는 것", en: "Decision factors" })}</p>
                <dl className="mt-1 flex flex-col gap-1">
                  {objs(p.decision_factors).map((f, j) => (
                    <div key={j} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-2 text-xs">
                      <dt className="truncate text-fg">{str(f.factor)}</dt>
                      <dd className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={`${Number(f.weight) || 0}/5`}>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(5, Number(f.weight) || 0) * 20}%` }} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {strs(p.channels).length ? (
              <p className="mt-3 flex flex-wrap gap-1">
                {strs(p.channels).map((c) => (
                  <span key={c} className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs text-fg">{c}</span>
                ))}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {journey.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "여정", en: "Journey" })} title={L({ ko: "처음 알게 된 순간부터 추천하기까지", en: "From first hearing of you to recommending you" })} />
          <div className="rounded-2xl border border-hairline bg-surface p-3">
            <p className="text-2xs text-fg-subtle">{L({ ko: "기분 (−2 아주 나쁨 ~ +2 아주 좋음)", en: "Mood (−2 very bad to +2 very good)" })}</p>
            <Chart
              palette={PALETTES["persona-mapper"]}
              spec={{ kind: "line", categories: journey.map((j) => L(STAGES[str(j.stage)] ?? { ko: str(j.stage), en: str(j.stage) })), series: [{ name: L({ ko: "기분", en: "Mood" }), values: journey.map((j) => Math.max(-2, Math.min(2, Number(j.feeling) || 0))) }] }}
            />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-xs">
              <thead>
                <tr>
                  <th className="w-20" />
                  {journey.map((j, i) => (
                    <th key={i} className="p-2 text-left font-semibold text-accent">{L(STAGES[str(j.stage)] ?? { ko: str(j.stage), en: str(j.stage) })}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="align-top">
                {(
                  [
                    [L({ ko: "하는 일", en: "Doing" }), (j: Record<string, unknown>) => str(j.doing)],
                    [L({ ko: "생각", en: "Thinking" }), (j: Record<string, unknown>) => str(j.thinking)],
                    [L({ ko: "접점", en: "Touchpoints" }), (j: Record<string, unknown>) => strs(j.touchpoints).join(", ")],
                    [L({ ko: "기회", en: "Opportunity" }), (j: Record<string, unknown>) => str(j.opportunity)],
                    [L({ ko: "할 말", en: "Message" }), (j: Record<string, unknown>) => str(messaging.find((m) => str(m.stage) === str(j.stage))?.message)],
                  ] as const
                ).map(([label, get]) => (
                  <tr key={label} className="border-t border-hairline">
                    <th className="p-2 text-left font-normal text-fg-subtle">{label}</th>
                    {journey.map((j, i) => (
                      <td key={i} className="p-2 leading-relaxed text-fg break-keep">{get(j)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {str(output.data_basis) ? (
        <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-fg-muted break-keep">
          <Kicker>{L({ ko: "근거와 추론", en: "Evidence vs assumption" })}</Kicker>
          {str(output.data_basis)}
        </div>
      ) : null}
    </div>
  );
}
