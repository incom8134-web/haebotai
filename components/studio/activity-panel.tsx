"use client";

import { useId, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Activity, Coins, TrendingDown, TrendingUp } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { CATEGORIES } from "@/lib/tools/catalog";
import type { CategoryId } from "@/lib/tools/types";
import { halfOverHalf, type ActivityDay } from "@/lib/studio-activity";
import { cn } from "@/lib/utils";

// The Studio's activity panel, after the owner's reference video: glass
// cards with a two-line chart (runs, credits), a glass tooltip that pops
// up on hover or keyboard focus, gradient bars per tool area and a credits
// ring. Every number is the member's own (app/(app)/studio/page.tsx).

export interface StudioActivity {
  days: ActivityDay[];
  areas: { area: CategoryId; runs: number }[];
  /** Credits left and the plan's monthly allotment; null when there's no plan to measure against. */
  ring: { left: number; of: number } | null;
}

const W = 640;
const H = 300;
const PAD = { l: 8, r: 8, t: 18, b: 26 };

/** A smooth path through the points (Catmull-Rom as cubic Béziers), with
 *  each control point kept between its segment's ends so the curve never
 *  overshoots (no dips below zero next to a busy day). */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const md = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;

function Delta({ value }: { value: number | null }) {
  const L = useBi();
  if (value === null) return <span className="text-2xs text-fg-subtle">{L({ ko: "비교할 기간 없음", en: "No earlier period" })}</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-semibold", up ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/12 text-rose-700 dark:text-rose-300")}>
      <Icon size={11} aria-hidden /> {up ? "+" : ""}
      {value}%
    </span>
  );
}

function LineChart({ days }: { days: ActivityDay[] }) {
  const L = useBi();
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const maxRuns = Math.max(1, ...days.map((d) => d.runs));
  const maxCredits = Math.max(1, ...days.map((d) => d.credits));
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, days.length - 1);
  const y = (v: number, max: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const runPts = days.map((d, i) => [x(i), y(d.runs, maxRuns)] as [number, number]);
  const credPts = days.map((d, i) => [x(i), y(d.credits, maxCredits)] as [number, number]);
  const runPath = smooth(runPts);
  const credPath = smooth(credPts);
  const base = H - PAD.b;
  const area = `${runPath} L${x(days.length - 1)},${base} L${x(0)},${base} Z`;
  const peak = days.reduce((b, d, i) => (d.runs > days[b].runs ? i : b), 0);
  const shown = hover ?? (days[peak].runs > 0 ? peak : null);
  const tip = shown === null ? null : days[shown];

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (days.length - 1));
    setHover(Math.min(days.length - 1, Math.max(0, i)));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        role="img"
        tabIndex={0}
        aria-label={L({
          ko: `최근 ${days.length}일 실행 ${days.reduce((s, d) => s + d.runs, 0)}회, 크레딧 ${days.reduce((s, d) => s + d.credits, 0)}. 화살표 키로 날짜를 옮겨 볼 수 있어요.`,
          en: `${days.reduce((s, d) => s + d.runs, 0)} runs and ${days.reduce((s, d) => s + d.credits, 0)} credits over ${days.length} days. Use the arrow keys to move between days.`,
        })}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const from = shown ?? days.length - 1;
          setHover(Math.min(days.length - 1, Math.max(0, from + (e.key === "ArrowRight" ? 1 : -1))));
        }}
        onBlur={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + t * (H - PAD.t - PAD.b)} y2={PAD.t + t * (H - PAD.t - PAD.b)} className="stroke-fg/8" strokeDasharray="3 5" />
        ))}
        {[0, Math.floor((days.length - 1) / 2), days.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="fill-fg-subtle font-mono text-[11px]">
            {md(days[i].date)}
          </text>
        ))}
        <motion.path d={area} fill={`url(#fill-${uid})`} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 }} />
        <motion.path d={credPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        <motion.path d={runPath} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" filter={`url(#glow-${uid})`} initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
        {shown !== null ? (
          <g>
            <line x1={x(shown)} x2={x(shown)} y1={PAD.t} y2={base} className="stroke-fg/25" strokeDasharray="4 4" />
            <circle cx={credPts[shown][0]} cy={credPts[shown][1]} r="4.5" fill="#8b5cf6" className="stroke-surface" strokeWidth="2" />
            <circle cx={runPts[shown][0]} cy={runPts[shown][1]} r="9" fill="#14b8a6" opacity="0.25" />
            <circle cx={runPts[shown][0]} cy={runPts[shown][1]} r="5" fill="#14b8a6" className="stroke-surface" strokeWidth="2" />
          </g>
        ) : null}
      </svg>
      {/* The glass tooltip that pops up over the chosen day. */}
      <AnimatePresence>
        {tip && shown !== null ? (
          <motion.div
            key={shown}
            initial={reduce ? false : { opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="glass-strong pointer-events-none absolute top-0 z-10 min-w-[132px] rounded-2xl px-3 py-2 text-xs"
            style={{ left: `${(x(shown) / W) * 100}%`, translate: shown > days.length * 0.66 ? "-105% 0" : "8% 0" }}
            aria-live="polite"
          >
            <p className="font-mono text-2xs text-fg-subtle">{tip.date}</p>
            <p className="mt-1 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-full bg-[#14b8a6]" aria-hidden />{L({ ko: "실행", en: "Runs" })}</span>
              <span className="font-display text-base font-bold text-fg">{tip.runs}</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-full bg-[#8b5cf6]" aria-hidden />{L({ ko: "크레딧", en: "Credits" })}</span>
              <span className="font-display text-base font-bold text-fg">{tip.credits.toLocaleString()}</span>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AreaBars({ areas }: { areas: StudioActivity["areas"] }) {
  const L = useBi();
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...areas.map((a) => a.runs));
  return (
    <div className="relative">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id={`bar-${uid}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#4f5fe0" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <ul className="flex h-[168px] items-end gap-3" aria-label={L({ ko: "분야별 실행 수", en: "Runs per area" })}>
        {areas.map((a, i) => {
          const h = Math.max(6, (a.runs / max) * 132);
          return (
            <li key={a.area} className="relative flex flex-1 flex-col items-center gap-1.5" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <AnimatePresence>
                {hover === i ? (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, y: 6, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                    className="glass-strong absolute z-10 rounded-xl px-2 py-1 text-xs font-semibold whitespace-nowrap text-fg"
                    style={{ bottom: h + 30 }}
                  >
                    {L({ ko: `${a.runs}회`, en: `${a.runs} runs` })}
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <span className="font-mono text-2xs text-fg-muted">{a.runs}</span>
              <svg width="100%" height={h} className="block max-w-[44px]" aria-hidden>
                <motion.rect
                  x="0"
                  width="100%"
                  rx="8"
                  fill={a.runs ? `url(#bar-${uid})` : "currentColor"}
                  className={cn(!a.runs && "text-fg/10", hover === i && "drop-shadow-[0_0_10px_rgb(139_92_246/0.55)]")}
                  initial={reduce ? false : { height: 0, y: h }}
                  whileInView={{ height: h, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <span className="sr-only">{`${L(CATEGORIES[a.area].name)}: ${a.runs}`}</span>
              <span className="w-full truncate text-center text-[11px] text-fg-subtle" aria-hidden>{L(CATEGORIES[a.area].name)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Ring({ left, of }: { left: number; of: number }) {
  const L = useBi();
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, left / Math.max(1, of)));
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 128 128" className="size-[124px] shrink-0 -rotate-90" role="img" aria-label={L({ ko: `플랜 크레딧 ${of.toLocaleString()} 중 ${left.toLocaleString()} 남음`, en: `${left.toLocaleString()} of ${of.toLocaleString()} plan credits left` })}>
        <defs>
          <linearGradient id={`ring-${uid}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-fg/8" />
        <motion.circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke={`url(#ring-${uid})`} strokeDasharray={c} initial={reduce ? false : { strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - pct) }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div>
        <p className="font-display text-3xl font-bold text-fg">{Math.round(pct * 100)}%</p>
        <p className="text-xs break-keep text-fg-muted">{L({ ko: `플랜 크레딧 ${of.toLocaleString()} 중 ${left.toLocaleString()} 남음`, en: `${left.toLocaleString()} of ${of.toLocaleString()} plan credits left` })}</p>
      </div>
    </div>
  );
}

export function ActivityPanel({ activity }: { activity: StudioActivity }) {
  const L = useBi();
  const reduce = useReducedMotion();
  const runs = activity.days.reduce((s, d) => s + d.runs, 0);
  const credits = activity.days.reduce((s, d) => s + d.credits, 0);
  const runDelta = useMemo(() => halfOverHalf(activity.days.map((d) => d.runs)), [activity.days]);
  const top = [...activity.areas].sort((a, b) => b.runs - a.runs)[0];
  const pop = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14, scale: 0.96 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, margin: "-40px" }, transition: { type: "spring" as const, stiffness: 260, damping: 24, delay } };

  return (
    <section aria-labelledby="activity" className="mt-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="activity" className="flex items-center gap-2 font-display text-xl font-bold text-fg">
          <Activity size={18} className="text-accent" aria-hidden /> {L({ ko: "최근 30일 활동", en: "Last 30 days" })}
        </h2>
        <p className="flex items-center gap-3 text-2xs text-fg-subtle">
          <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-[#14b8a6]" aria-hidden />{L({ ko: "실행", en: "Runs" })}</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-[#8b5cf6]" aria-hidden />{L({ ko: "크레딧", en: "Credits" })}</span>
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <motion.div {...pop(0)} className="glass relative overflow-hidden rounded-[26px] p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-3xl font-bold text-fg">{runs.toLocaleString()}</p>
            <p className="text-sm text-fg-muted">{L({ ko: "번 완료", en: "finished runs" })}</p>
            <Delta value={runDelta} />
            <p className="ml-auto flex items-center gap-1 text-sm text-fg-muted">
              <Coins size={14} className="text-[#8b5cf6]" aria-hidden /> {L({ ko: `${credits.toLocaleString()} 크레딧 사용`, en: `${credits.toLocaleString()} credits used` })}
            </p>
          </div>
          <div className="mt-3">
            {runs ? (
              <LineChart days={activity.days} />
            ) : (
              <p className="grid aspect-[640/300] place-items-center rounded-2xl border border-dashed border-hairline-str text-sm break-keep text-fg-muted">
                {L({ ko: "아직 30일 안에 끝난 실행이 없어요. 첫 결과를 만들면 여기에 그래프가 그려져요.", en: "No finished runs in the last 30 days yet. Your first result starts the chart." })}
              </p>
            )}
          </div>
        </motion.div>
        <div className="grid gap-4">
          <motion.div {...pop(0.08)} className="glass rounded-[26px] p-5">
            <p className="text-sm font-semibold text-fg">{L({ ko: "분야별 실행", en: "Runs by area" })}</p>
            <div className="mt-3">
              <AreaBars areas={activity.areas} />
            </div>
          </motion.div>
          {activity.ring ? (
            <motion.div {...pop(0.16)} className="glass rounded-[26px] p-5">
              <Ring left={activity.ring.left} of={activity.ring.of} />
            </motion.div>
          ) : null}
        </div>
      </div>
      {/* A floating glass stat card, as in the reference: the area used most. */}
      {top && top.runs > 0 ? (
        <motion.p
          {...(reduce ? {} : { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { delay: 0.5, duration: 0.5 } })}
          className="glass-strong mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-fg-muted"
        >
          <span className="size-2 animate-pulse rounded-full bg-[#14b8a6]" aria-hidden />
          {L({ ko: `가장 많이 쓴 분야: ${L(CATEGORIES[top.area].name)} · ${Math.round((top.runs / Math.max(1, runs)) * 100)}%`, en: `Most used area: ${L(CATEGORIES[top.area].name)} · ${Math.round((top.runs / Math.max(1, runs)) * 100)}%` })}
        </motion.p>
      ) : null}
    </section>
  );
}
