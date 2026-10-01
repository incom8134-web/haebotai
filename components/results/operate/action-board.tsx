"use client";

import { useState } from "react";
import { CalendarPlus, Quote } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { buildActionsIcs, isIsoDate } from "@/lib/tools/export/actions-ics";
import { objs, str, strs } from "@/lib/tools/report/util";
import { downloadText } from "@/components/results/download";
import { CopyButton, Kicker, SectionTitle, useLocalSet } from "@/components/results/discover/shared";

// 회의→실행 보드 result: decisions, then the actions as a board — grouped
// by owner or ordered by due date — each with the line of the notes it
// came from and a done tick (kept in this browser). Open questions, the
// next agenda, a follow-up message to send and a calendar file of the
// dated actions (undated ones are counted, not placed on a guessed day).

const PRIORITY: Record<string, { ko: string; en: string; cls: string }> = {
  high: { ko: "높음", en: "High", cls: "bg-danger/10 text-danger" },
  medium: { ko: "보통", en: "Medium", cls: "bg-warn/15 text-fg" },
  low: { ko: "낮음", en: "Low", cls: "bg-surface-2 text-fg-muted" },
};

export function ActionBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const actions = objs(output.actions).map((a, i) => ({
    key: String(i),
    task: str(a.task),
    owner: str(a.owner) || "[미정]",
    due: str(a.due),
    dueNote: str(a.due_note),
    priority: str(a.priority),
    doneWhen: str(a.done_when),
    from: str(a.from_note),
  }));
  const [view, setView] = useState<"owner" | "due">("owner");
  const [done, toggle] = useLocalSet(`haebot-actions-${runId ?? "draft"}`);
  const owners = [...new Set(actions.map((a) => a.owner))];
  const byDue = [...actions].sort((a, b) => (isIsoDate(a.due) ? a.due : "9999").localeCompare(isIsoDate(b.due) ? b.due : "9999"));
  const ics = buildActionsIcs(actions, str(output.title));
  const undated = actions.filter((a) => !isIsoDate(a.due)).length;

  const card = (a: (typeof actions)[number]) => (
    <li key={a.key} className={cn("rounded-xl border border-hairline bg-surface p-3", done.has(a.key) && "opacity-60")}>
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={done.has(a.key)} onChange={() => toggle(a.key)} className="mt-1 accent-[var(--color-accent)]" />
        <span className={cn("flex-1 text-sm font-medium break-keep", done.has(a.key) ? "text-fg-subtle line-through" : "text-fg")}>{a.task}</span>
      </label>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6 text-2xs">
        {view === "due" ? <span className="rounded bg-surface-2 px-1.5 py-0.5 text-fg">{a.owner}</span> : null}
        <span className={cn("rounded px-1.5 py-0.5", isIsoDate(a.due) ? "bg-accent-dim text-accent" : "bg-surface-2 text-fg-subtle")}>
          {isIsoDate(a.due) ? a.due : L({ ko: "마감 미정", en: "No date" })}
        </span>
        {PRIORITY[a.priority] ? <span className={cn("rounded px-1.5 py-0.5", PRIORITY[a.priority].cls)}>{L(PRIORITY[a.priority])}</span> : null}
        {a.dueNote ? <span className="text-fg-subtle">{a.dueNote}</span> : null}
      </p>
      {a.doneWhen ? <p className="mt-1 pl-6 text-2xs text-fg-muted break-keep">{L({ ko: "완료 기준", en: "Done when" })}: {a.doneWhen}</p> : null}
      {a.from ? (
        <p className="mt-1 flex gap-1 pl-6 text-2xs text-fg-subtle break-keep">
          <Quote className="size-3 shrink-0" aria-label={L({ ko: "메모 원문", en: "From the notes" })} />
          {a.from}
        </p>
      ) : null}
    </li>
  );

  return (
    <div className="mt-3 flex flex-col gap-5">
      <div>
        <p className="text-lg font-bold text-fg break-keep">{str(output.title)}</p>
        {str(output.summary) ? <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{str(output.summary)}</p> : null}
      </div>

      {objs(output.decisions).length ? (
        <section className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
          <Kicker>{L({ ko: "결정된 것", en: "Decided" })}</Kicker>
          <ul className="mt-2 flex flex-col gap-1.5">
            {objs(output.decisions).map((d, i) => (
              <li key={i} className="text-sm text-fg break-keep">
                ✓ <b className="font-semibold">{str(d.decision)}</b>
                {str(d.rationale) ? <span className="text-fg-muted"> — {str(d.rationale)}</span> : null}
                {str(d.owner) ? <span className="ml-1 text-2xs text-fg-subtle">({str(d.owner)})</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <SectionTitle kicker={L({ ko: "할 일", en: "Actions" })} title={L({ ko: `${actions.length}개 · 완료 ${actions.filter((a) => done.has(a.key)).length}개`, en: `${actions.length} · ${actions.filter((a) => done.has(a.key)).length} done` })} />
          <div className="mb-3 ml-auto flex gap-1 rounded-xl bg-surface-2 p-1 text-xs" role="tablist">
            {(
              [
                ["owner", L({ ko: "사람별", en: "By owner" })],
                ["due", L({ ko: "마감순", en: "By date" })],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn("rounded-lg px-3 py-1.5", view === k ? "bg-surface font-semibold text-fg shadow-sm" : "text-fg-muted")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {view === "owner" ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {owners.map((o) => (
              <div key={o} className="rounded-2xl bg-surface-2/60 p-3">
                <p className={cn("mb-2 text-sm font-semibold", o === "[미정]" ? "text-warn" : "text-fg")}>
                  {o === "[미정]" ? L({ ko: "담당 미정", en: "Unassigned" }) : o}
                </p>
                <ul className="flex flex-col gap-2">
                  {actions.filter((a) => a.owner === o).map(card)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {byDue.map(card)}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-fg-subtle">
          {ics ? (
            <button
              type="button"
              onClick={() => downloadText("meeting-actions.ics", ics.ics, "text/calendar")}
              className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted hover:border-accent hover:text-fg"
            >
              <CalendarPlus className="size-3.5" aria-hidden />
              {L({ ko: `마감 ${ics.count}개를 캘린더로`, en: `${ics.count} deadlines to calendar` })}
            </button>
          ) : null}
          {undated ? <span>{L({ ko: `마감이 정해지지 않은 일 ${undated}개는 캘린더에서 빠져요.`, en: `${undated} actions without a date are left out.` })}</span> : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {objs(output.open_questions).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "아직 열린 질문", en: "Open questions" })}</Kicker>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {objs(output.open_questions).map((q, i) => (
                <li key={i} className="text-fg break-keep">
                  ? {str(q.question)}
                  {str(q.who_answers) ? <span className="ml-1 text-2xs text-fg-subtle">→ {str(q.who_answers)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {strs(output.next_agenda).length || strs(output.risks).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "다음 회의 안건", en: "Next agenda" })}</Kicker>
            <ol className="mt-2 flex flex-col gap-1 text-sm text-fg">
              {strs(output.next_agenda).map((a, i) => (
                <li key={i} className="break-keep">{i + 1}. {a}</li>
              ))}
            </ol>
            {strs(output.risks).length ? <p className="mt-2 text-2xs text-danger break-keep">⚠ {strs(output.risks).join(" · ")}</p> : null}
          </div>
        ) : null}
      </section>

      {str(output.follow_up_message) ? (
        <section className="rounded-2xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <Kicker>{L({ ko: "참석자에게 보낼 정리 메시지", en: "Follow-up message" })}</Kicker>
            <CopyButton text={str(output.follow_up_message)} className="ml-auto" />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg break-keep">{str(output.follow_up_message)}</p>
        </section>
      ) : null}
    </div>
  );
}
