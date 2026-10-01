"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Gift, GraduationCap, KeyRound, Sparkles, Wand2 } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { CATEGORIES, CATEGORY_ORDER, catalogTool, toolsIn } from "@/lib/tools/catalog";
import type { CategoryId } from "@/lib/tools/types";
import { PATCH_NOTES } from "@/lib/site/patch-notes";
import { REFERRAL } from "@/lib/referral";
import { cn } from "@/lib/utils";

// The Studio's richer home: an animated hero around the one-input
// composer, the five areas with their tools, ready-made workflows, a
// gallery of what the tools make, and a rotating strip of what's new
// and what's free. Motion respects reduced-motion settings.

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts children in, one after another. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A number that counts up once when it appears. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span className={className}>{shown.toLocaleString("en-US")}</span>;
}

/** The hero's moving backdrop: soft color fields drifting behind the composer. */
export function HeroBackdrop() {
  const reduce = useReducedMotion();
  const orb = (cls: string, x: number[], y: number[], d: number) => (
    <motion.span
      aria-hidden
      className={cn("absolute rounded-full blur-3xl", cls)}
      animate={reduce ? undefined : { x, y }}
      transition={{ duration: d, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_srgb,var(--color-accent)_16%,transparent),transparent_60%)]" />
      {orb("-top-24 -left-16 size-72 bg-accent/25", [0, 60, -20], [0, 30, 10], 14)}
      {orb("top-10 right-[-60px] size-80 bg-studio-cyan/20", [0, -50, 20], [0, 40, -10], 17)}
      {orb("bottom-[-80px] left-1/3 size-72 bg-studio-violet/20", [0, 40, -30], [0, -30, 0], 19)}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-fg)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-fg)_5%,transparent)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
    </div>
  );
}

/** Rotating example requests for the composer's placeholder. */
export function useRotatingExample(examples: string[], ms = 3200): string {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || examples.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % examples.length), ms);
    return () => clearInterval(t);
  }, [examples.length, ms, reduce]);
  return examples[i] ?? "";
}

// ── What's new and what's free ─────────────────────────────────────────

export function PromoStrip() {
  const L = useBi();
  const reduce = useReducedMotion();
  const latest = PATCH_NOTES[0];
  const promos = [
    {
      icon: Sparkles,
      tone: "from-accent/15 to-studio-violet/10",
      kicker: { ko: `새 기능 · ${latest.version}`, en: `New · ${latest.version}` },
      title: latest.title,
      href: "/help/whats-new",
      cta: { ko: "무엇이 바뀌었나", en: "What changed" },
    },
    {
      icon: Gift,
      tone: "from-studio-cyan/15 to-accent/10",
      kicker: { ko: "친구 초대", en: "Invite friends" },
      title: { ko: `친구가 첫 결과를 만들면 나는 ${REFERRAL.referrerBonus} 크레딧`, en: `${REFERRAL.referrerBonus} credits when a friend makes their first result` },
      href: "/account/referral",
      cta: { ko: "초대 링크 받기", en: "Get my link" },
    },
    {
      icon: GraduationCap,
      tone: "from-studio-violet/15 to-studio-cyan/10",
      kicker: { ko: "학생 멤버십", en: "Students" },
      title: { ko: "재학 인증하면 모든 도구를 크레딧 제한 없이", en: "Verify once, use every tool without credit limits" },
      href: "/account/membership",
      cta: { ko: "인증하기", en: "Verify" },
    },
    {
      icon: KeyRound,
      tone: "from-accent/10 to-studio-cyan/15",
      kicker: { ko: "내 API 키", en: "Your own API key" },
      title: { ko: "Gemini 키를 연결하면 실행할 때 크레딧이 들지 않아요", en: "Connect a Gemini key and runs cost no credits" },
      href: "/account/api-key",
      cta: { ko: "연결하기", en: "Connect" },
    },
  ];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % promos.length), 5200);
    return () => clearInterval(t);
  }, [reduce, paused, promos.length]);
  const p = promos[i];
  return (
    <section
      aria-label={L({ ko: "소식과 혜택", en: "News and perks" })}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn("relative overflow-hidden rounded-[22px] border border-hairline bg-gradient-to-r p-4 transition-colors duration-700", p.tone)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-sm">
            <p.icon size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-semibold tracking-wide text-accent">{L(p.kicker)}</span>
            <span className="block text-sm font-semibold break-keep text-fg">{L(p.title)}</span>
          </span>
          <Link href={p.href} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg shadow-sm hover:text-accent">
            {L(p.cta)} <ArrowRight size={12} aria-hidden />
          </Link>
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex gap-1.5" role="tablist" aria-label={L({ ko: "소식 넘기기", en: "Switch item" })}>
        {promos.map((_, n) => (
          <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`${n + 1}`} onClick={() => setI(n)} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-6 bg-accent" : "w-1.5 bg-fg/20")} />
        ))}
      </div>
    </section>
  );
}

// ── The five areas ─────────────────────────────────────────────────────

const AREA_TONE: Record<CategoryId, string> = {
  discover: "from-amber-400/25 via-orange-400/10",
  brand: "from-rose-400/25 via-pink-400/10",
  campaign: "from-violet-400/25 via-indigo-400/10",
  operate: "from-sky-400/25 via-cyan-400/10",
  research: "from-emerald-400/25 via-teal-400/10",
};

export function CategoryRail() {
  const L = useBi();
  const total = CATEGORY_ORDER.reduce((n, c) => n + toolsIn(c).length, 0);
  return (
    <section aria-labelledby="areas">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="areas" className="font-display text-xl font-bold text-fg">
            {L({ ko: `${total}개 도구, 5개 분야`, en: `${total} tools in 5 areas` })}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">{L({ ko: "아이디어부터 매출, 운영까지 — 결과가 다음 도구로 이어져요", en: "From the idea to revenue and operations — each result carries into the next tool" })}</p>
        </div>
        <Link href="/tools" className="text-xs font-semibold text-accent hover:underline">
          {L({ ko: "전체 보기", en: "See all" })}
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORY_ORDER.map((c, i) => {
          const tools = toolsIn(c);
          const Lead = tools[0]?.icon;
          return (
            <Reveal key={c} delay={i * 0.06}>
              <Link href={`/tools?category=${c}`} className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-hairline bg-surface p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)]">
                <span className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80 transition-opacity group-hover:opacity-100", AREA_TONE[c])} aria-hidden />
                <span className="relative flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface/80 text-fg shadow-sm backdrop-blur">{Lead ? <Lead size={18} aria-hidden /> : null}</span>
                  <span className="rounded-full bg-surface/80 px-2 py-0.5 font-mono text-2xs text-fg-muted">{tools.length}</span>
                </span>
                <span className="relative mt-4 text-sm font-bold break-keep text-fg">{L(CATEGORIES[c].name)}</span>
                <span className="relative mt-1 text-xs leading-relaxed break-keep text-fg-muted">{L(CATEGORIES[c].pitch)}</span>
                <span className="relative mt-3 flex flex-wrap gap-1">
                  {tools.slice(0, 3).map((t) => (
                    <span key={t.slug} className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] text-fg">
                      {L(t.name)}
                    </span>
                  ))}
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

// ── Ready-made workflows ───────────────────────────────────────────────

const FLOWS: { name: { ko: string; en: string }; pitch: { ko: string; en: string }; steps: string[] }[] = [
  { name: { ko: "가게 오픈 패키지", en: "Opening a shop" }, pitch: { ko: "브랜드부터 첫 광고까지 한 번에 이어서", en: "Brand to first ad, one hand-off at a time" }, steps: ["brand-dna", "logo-lab", "sales-page", "ad-factory"] },
  { name: { ko: "투자·지원사업 준비", en: "Funding-ready" }, pitch: { ko: "시장 근거로 계획서와 발표자료까지", en: "Market evidence into a plan and a deck" }, steps: ["market-desk", "doc-studio", "pitch-director"] },
  { name: { ko: "캠페인 런칭", en: "Campaign launch" }, pitch: { ko: "트렌드를 캠페인과 콘텐츠로", en: "Trends into a campaign and its content" }, steps: ["trend-radar", "campaign-planner", "hook-lab", "content-transformer"] },
];

export function WorkflowShowcase({ projectId }: { projectId?: string }) {
  const L = useBi();
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="flows">
      <h2 id="flows" className="font-display text-xl font-bold text-fg">
        {L({ ko: "추천 작업 흐름", en: "Workflows that work" })}
      </h2>
      <p className="mt-1 text-sm text-fg-muted">{L({ ko: "앞 도구의 결과가 다음 도구의 입력을 채워요. 첫 단계부터 시작해 보세요.", en: "Each result fills the next tool's inputs. Start with the first step." })}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {FLOWS.map((f, i) => (
          <Reveal key={f.name.en} delay={i * 0.08}>
            <div className="flex h-full flex-col rounded-[22px] border border-hairline bg-surface p-4">
              <p className="text-sm font-bold text-fg">{L(f.name)}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{L(f.pitch)}</p>
              <ol className="relative mt-4 flex flex-col gap-2">
                <motion.span
                  aria-hidden
                  className="absolute top-3 bottom-3 left-[15px] w-px origin-top bg-gradient-to-b from-accent to-accent/10"
                  initial={reduce ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: EASE }}
                />
                {f.steps.map((slug, n) => {
                  const t = catalogTool(slug);
                  if (!t) return null;
                  return (
                    <li key={slug} className="relative">
                      <Link href={`/tools/${slug}/run${projectId ? `?project=${projectId}` : ""}`} className="group flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-surface-2">
                        <span className="relative z-10 grid size-[30px] shrink-0 place-items-center rounded-full border border-hairline bg-surface text-accent">
                          <t.icon size={14} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-2xs text-fg-subtle">{L({ ko: `${n + 1}단계`, en: `Step ${n + 1}` })}</span>
                          <span className="block truncate text-sm font-semibold text-fg">{L(t.name)}</span>
                        </span>
                        <ArrowRight size={14} className="text-fg-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── What the tools make (illustrated) ──────────────────────────────────

function DeckArt() {
  return (
    <svg viewBox="0 0 240 150" className="size-full" aria-hidden>
      <rect width="240" height="150" fill="#14161a" />
      <rect x="16" y="18" width="70" height="6" rx="3" fill="#7c8cff" />
      <rect x="16" y="32" width="130" height="12" rx="3" fill="#f2f2f2" />
      <rect x="16" y="50" width="100" height="12" rx="3" fill="#f2f2f2" opacity=".7" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={140 + i * 18} y={120 - (i + 2) * 12} width="12" height={(i + 2) * 12} rx="2" fill={i === 4 ? "#ff8a4c" : "#7c8cff"} opacity={0.5 + i * 0.1} />
      ))}
      <rect x="16" y="104" width="60" height="22" rx="6" fill="#ff8a4c" />
    </svg>
  );
}

function LogoArt() {
  const marks = ["#e4572e", "#2e86ab", "#1b998b", "#6c4ab6"];
  return (
    <svg viewBox="0 0 240 150" className="size-full" aria-hidden>
      <rect width="240" height="150" fill="#faf7f2" />
      {marks.map((c, i) => (
        <g key={c} transform={`translate(${14 + i * 56} 32)`}>
          <rect width="48" height="64" rx="8" fill="#fff" stroke="#e6e0d6" />
          {i === 0 ? <circle cx="24" cy="26" r="13" fill={c} /> : i === 1 ? <rect x="12" y="14" width="24" height="24" rx="6" fill={c} transform="rotate(45 24 26)" /> : i === 2 ? <path d="M12 38 L24 12 L36 38 Z" fill={c} /> : <path d="M12 14 h24 v8 h-16 v16 h-8 z" fill={c} />}
          <rect x="10" y="48" width="28" height="4" rx="2" fill="#2a2a2a" opacity=".7" />
        </g>
      ))}
    </svg>
  );
}

function ReportArt() {
  return (
    <svg viewBox="0 0 240 150" className="size-full" aria-hidden>
      <rect width="240" height="150" fill="#f4f7fb" />
      <rect x="14" y="14" width="212" height="26" rx="6" fill="#1f4e79" />
      <rect x="22" y="23" width="80" height="8" rx="3" fill="#fff" opacity=".9" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={14 + i * 72} y="48" width="64" height="34" rx="6" fill="#fff" stroke="#dde5ef" />
          <rect x={22 + i * 72} y="56" width="30" height="5" rx="2" fill="#9fb3c8" />
          <rect x={22 + i * 72} y="66" width="40" height="9" rx="2" fill="#1f4e79" />
        </g>
      ))}
      <polyline points="20,134 60,118 100,124 140,102 180,108 220,90" fill="none" stroke="#2f80ed" strokeWidth="3" strokeLinecap="round" />
      <rect x="14" y="88" width="212" height="1" fill="#dde5ef" />
    </svg>
  );
}

function SiteArt() {
  return (
    <svg viewBox="0 0 240 150" className="size-full" aria-hidden>
      <rect width="240" height="150" fill="#0f1720" />
      <rect x="0" y="0" width="240" height="14" fill="#1c2733" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={10 + i * 9} cy="7" r="2.5" fill={["#ff5f57", "#febc2e", "#28c840"][i]} />
      ))}
      <rect x="20" y="34" width="110" height="14" rx="3" fill="#e9f1ff" />
      <rect x="20" y="54" width="80" height="8" rx="3" fill="#8aa4c2" />
      <rect x="20" y="72" width="54" height="18" rx="9" fill="#3dd6b5" />
      <circle cx="182" cy="66" r="34" fill="url(#g)" />
      <defs>
        <radialGradient id="g">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#3dd6b5" stopOpacity=".2" />
        </radialGradient>
      </defs>
      <rect x="20" y="108" width="200" height="26" rx="6" fill="#1c2733" />
    </svg>
  );
}

const GALLERY: { slug: string; art: React.ReactNode | "photo"; caption: { ko: string; en: string } }[] = [
  { slug: "ad-factory", art: "photo", caption: { ko: "캠페인 광고 이미지와 카피", en: "Campaign visuals and copy" } },
  { slug: "pitch-director", art: <DeckArt />, caption: { ko: "주장이 서는 발표 자료", en: "Decks that make a case" } },
  { slug: "logo-lab", art: <LogoArt />, caption: { ko: "서로 다른 로고 방향 4가지", en: "Four distinct logo directions" } },
  { slug: "doc-studio", art: <ReportArt />, caption: { ko: "숫자가 맞는 사업계획서", en: "Business plans whose numbers add up" } },
  { slug: "web-builder", art: <SiteArt />, caption: { ko: "바로 띄우는 홈페이지", en: "Sites you can publish" } },
];

export function ResultGallery() {
  const L = useBi();
  return (
    <section aria-labelledby="gallery">
      <h2 id="gallery" className="font-display text-xl font-bold text-fg">
        {L({ ko: "이런 결과를 만들어요", en: "What you can make" })}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GALLERY.map((g, i) => {
          const t = catalogTool(g.slug);
          if (!t) return null;
          return (
            <Reveal key={g.slug} delay={i * 0.07}>
              <Link href={`/tools/${g.slug}`} className="group block overflow-hidden rounded-[22px] border border-hairline bg-surface">
                <div className="relative aspect-[8/5] overflow-hidden">
                  <motion.div className="size-full" whileHover={{ scale: 1.06 }} transition={{ duration: 0.5, ease: EASE }}>
                    {g.art === "photo" ? <Image src="/images/spring-campaign.jpg" alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" /> : g.art}
                  </motion.div>
                  <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">{L({ ko: "예시", en: "Example" })}</span>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{L(t.name)}</span>
                    <span className="block truncate text-xs text-fg-muted">{L(g.caption)}</span>
                  </span>
                  <Wand2 size={14} className="shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
