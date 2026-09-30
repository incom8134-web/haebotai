"use client";

import { Diamond, Flag, Repeat } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker, SectionTitle, useLocalSet } from "@/components/results/discover/shared";

// 업무 매뉴얼 빌더 result: the procedure as a swimlane flow — one column per
// role on wide screens, steps in order down the page, decisions marked
// with what to do on "no" — then the quality checklist (tickable, kept in
// this browser), exceptions, KPIs and training tips.

const TYPE: Record<string, { ko: string; en: string }> = {
  task: { ko: "작업", en: "Task" },
  decision: { ko: "판단", en: "Decision" },
  check: { ko: "확인", en: "Check" },
  handoff: { ko: "넘김", en: "Hand-off" },
};

export function SopFlow({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const roles = objs(output.roles).map((r) => ({ role: str(r.role), resp: str(r.responsibility) }));
  const steps = objs(output.steps).map((s, i) => ({
    id: str(s.id) || `s${i + 1}`,
    title: str(s.title),
    role: str(s.role),
    type: str(s.type),
    action: str(s.action),
    tools: str(s.tools),
    output: str(s.output),
    minutes: Number(s.minutes) || 0,
    ifNo: str(s.if_no),
  }));
  const lanes = roles.length ? roles.map((r) => r.role) : [...new Set(steps.map((s) => s.role))];
  const laneOf = (role: string) => Math.max(0, lanes.findIndex((l) => l === role || role.includes(l) || l.includes(role)));
  const checks = objs(output.quality_checks).map((c) => ({ step: str(c.step_id), check: str(c.check), standard: str(c.standard) }));
  const [done, toggle] = useLocalSet(`haebot-sop-check-${runId ?? "draft"}`);
  const scope = obj(output.scope);
  const total = steps.reduce((a, s) => a + s.minutes, 0);
  const checklistText = checks.map((c) => `☐ [${c.step}] ${c.check} — ${c.standard}`).join("\n");

  return (
    <div className="mt-3 flex flex-col gap-6">
      <section className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-base font-bold text-fg break-keep">{str(output.purpose)}</p>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
          <p className="break-keep">
            <span className="text-fg-subtle">{L({ ko: "시작", en: "Starts" })}</span> {str(scope.starts_when)}
          </p>
          <p className="break-keep">
            <span className="text-fg-subtle">{L({ ko: "끝", en: "Ends" })}</span> {str(scope.ends_when)}
          </p>
          <p className="break-keep">
            <span className="text-fg-subtle">{L({ ko: "총 소요", en: "Total time" })}</span> {total ? `${total}${L({ ko: "분", en: " min" })}` : "—"}
          </p>
        </div>
        {strs(scope.not_covered).length ? <p className="mt-2 text-2xs text-fg-subtle break-keep">{L({ ko: "다루지 않는 것", en: "Not covered" })}: {strs(scope.not_covered).join(" · ")}</p> : null}
      </section>

      <section>
        <SectionTitle kicker={L({ ko: "흐름", en: "Flow" })} title={L({ ko: "역할별 단계", en: "Steps by role" })} />
        <div className="hidden gap-2 md:grid" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }} aria-hidden>
          {lanes.map((l, i) => (
            <div key={l} className="rounded-t-xl bg-surface-2 px-3 py-2">
              <p className="text-sm font-semibold text-fg">{l}</p>
              {roles[i]?.resp ? <p className="text-2xs text-fg-muted break-keep">{roles[i].resp}</p> : null}
            </div>
          ))}
        </div>
        <ol className="flex flex-col gap-2 md:mt-2">
          {steps.map((s) => (
            <li key={s.id} className="grid gap-2 md:[grid-template-columns:var(--cols)]" style={{ "--cols": `repeat(${lanes.length}, minmax(0, 1fr))` } as React.CSSProperties}>
              <div
                className={cn(
                  "rounded-xl border p-3 md:[grid-column-start:var(--lane)]",
                  s.type === "decision" ? "border-warn bg-warn/10" : s.type === "check" ? "border-ai/40 bg-ai-dim" : "border-hairline bg-surface",
                )}
                style={{ "--lane": String(laneOf(s.role) + 1) } as React.CSSProperties}
              >
                <p className="flex items-center gap-1.5 text-2xs text-fg-subtle">
                  {s.type === "decision" ? <Diamond className="size-3 text-warn" aria-hidden /> : s.type === "handoff" ? <Repeat className="size-3" aria-hidden /> : <Flag className="size-3" aria-hidden />}
                  {s.id} · {L(TYPE[s.type] ?? { ko: s.type, en: s.type })}
                  <span className="md:sr-only">· {s.role}</span>
                  {s.minutes ? <span className="ml-auto">{s.minutes}{L({ ko: "분", en: "m" })}</span> : null}
                </p>
                <p className="mt-1 text-sm font-semibold text-fg break-keep">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted break-keep">{s.action}</p>
                {s.tools || s.output ? (
                  <p className="mt-1.5 text-2xs text-fg-subtle break-keep">
                    {s.tools ? `🛠 ${s.tools}` : ""}
                    {s.tools && s.output ? " · " : ""}
                    {s.output ? `→ ${s.output}` : ""}
                  </p>
                ) : null}
                {s.type === "decision" && s.ifNo ? (
                  <p className="mt-1.5 rounded-md bg-surface px-2 py-1 text-2xs text-fg break-keep">
                    {L({ ko: "아니오라면", en: "If no" })}: {s.ifNo}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {checks.length ? (
        <section className="rounded-2xl border border-hairline p-4">
          <div className="flex items-center gap-2">
            <Kicker>
              {L({ ko: "품질 체크리스트", en: "Quality checklist" })} ({checks.filter((_, i) => done.has(String(i))).length}/{checks.length})
            </Kicker>
            <CopyButton text={checklistText} label={L({ ko: "체크리스트 복사", en: "Copy checklist" })} className="ml-auto" />
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {checks.map((c, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" checked={done.has(String(i))} onChange={() => toggle(String(i))} className="mt-1 accent-[var(--color-accent)]" />
                  <span className={cn("break-keep", done.has(String(i)) ? "text-fg-subtle line-through" : "text-fg")}>
                    <span className="mr-1 font-mono text-2xs text-fg-subtle">{c.step}</span>
                    {c.check}
                    <span className="block text-2xs text-fg-muted">{c.standard}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {objs(output.exceptions).length ? (
        <section>
          <SectionTitle kicker={L({ ko: "예외", en: "Exceptions" })} title={L({ ko: "이럴 땐 이렇게", en: "When things go wrong" })} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-xs">
              <thead>
                <tr className="border-b border-hairline text-left text-fg-subtle">
                  <th className="py-1.5 pr-3 font-normal">{L({ ko: "상황", en: "Situation" })}</th>
                  <th className="py-1.5 pr-3 font-normal">{L({ ko: "대응", en: "Response" })}</th>
                  <th className="py-1.5 font-normal">{L({ ko: "알릴 사람", en: "Escalate to" })}</th>
                </tr>
              </thead>
              <tbody>
                {objs(output.exceptions).map((e, i) => (
                  <tr key={i} className="border-b border-hairline align-top last:border-0">
                    <td className="py-2 pr-3 font-medium text-fg break-keep">{str(e.situation)}</td>
                    <td className="py-2 pr-3 text-fg-muted break-keep">{str(e.response)}</td>
                    <td className="py-2 text-fg-muted">{str(e.escalate_to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        {objs(output.kpis).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "잘 되고 있는지 보는 지표", en: "How to tell it works" })}</Kicker>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {objs(output.kpis).map((k, i) => (
                <li key={i} className="break-keep">
                  <b className="font-semibold text-fg">{str(k.metric)}</b> <span className="text-accent">{str(k.target)}</span>
                  <span className="block text-2xs text-fg-subtle">{str(k.how)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {strs(output.training_tips).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "가르칠 때 팁", en: "Training tips" })}</Kicker>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-fg-muted">
              {strs(output.training_tips).map((t, i) => (
                <li key={i} className="break-keep">· {t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
