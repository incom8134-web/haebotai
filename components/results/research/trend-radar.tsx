"use client";

import { useMemo, useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { buildReport } from "@/lib/tools/report";
import { objs, str } from "@/lib/tools/report/util";
import { ReportView } from "@/components/results/report-view";
import { Kicker } from "@/components/results/discover/shared";
import { Origin } from "./origin";

// 트렌드 레이더 result: the market signals on a radar — rings for how soon
// each matters (now at the centre), dot size for impact, colour for where
// it came from (searched, given, hypothesis), arrow for direction — with
// the list beside it, then the full trend report.

const RING: Record<string, number> = { now: 0.3, soon: 0.62, later: 0.92 };
const COLOR: Record<string, string> = { search: "var(--color-grounded)", user: "var(--color-ai)", hypothesis: "var(--color-fg-subtle)" };
const DIR: Record<string, string> = { up: "↑", flat: "→", down: "↓" };

export function TrendRadar({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const signals = objs(output.signals).map((s) => ({ signal: str(s.signal), direction: str(s.direction), evidence: str(s.evidence), origin: str(s.origin), impact: Math.max(1, Math.min(5, Number(s.impact) || 1)), horizon: str(s.horizon) || "soon" }));
  const [active, setActive] = useState<number | null>(null);
  const report = useMemo(() => buildReport("trend", output, input), [output, input]);
  const R = 140;

  return (
    <div className="mt-3 flex flex-col gap-5">
      <section className="grid gap-4 rounded-2xl border border-hairline bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Kicker>{L({ ko: "신호 레이더", en: "Signal radar" })}</Kicker>
          <svg viewBox={`${-R - 10} ${-R - 10} ${2 * R + 20} ${2 * R + 20}`} className="mt-2 w-full max-w-sm" role="img" aria-label={L({ ko: "시장 신호 레이더", en: "Market signal radar" })}>
            {(["later", "soon", "now"] as const).map((h) => (
              <g key={h}>
                <circle r={RING[h] * R} fill="none" stroke="var(--color-hairline-str)" strokeDasharray={h === "now" ? undefined : "3 3"} />
                <text y={-RING[h] * R + 11} textAnchor="middle" fontSize="9" fill="var(--color-fg-subtle)">
                  {h === "now" ? L({ ko: "지금", en: "Now" }) : h === "soon" ? L({ ko: "6~12개월", en: "6–12 mo" }) : L({ ko: "그 이후", en: "Later" })}
                </text>
              </g>
            ))}
            {signals.map((s, i) => {
              const a = (i / Math.max(1, signals.length)) * Math.PI * 2 - Math.PI / 2;
              const r = (RING[s.horizon] ?? 0.62) * R - 10;
              const x = Math.cos(a) * r;
              const y = Math.sin(a) * r;
              return (
                <g key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} className="cursor-pointer">
                  <circle cx={x} cy={y} r={4 + s.impact * 2.2} fill={COLOR[s.origin] ?? COLOR.hypothesis} fillOpacity={active === null || active === i ? 0.85 : 0.25} stroke="var(--color-surface)" strokeWidth="1.5" />
                  <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-fg-subtle">
            <Origin origin="search" /> <Origin origin="user" /> <Origin origin="hypothesis" /> {L({ ko: "· 점이 클수록 영향이 큼", en: "· bigger dot, bigger impact" })}
          </p>
        </div>
        <ol className="flex flex-col gap-1.5">
          {signals.map((s, i) => (
            <li key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={cn("rounded-xl border p-2.5 text-xs transition-colors", active === i ? "border-accent bg-accent-dim" : "border-hairline")}>
              <p className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-fg-subtle">{i + 1}</span>
                <span className="font-semibold text-fg break-keep">{s.signal}</span>
                <span className={cn("font-bold", s.direction === "up" ? "text-grounded" : s.direction === "down" ? "text-danger" : "text-fg-subtle")}>{DIR[s.direction]}</span>
                <span className="ml-auto"><Origin origin={s.origin} /></span>
              </p>
              <p className="mt-0.5 text-fg-muted break-keep">{s.evidence}</p>
            </li>
          ))}
        </ol>
      </section>
      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
