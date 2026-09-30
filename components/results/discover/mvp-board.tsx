"use client";

import { useMemo } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { CHECK_LABELS, MOMENT_LABELS, readMvp } from "@/lib/tools/report/mvp-blueprint";
import { obj, str, strs } from "@/lib/tools/report/util";
import { SectionTitle, useLocalSet } from "./shared";

// MVP 설계도 result: a board — Must / Should / Later columns, the user
// journey as a strip, the tool stack, stages on a week timeline and a
// launch checklist the member can tick off (kept in this browser).

const COLUMNS = [
  { key: "must", ko: "Must · 꼭 필요", en: "Must", tone: "border-t-accent" },
  { key: "should", ko: "Should · 있으면 좋음", en: "Should", tone: "border-t-ai" },
  { key: "later", ko: "Later · 다음 버전", en: "Later", tone: "border-t-hairline-str" },
];
const MOMENT_EN: Record<string, string> = { discover: "Discover", try: "Try", value: "Value", pay: "Pay", return: "Return" };

export function MvpBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const { features, journey, stack, stages, totalWeeks, checklist } = useMemo(() => readMvp(output), [output]);
  const v = obj(output.validation);
  const [done, toggle] = useLocalSet(`haebot-mvp-check-${runId ?? "draft"}`);

  return (
    <div className="mt-3 flex flex-col gap-6">
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-lg font-bold text-fg break-keep">{str(output.product_one_liner)}</p>
        <p className="mt-1 text-sm text-fg-muted break-keep">
          <b className="font-semibold text-fg">{L({ ko: "핵심 일", en: "Core job" })}</b> {str(output.core_job)}
          {str(output.target_user) ? <> · {str(output.target_user)}</> : null}
        </p>
      </div>

      <section>
        <SectionTitle kicker={L({ ko: "범위", en: "Scope" })} title={L({ ko: "무엇을 넣고 무엇을 뺄까", en: "What goes in, what waits" })} />
        <div className="grid gap-3 md:grid-cols-3">
          {COLUMNS.map((c) => {
            const items = features.filter((f) => f.priority === c.key);
            return (
              <div key={c.key} className={cn("rounded-2xl border border-t-4 border-hairline bg-surface-2/50 p-3", c.tone)}>
                <p className="text-xs font-semibold text-fg">
                  {L(c)} <span className="font-normal text-fg-subtle">({items.length})</span>
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {items.map((f, i) => (
                    <li key={i} className="rounded-xl border border-hairline bg-surface p-2.5">
                      <p className="flex items-start gap-2 text-sm font-semibold text-fg break-keep">
                        <span className="flex-1">{f.name}</span>
                        <span className="rounded bg-surface-2 px-1.5 text-2xs font-medium text-fg-muted" title={L({ ko: "노력", en: "Effort" })}>
                          {f.effort}
                        </span>
                      </p>
                      {f.description ? <p className="mt-0.5 text-xs text-fg-muted break-keep">{f.description}</p> : null}
                      {f.reason ? <p className="mt-1 text-2xs text-fg-subtle break-keep">{f.reason}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {strs(output.out_of_scope).length ? (
          <p className="mt-2 text-xs text-fg-subtle break-keep">
            {L({ ko: "이번에 뺀 것", en: "Left out" })}: {strs(output.out_of_scope).join(" · ")}
          </p>
        ) : null}
      </section>

      {journey.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "여정", en: "Journey" })} title={L({ ko: "사용자가 겪는 순서", en: "What the user goes through" })} />
          <ol className="flex gap-2 overflow-x-auto pb-1">
            {journey.map((j, i) => (
              <li key={i} className="relative min-w-44 flex-1 rounded-2xl border border-hairline bg-surface p-3">
                <p className="text-2xs font-semibold text-accent">
                  {i + 1}. {L({ ko: MOMENT_LABELS[j.moment] ?? j.moment, en: MOMENT_EN[j.moment] ?? j.moment })}
                </p>
                <p className="mt-1 text-sm text-fg break-keep">{j.user}</p>
                <p className="mt-1 text-xs text-fg-muted break-keep">→ {j.product}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {stack.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "도구", en: "Stack" })} title={L({ ko: "무엇으로 만들까", en: "What to build it with" })} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-xs">
              <thead>
                <tr className="border-b border-hairline text-left text-fg-subtle">
                  {[L({ ko: "층", en: "Layer" }), L({ ko: "선택", en: "Choice" }), L({ ko: "이유", en: "Why" }), L({ ko: "대안", en: "Alternative" }), L({ ko: "비용(추정)", en: "Cost (est.)" })].map((h) => (
                    <th key={h} className="py-1.5 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stack.map((s, i) => (
                  <tr key={i} className="border-b border-hairline align-top last:border-0">
                    <td className="py-2 pr-3 text-fg-subtle">{s.layer}</td>
                    <td className="py-2 pr-3 font-semibold text-fg">{s.choice}</td>
                    <td className="py-2 pr-3 text-fg-muted break-keep">{s.why}</td>
                    <td className="py-2 pr-3 text-fg-muted">{s.alternative}</td>
                    <td className="py-2 pr-3 text-fg-muted">{s.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {stages.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "단계", en: "Stages" })} title={L({ ko: `출시까지 ${totalWeeks}주`, en: `${totalWeeks} weeks to launch` })} />
          <div className="flex flex-col gap-2">
            {stages.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
                <div>
                  <p className="text-sm font-semibold text-fg break-keep">{s.name}</p>
                  <p className="text-2xs text-fg-subtle">
                    {s.start + 1}–{s.end}
                    {L({ ko: "주", en: " wk" })}
                  </p>
                </div>
                <div>
                  <div className="relative h-2 rounded-full bg-surface-2" aria-hidden>
                    <span
                      className="absolute inset-y-0 rounded-full bg-accent"
                      style={{ left: `${totalWeeks ? (s.start / totalWeeks) * 100 : 0}%`, width: `${totalWeeks ? (s.weeks / totalWeeks) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-fg break-keep">{s.goal}</p>
                  {s.deliverables.length ? <p className="mt-0.5 text-2xs text-fg-muted break-keep">{s.deliverables.join(" · ")}</p> : null}
                  {s.exit ? (
                    <p className="mt-0.5 text-2xs text-fg-subtle break-keep">
                      {L({ ko: "넘어가는 기준", en: "Exit" })}: {s.exit}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {str(v.hypothesis) ? (
          <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
            <p className="text-2xs font-semibold text-accent">{L({ ko: "첫 버전이 증명할 것", en: "What v1 must prove" })}</p>
            <p className="mt-1 text-sm font-semibold text-fg break-keep">{str(v.hypothesis)}</p>
            <p className="mt-1.5 text-xs text-fg-muted break-keep">
              {str(v.metric)} → {str(v.target)} · {str(v.method)}
            </p>
          </div>
        ) : null}
        {checklist.length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <p className="text-2xs font-semibold text-fg-subtle">
              {L({ ko: "출시 체크리스트", en: "Launch checklist" })} ({checklist.filter((_, i) => done.has(String(i))).length}/{checklist.length})
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {checklist.map((c, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" checked={done.has(String(i))} onChange={() => toggle(String(i))} className="mt-1 accent-[var(--color-accent)]" />
                    <span className={cn("break-keep", done.has(String(i)) ? "text-fg-subtle line-through" : "text-fg")}>
                      <span className="mr-1 text-2xs text-fg-subtle">[{CHECK_LABELS[c.category] ?? c.category}]</span>
                      {c.item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
