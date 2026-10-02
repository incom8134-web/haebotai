"use client";

import { Cited } from "@/components/results/cited";
import { useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { Kicker, SectionTitle } from "@/components/results/discover/shared";
import { CONFIDENCE, Origin } from "./origin";

// 시장 리서치 데스크 result: the decision on top, then the research
// questions as tabs — each with its evidence blocks (the figure, the
// finding, where it came from and how sure it is) — the assumptions with
// whether each is verified, the sizing with its method, implications and
// the checks to run next.

const STATUS: Record<string, { ko: string; en: string; cls: string }> = {
  verified: { ko: "확인됨", en: "Verified", cls: "bg-grounded-dim text-grounded" },
  partly: { ko: "일부 확인", en: "Partly", cls: "bg-warn/15 text-fg" },
  unverified: { ko: "확인 안 됨", en: "Unverified", cls: "bg-danger/10 text-danger" },
};

export function ResearchDesk({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const questions = objs(output.questions).map((q, i) => ({ id: str(q.id) || `q${i + 1}`, question: str(q.question), why: str(q.why) }));
  const evidence = objs(output.evidence);
  const [tab, setTab] = useState(0);
  const q = questions[Math.min(tab, questions.length - 1)];
  const size = obj(output.market_size);
  const counts = { search: 0, user: 0, hypothesis: 0 } as Record<string, number>;
  for (const e of evidence) counts[str(e.origin)] = (counts[str(e.origin)] ?? 0) + 1;

  return (
    <div className="mt-3 flex flex-col gap-5">
      <section className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
        <Kicker>{L({ ko: "이 조사가 돕는 결정", en: "The decision" })}</Kicker>
        <p className="mt-1 text-base font-bold text-fg break-keep">{str(output.decision)}</p>
        {str(output.summary) ? <p className="mt-1.5 text-sm leading-relaxed text-fg-muted break-keep"><Cited text={str(output.summary)} /></p> : null}
        <p className="mt-2 flex flex-wrap gap-2 text-2xs text-fg-muted">
          <span>{L({ ko: `근거 ${evidence.length}개`, en: `${evidence.length} findings` })}</span>
          <span>· <Origin origin="search" /> {counts.search}</span>
          <span>· <Origin origin="user" /> {counts.user}</span>
          <span>· <Origin origin="hypothesis" /> {counts.hypothesis}</span>
        </p>
      </section>

      {questions.length ? (
        <section>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
            {questions.map((x, i) => (
              <button key={x.id} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={cn("max-w-64 shrink-0 rounded-xl border px-3 py-2 text-left text-xs", tab === i ? "border-accent bg-accent-dim text-fg" : "border-hairline text-fg-muted hover:text-fg")}>
                <span className="font-mono text-2xs text-fg-subtle">{x.id}</span> <span className="line-clamp-2 break-keep">{x.question}</span>
              </button>
            ))}
          </div>
          {q ? (
            <div className="mt-3">
              <p className="text-base font-semibold text-fg break-keep">{q.question}</p>
              {q.why ? <p className="mt-0.5 text-xs text-fg-muted break-keep">{q.why}</p> : null}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {evidence
                  .filter((e) => str(e.question_id) === q.id)
                  .map((e, i) => (
                    <article key={i} className={cn("rounded-xl border p-3", str(e.origin) === "hypothesis" ? "border-dashed border-hairline-str" : "border-hairline bg-surface")}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Origin origin={str(e.origin)} />
                        {CONFIDENCE[str(e.confidence)] ? <span className="text-[10px] text-fg-subtle">{L(CONFIDENCE[str(e.confidence)])}</span> : null}
                      </div>
                      {str(e.figure) ? <p className="mt-1.5 text-lg font-bold text-fg break-keep">{str(e.figure)}</p> : null}
                      <p className="mt-1 text-sm leading-relaxed text-fg break-keep"><Cited text={str(e.finding)} /></p>
                      {str(e.source_title) ? <p className="mt-1.5 text-2xs text-fg-subtle break-keep">— {str(e.source_title)}</p> : null}
                    </article>
                  ))}
                {!evidence.some((e) => str(e.question_id) === q.id) ? <p className="text-sm text-fg-subtle">{L({ ko: "이 질문에 대한 근거를 찾지 못했어요.", en: "No evidence found for this question." })}</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        {str(size.estimate) ? (
          <div className="rounded-2xl border border-hairline p-4">
            <div className="flex items-center gap-2">
              <Kicker>{L({ ko: "시장 규모", en: "Market size" })}</Kicker>
              <Origin origin={str(size.origin)} />
            </div>
            <p className="mt-1 text-xl font-bold text-fg break-keep">{str(size.estimate)}</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted break-keep">{L({ ko: "계산 방법", en: "Method" })}: <Cited text={str(size.method)} /></p>
          </div>
        ) : null}
        {strs(output.implications).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "이 결정에 대해 의미하는 것", en: "What it means for the decision" })}</Kicker>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-fg">
              {strs(output.implications).map((x, i) => (
                <li key={i} className="break-keep">→ {x}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {objs(output.assumptions).length ? (
        <section>
          <SectionTitle kicker={L({ ko: "가정", en: "Assumptions" })} title={L({ ko: "이 결정이 기대고 있는 것", en: "What the decision rests on" })} />
          <ul className="flex flex-col gap-2">
            {objs(output.assumptions).map((a, i) => {
              const s = STATUS[str(a.status)];
              return (
                <li key={i} className="flex flex-wrap items-start gap-2 rounded-xl border border-hairline p-3">
                  {s ? <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", s.cls)}>{L(s)}</span> : null}
                  <span className="min-w-0 flex-1 text-sm text-fg break-keep">
                    {str(a.assumption)}
                    {str(a.risk_if_wrong) ? <span className="block text-2xs text-fg-muted">{L({ ko: "틀리면", en: "If wrong" })}: {str(a.risk_if_wrong)}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {objs(output.next_checks).length ? (
        <section>
          <SectionTitle kicker={L({ ko: "다음", en: "Next" })} title={L({ ko: "직접 확인할 것", en: "Check next" })} />
          <ol className="flex flex-col gap-2">
            {objs(output.next_checks).map((c, i) => (
              <li key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                <p className="font-medium text-fg break-keep">{i + 1}. {str(c.check)}</p>
                <p className="mt-0.5 text-xs text-fg-muted break-keep">
                  {str(c.how)}
                  {str(c.cost) ? ` · ${str(c.cost)}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
