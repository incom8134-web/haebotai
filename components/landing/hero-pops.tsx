"use client";

import { motion, useReducedMotion } from "motion/react";
import { useBi } from "@/lib/i18n/context";

// Glass chart cards that pop out around the hero mock and float, after
// the owner's reference video. They repeat the mock's own example (the
// 82-point idea) and mark the trend line as an estimate, like the
// product does. Decorative: the mock itself carries the content.

const SPARK = "M2,38 C14,34 18,22 30,24 C42,26 46,12 58,14 C70,16 74,6 86,4";
const SPARK2 = "M2,40 C14,38 20,32 30,33 C42,34 48,26 58,27 C70,28 76,20 86,18";

export function HeroPops() {
  const L = useBi();
  const reduce = useReducedMotion();
  const float = (d: number, y = 8) => (reduce ? {} : { animate: { y: [0, -y, 0] }, transition: { duration: d, repeat: Infinity, ease: "easeInOut" as const } });
  const pop = (delay: number) => (reduce ? {} : { initial: { opacity: 0, scale: 0.6, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { type: "spring" as const, stiffness: 260, damping: 18, delay } });
  const c = 2 * Math.PI * 18;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 max-lg:hidden">
      {/* Trend card, top right */}
      <motion.div {...pop(0.7)} className="absolute -top-10 -right-6">
        <motion.div {...float(5.5)} className="glass-strong w-[168px] rounded-2xl p-3 shadow-[0_24px_50px_-24px_rgb(79_95_224/0.55)]">
          <p className="flex items-center justify-between text-[10px] text-fg-muted">
            {L({ ko: "예상 반응", en: "Expected interest" })}
            <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[9px] font-semibold text-amber-700 dark:text-amber-300">{L({ ko: "추정", en: "Est." })}</span>
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-fg">+23%</p>
          <svg viewBox="0 0 88 44" className="mt-1 h-10 w-full overflow-visible">
            <defs>
              <linearGradient id="hp-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${SPARK} L86,44 L2,44 Z`} fill="url(#hp-fill)" />
            <path d={SPARK2} fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
            <motion.path d={SPARK} fill="none" stroke="#14b8a6" strokeWidth="2.4" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 1 }} />
            <circle cx="86" cy="4" r="3.2" fill="#14b8a6" className="stroke-surface" strokeWidth="1.5" />
          </svg>
        </motion.div>
      </motion.div>
      {/* Score ring, bottom left */}
      <motion.div {...pop(0.95)} className="absolute -bottom-8 -left-10">
        <motion.div {...float(6.5, 10)} className="glass-strong flex items-center gap-2.5 rounded-2xl p-3 pr-4 shadow-[0_24px_50px_-24px_rgb(124_58_237/0.55)]">
          <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
            <defs>
              <linearGradient id="hp-ring" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-fg/10" />
            <motion.circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" strokeLinecap="round" stroke="url(#hp-ring)" strokeDasharray={c} initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * 0.18 }} transition={{ duration: 1.3, delay: 1.2 }} />
          </svg>
          <span>
            <span className="block font-display text-base leading-tight font-bold text-fg">82</span>
            <span className="block text-[10px] text-fg-muted">{L({ ko: "아이디어 적합도", en: "Idea fit" })}</span>
          </span>
        </motion.div>
      </motion.div>
      {/* Mini bars, middle right */}
      <motion.div {...pop(1.2)} className="absolute top-[44%] -right-16">
        <motion.div {...float(7, 6)} className="glass-strong flex h-16 items-end gap-1 rounded-2xl px-3 pt-3 pb-2.5">
          {[0.45, 0.7, 0.55, 0.9, 0.75].map((h, i) => (
            <motion.span key={i} className="w-2 rounded-full bg-[linear-gradient(to_top,#4f5fe0,#8b5cf6,#14b8a6)]" initial={reduce ? false : { height: 0 }} animate={{ height: `${h * 40}px` }} transition={{ duration: 0.7, delay: 1.4 + i * 0.08 }} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
