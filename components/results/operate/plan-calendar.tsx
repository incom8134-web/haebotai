"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { datePlan, isIsoDate, monthGrid, planIcs, type PlanTask } from "@/lib/tools/plan-calendar";

// The plan's "캘린더" tab (components/results/operate/ops-board.tsx): every
// task on its date in a month grid, coloured by kind of work, with the week's
// milestone on its Monday. Tapping a task moves it on (할 일 → 하는 중 → 완료),
// sharing status with the other tabs. ".ics" adds the plan to any calendar app.

type Status = "todo" | "doing" | "done";
const CATEGORY_TONE: Record<string, string> = {
  "기획·준비": "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  "콘텐츠·홍보": "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  "영업·판매": "bg-amber-500/18 text-amber-900 dark:text-amber-200",
  "제작·운영": "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  학습: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  "점검·회고": "bg-slate-500/15 text-slate-700 dark:text-slate-200",
};
const CATEGORY_EN: Record<string, string> = { "기획·준비": "Planning", "콘텐츠·홍보": "Content & promo", "영업·판매": "Sales", "제작·운영": "Making & ops", 학습: "Learning", "점검·회고": "Review" };
const WEEKDAYS = { ko: ["월", "화", "수", "목", "금", "토", "일"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
const NEXT: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" };

export function PlanCalendar({
  tasks,
  milestones,
  start,
  goal,
  runId,
  status,
  onStatus,
}: {
  tasks: PlanTask[];
  milestones: { week: number; text: string }[];
  start: string | undefined;
  goal: string;
  runId?: string;
  status: Record<string, Status>;
  onStatus: (key: string, s: Status) => void;
}) {
  const L = useBi();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const begin = isIsoDate(start) ? start : today;
  const dated = useMemo(() => datePlan(tasks, begin), [tasks, begin]);
  const byDate = useMemo(() => {
    const m = new Map<string, typeof dated>();
    for (const t of dated) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return m;
  }, [dated]);
  const mondays = useMemo(() => {
    const m = new Map<string, string>();
    for (const ms of milestones) {
      const d = datePlan([{ week: ms.week, day: 1, title: "", key: "" }], begin)[0].date;
      if (ms.text) m.set(d, ms.text);
    }
    return m;
  }, [milestones, begin]);
  const months = useMemo(() => {
    const keys = [...new Set(dated.map((t) => t.date.slice(0, 7)))].sort();
    return keys.length ? keys : [begin.slice(0, 7)];
  }, [dated, begin]);
  const initial = Math.max(0, months.indexOf(today.slice(0, 7)));
  const [idx, setIdx] = useState(initial);
  const ym = months[Math.min(idx, months.length - 1)];
  const [y, mo] = ym.split("-").map(Number);
  const grid = monthGrid(y, mo);
  const days = L({ ko: "ko", en: "en" }) === "en" ? WEEKDAYS.en : WEEKDAYS.ko;

  const downloadIcs = () => {
    const ics = planIcs(dated, { name: goal || L({ ko: "13주 계획", en: "13-week plan" }), uid: runId ?? "plan" });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: L({ ko: "13주_계획.ics", en: "13-week-plan.ics" }) });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="flex flex-col gap-3" aria-label={L({ ko: "캘린더", en: "Calendar" })}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label={L({ ko: "이전 달", en: "Previous month" })} className="grid size-8 place-items-center rounded-full border border-hairline text-fg-muted hover:text-fg disabled:opacity-40">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <p className="min-w-[7.5rem] text-center font-display text-lg font-bold text-fg tabular-nums">{L({ ko: `${y}년 ${mo}월`, en: new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) })}</p>
          <button type="button" onClick={() => setIdx((i) => Math.min(months.length - 1, i + 1))} disabled={idx >= months.length - 1} aria-label={L({ ko: "다음 달", en: "Next month" })} className="grid size-8 place-items-center rounded-full border border-hairline text-fg-muted hover:text-fg disabled:opacity-40">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-fg-subtle">{L({ ko: `시작 ${begin}${isIsoDate(start) ? "" : " (시작일이 없어 오늘부터)"}`, en: `Starts ${begin}${isIsoDate(start) ? "" : " (no start date, so from today)"}` })}</p>
        <button type="button" onClick={downloadIcs} className="studio-gradient-bg ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white">
          <CalendarPlus className="size-3.5" aria-hidden /> {L({ ko: "내 캘린더에 추가 (.ics)", en: "Add to my calendar (.ics)" })}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
        <div className="grid grid-cols-7 border-b border-hairline bg-surface-2/60 text-center text-2xs font-semibold text-fg-muted">
          {days.map((d, i) => (
            <span key={d} className={cn("py-2", i >= 5 && "text-rose-600 dark:text-rose-300")}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.flat().map((date) => {
            const inMonth = date.slice(0, 7) === ym;
            const list = byDate.get(date) ?? [];
            const ms = mondays.get(date);
            const isToday = date === today;
            return (
              <div key={date} className={cn("min-h-[5.5rem] border-r border-b border-hairline p-1 last:border-r-0 sm:min-h-[7rem] sm:p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-surface-2/40")}>
                <p className={cn("mb-1 flex items-center gap-1 text-2xs tabular-nums", inMonth ? "text-fg-muted" : "text-fg-subtle/60")}>
                  <span className={cn("grid size-5 place-items-center rounded-full", isToday && "bg-accent font-bold text-white")}>{Number(date.slice(8))}</span>
                  {date === begin ? <span className="rounded-full bg-accent-dim px-1.5 text-[9px] font-semibold text-accent">{L({ ko: "시작", en: "Start" })}</span> : null}
                </p>
                {ms ? <p className="mb-1 truncate rounded-md border border-dashed border-accent/40 px-1 text-[10px] font-semibold text-accent" title={ms}>◆ {ms}</p> : null}
                <ul className="flex flex-col gap-0.5">
                  {list.slice(0, 3).map((t) => {
                    const s = status[t.key] ?? "todo";
                    return (
                      <li key={t.key}>
                        <button
                          type="button"
                          onClick={() => onStatus(t.key, NEXT[s])}
                          title={`${t.title}${t.minutes ? ` · ${t.minutes}${L({ ko: "분", en: " min" })}` : ""}${t.done ? `\n${L({ ko: "완료 기준", en: "Done when" })}: ${t.done}` : ""}`}
                          className={cn("w-full truncate rounded-md px-1 py-0.5 text-left text-[10px] leading-tight font-medium sm:text-[11px]", CATEGORY_TONE[t.category ?? ""] ?? "bg-surface-2 text-fg", s === "done" && "line-through opacity-55", s === "doing" && "ring-1 ring-accent")}
                        >
                          {s === "done" ? "✓ " : s === "doing" ? "● " : ""}
                          {t.title}
                        </button>
                      </li>
                    );
                  })}
                  {list.length > 3 ? <li className="px-1 text-[10px] text-fg-subtle">+{list.length - 3}</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
        {Object.entries(CATEGORY_TONE).map(([k, tone]) => (
          <span key={k} className={cn("rounded-full px-2 py-0.5", tone)}>{L({ ko: k, en: CATEGORY_EN[k] ?? k })}</span>
        ))}
        <span className="ml-auto text-fg-subtle">{L({ ko: "할 일을 누르면 할 일 → 하는 중 → 완료로 바뀌어요", en: "Tap a task: to do → doing → done" })}</span>
      </div>
    </section>
  );
}
