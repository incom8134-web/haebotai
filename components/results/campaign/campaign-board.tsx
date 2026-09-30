"use client";

import { useMemo } from "react";
import { useBi } from "@/lib/i18n/context";
import { buildReport } from "@/lib/tools/report";
import { objs, str } from "@/lib/tools/report/util";
import { ReportView } from "@/components/results/report-view";
import { Kicker } from "@/components/results/discover/shared";

// 캠페인 플래너 result: the campaign as a 13-week timeline with one lane per
// channel and phases as colours, above the full strategy report.

const WEEKS = 13;
const PHASE_COLORS = ["#c2410c", "#0f766e", "#7c3aed", "#ca8a04", "#2563eb", "#be123c"];

export function CampaignBoard({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const items = objs(output.channel_plan)
    .map((c) => {
      const start = Math.max(1, Math.min(WEEKS, Math.round(Number(c.start_week) || 1)));
      const end = Math.max(start, Math.min(WEEKS, Math.round(Number(c.end_week) || start)));
      return { channel: str(c.channel), phase: str(c.phase), start, end, activity: str(c.activity), kpi: str(c.kpi) };
    })
    .filter((c) => c.channel && c.activity);
  const channels = [...new Set(items.map((i) => i.channel))];
  const phases = [...new Set(items.map((i) => i.phase).filter(Boolean))];
  const color = (p: string) => PHASE_COLORS[Math.max(0, phases.indexOf(p)) % PHASE_COLORS.length];
  // The timeline above replaces the report's own gantt of the same plan.
  const report = useMemo(() => buildReport("strategy", { ...output, channel_plan: [] }, input), [output, input]);

  return (
    <div className="mt-3 flex flex-col gap-5">
      <section className="rounded-2xl border border-hairline bg-surface p-4">
        <Kicker>{L({ ko: "13주 캠페인 타임라인", en: "13-week campaign timeline" })}</Kicker>
        {phases.length ? (
          <ul className="mt-2 flex flex-wrap gap-3 text-2xs text-fg-muted">
            {phases.map((p) => (
              <li key={p} className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ background: color(p) }} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-[8rem_repeat(13,minmax(0,1fr))] gap-px text-center text-[10px] text-fg-subtle">
              <span />
              {Array.from({ length: WEEKS }, (_, i) => (
                <span key={i}>
                  {i + 1}
                  {L({ ko: "주", en: "w" })}
                </span>
              ))}
            </div>
            {channels.map((ch) => (
              <div key={ch} className="mt-1.5 grid grid-cols-[8rem_repeat(13,minmax(0,1fr))] items-start gap-px border-t border-hairline pt-1.5">
                <p className="pr-2 text-xs font-semibold text-fg break-keep">{ch}</p>
                <div className="col-span-13 grid grid-cols-13 gap-1">
                  {items
                    .filter((i) => i.channel === ch)
                    .map((i, k) => (
                      <div
                        key={k}
                        className="rounded-md px-1.5 py-1 text-[11px] leading-snug text-white break-keep"
                        style={{ gridColumn: `${i.start} / ${i.end + 1}`, background: color(i.phase) }}
                        title={i.kpi ? `KPI: ${i.kpi}` : undefined}
                      >
                        {i.activity}
                        {i.kpi ? <span className="block opacity-80">KPI · {i.kpi}</span> : null}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
