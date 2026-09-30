"use client";

import { useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { useLocalValue } from "@/lib/hooks/use-local-list";
import { cn } from "@/lib/utils";
import { objs, str } from "@/lib/tools/report/util";

// 운영 플래너 result: one plan, three ways to work it. 칸반 shows a chosen
// week's tasks as 할 일 / 하는 중 / 완료; 타임라인 lays the phases and
// milestones over 13 weeks with how far each week is done; 체크리스트
// lists every task by week. All three share one status per task, kept in
// this browser.

type Status = "todo" | "doing" | "done";
const DAYS = ["", "월", "화", "수", "목", "금", "토", "일"];

export function OpsBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const weeks = objs(output.weeks).map((w) => ({
    no: Number(w.week_no) || 0,
    milestone: str(w.milestone),
    tasks: objs(w.tasks).map((t, i) => ({ key: `${Number(w.week_no) || 0}-${i}`, day: Number(t.day) || 0, title: str(t.title), category: str(t.category), minutes: Number(t.est_minutes) || 0, done: str(t.done_criteria) })),
  }));
  const phases = objs(output.phases).map((p) => ({ name: str(p.name), from: Number(p.week_from) || 1, to: Number(p.week_to) || 1, focus: str(p.focus) }));
  const [raw, setRaw] = useLocalValue(`haebot-ops-${runId ?? "draft"}`);
  let status: Record<string, Status> = {};
  try {
    status = raw ? JSON.parse(raw) : {};
  } catch {
    status = {};
  }
  const setStatus = (key: string, s: Status) => setRaw(JSON.stringify({ ...status, [key]: s }));
  const [tab, setTab] = useState<"kanban" | "timeline" | "checklist">("kanban");
  const firstOpen = weeks.find((w) => w.tasks.some((t) => status[t.key] !== "done"))?.no ?? 1;
  const [week, setWeek] = useState<number | null>(null);
  const current = weeks.find((w) => w.no === (week ?? firstOpen)) ?? weeks[0];
  const all = weeks.flatMap((w) => w.tasks);
  const doneCount = all.filter((t) => status[t.key] === "done").length;
  const pct = (w: (typeof weeks)[number]) => (w.tasks.length ? w.tasks.filter((t) => status[t.key] === "done").length / w.tasks.length : 0);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-base font-bold text-fg break-keep">{str(output.goal)}</p>
          <p className="text-xs text-fg-muted">
            {L({ ko: `전체 ${all.length}개 중 ${doneCount}개 완료`, en: `${doneCount} of ${all.length} tasks done` })}
          </p>
        </div>
        <div className="ml-auto flex gap-1 rounded-xl bg-surface-2 p-1 text-xs" role="tablist">
          {(
            [
              ["kanban", L({ ko: "칸반", en: "Kanban" })],
              ["timeline", L({ ko: "타임라인", en: "Timeline" })],
              ["checklist", L({ ko: "체크리스트", en: "Checklist" })],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-lg px-3 py-1.5", tab === k ? "bg-surface font-semibold text-fg shadow-sm" : "text-fg-muted")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-accent" style={{ width: `${all.length ? (doneCount / all.length) * 100 : 0}%` }} />
      </div>

      {tab === "kanban" && current ? (
        <section>
          <div className="flex items-center gap-2">
            <label className="text-xs text-fg-muted">
              {L({ ko: "주차", en: "Week" })}{" "}
              <select value={current.no} onChange={(e) => setWeek(Number(e.target.value))} className="rounded-md border border-hairline bg-surface px-2 py-1 text-xs text-fg">
                {weeks.map((w) => (
                  <option key={w.no} value={w.no}>
                    {w.no}
                    {L({ ko: "주차", en: "" })} — {w.milestone.slice(0, 24)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-sm font-semibold text-fg break-keep">{current.milestone}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(
              [
                ["todo", L({ ko: "할 일", en: "To do" })],
                ["doing", L({ ko: "하는 중", en: "Doing" })],
                ["done", L({ ko: "완료", en: "Done" })],
              ] as const
            ).map(([col, label]) => {
              const items = current.tasks.filter((t) => (status[t.key] ?? "todo") === col);
              return (
                <div key={col} className="rounded-2xl bg-surface-2/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-fg">
                    {label} <span className="font-normal text-fg-subtle">({items.length})</span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {items.map((t) => (
                      <li key={t.key} className="rounded-xl border border-hairline bg-surface p-2.5">
                        <p className={cn("text-sm text-fg break-keep", col === "done" && "text-fg-subtle line-through")}>{t.title}</p>
                        <p className="mt-1 text-2xs text-fg-subtle">
                          {DAYS[t.day] ? `${DAYS[t.day]} · ` : ""}
                          {t.category} · {t.minutes}
                          {L({ ko: "분", en: "m" })}
                        </p>
                        {t.done ? <p className="mt-0.5 text-2xs text-fg-muted break-keep">✓ {t.done}</p> : null}
                        <div className="mt-2 flex gap-1" role="group" aria-label={L({ ko: "상태", en: "Status" })}>
                          {(["todo", "doing", "done"] as const)
                            .filter((s) => s !== col)
                            .map((s) => (
                              <button key={s} type="button" onClick={() => setStatus(t.key, s)} className="rounded-md border border-hairline px-2 py-0.5 text-2xs text-fg-muted hover:border-accent hover:text-fg">
                                → {s === "todo" ? L({ ko: "할 일", en: "To do" }) : s === "doing" ? L({ ko: "하는 중", en: "Doing" }) : L({ ko: "완료", en: "Done" })}
                              </button>
                            ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="overflow-x-auto">
          <div className="min-w-[40rem]">
            <div className="grid grid-cols-13 gap-1 text-center text-[10px] text-fg-subtle">
              {weeks.map((w) => (
                <button key={w.no} type="button" onClick={() => { setWeek(w.no); setTab("kanban"); }} className="rounded-md py-1 hover:bg-surface-2" title={w.milestone}>
                  {w.no}
                  <span className="mx-auto mt-1 flex h-8 w-2 flex-col justify-end overflow-hidden rounded-full bg-surface-2" aria-label={`${Math.round(pct(w) * 100)}%`}>
                    <span className="block w-full rounded-full bg-accent" style={{ height: `${pct(w) * 100}%` }} />
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-13 gap-1">
              {phases.map((p, i) => (
                <div key={i} className="rounded-lg bg-accent-dim px-2 py-1.5 text-xs text-fg" style={{ gridColumn: `${Math.max(1, p.from)} / ${Math.min(13, p.to) + 1}` }}>
                  <b className="font-semibold">{p.name}</b>
                  {p.focus ? <span className="block text-2xs text-fg-muted break-keep">{p.focus}</span> : null}
                </div>
              ))}
            </div>
            <ol className="mt-3 grid grid-cols-13 gap-1">
              {weeks.map((w) => (
                <li key={w.no} className="text-[10px] leading-snug text-fg-muted break-keep">{w.milestone}</li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {tab === "checklist" ? (
        <section className="flex flex-col gap-2">
          {weeks.map((w) => (
            <details key={w.no} open={w.no === (current?.no ?? 1)} className="rounded-xl border border-hairline bg-surface px-3 py-2">
              <summary className="flex cursor-pointer items-center gap-2 text-sm">
                <span className="font-semibold text-fg">{w.no}{L({ ko: "주차", en: " wk" })}</span>
                <span className="min-w-0 flex-1 truncate text-fg-muted">{w.milestone}</span>
                <span className="text-2xs tabular-nums text-fg-subtle">{Math.round(pct(w) * 100)}%</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5 pb-1">
                {w.tasks.map((t) => (
                  <li key={t.key}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input type="checkbox" checked={status[t.key] === "done"} onChange={(e) => setStatus(t.key, e.target.checked ? "done" : "todo")} className="mt-1 accent-[var(--color-accent)]" />
                      <span className={cn("break-keep", status[t.key] === "done" ? "text-fg-subtle line-through" : "text-fg")}>
                        {DAYS[t.day] ? <span className="mr-1 text-2xs text-fg-subtle">{DAYS[t.day]}</span> : null}
                        {t.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      ) : null}

      <p className="text-2xs text-fg-subtle">{L({ ko: "진행 상태는 이 브라우저에 저장돼요.", en: "Progress is saved in this browser." })}</p>
    </div>
  );
}
