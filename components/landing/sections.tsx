"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  catalogTool,
  toolsIn,
} from "@/lib/tools/catalog";
import { BEFORE_AFTER, FLOW, PERSONAS, STEPS } from "@/lib/site/landing";
import { useBi } from "@/lib/i18n/context";
import type { CategoryId } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

export const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export function SectionHead({
  kicker,
  title,
  body,
  className,
}: {
  kicker: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <motion.div {...reveal} className={cn("max-w-2xl", className)}>
      <p className="text-sm font-semibold text-accent">{kicker}</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg">
        {title}
      </h2>
      {body ? (
        <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">
          {body}
        </p>
      ) : null}
    </motion.div>
  );
}

function ToolLink({ slug, compact }: { slug: string; compact?: boolean }) {
  const L = useBi();
  const t = catalogTool(slug)!;
  return (
    <Link
      href={`/tools/${t.slug}`}
      className="group flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-3.5 transition-colors hover:border-accent/40"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-dim text-accent">
        <t.icon size={16} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold break-keep text-fg">
          {L(t.name)}{" "}
          <ArrowRight
            size={12}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </span>
        {compact ? null : (
          <span className="mt-0.5 block text-xs leading-relaxed break-keep text-fg-muted">
            {L(t.promise)}
          </span>
        )}
      </span>
    </Link>
  );
}

/* ── The flow: five stages, every tool once ────────────────────────── */

/**
 * Every stage's photo is stacked in one frame and crossfaded, so switching
 * tabs never waits on a download. A stage without a photo gets a drawn
 * backdrop in the accent colour instead.
 */
function StagePhoto({ active }: { active: number }) {
  const L = useBi();
  const stage = FLOW[active];
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[#1a1410] lg:aspect-auto lg:min-h-[460px]">
      {FLOW.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== active}
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
            i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
          )}
        >
          {s.image ? (
            <Image
              src={s.image.src}
              alt={i === active ? L(s.image.alt) : ""}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,var(--color-accent)_0%,transparent_55%),radial-gradient(90%_80%_at_90%_90%,#f2b27a_0%,transparent_60%),linear-gradient(160deg,#2a1d14,#120d0a)]">
              <span className="absolute -right-6 -bottom-10 font-display text-[clamp(7rem,16vw,12rem)] leading-none font-black tracking-[-0.05em] text-white/10">
                {s.label}
              </span>
            </div>
          )}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute right-4 bottom-4 left-4 text-white md:right-6 md:bottom-6 md:left-6">
        <p className="font-mono text-[11px] tracking-wider text-white/75">
          {String(active + 1).padStart(2, "0")} · {stage.label}
        </p>
        <p className="mt-1 font-display text-[clamp(1.4rem,2.6vw,2rem)] leading-tight font-bold tracking-[-0.02em] break-keep">
          {L(stage.title)}
        </p>
      </div>
    </div>
  );
}

export function FlowSection() {
  const L = useBi();
  const [active, setActive] = useState(0);
  const stage = FLOW[active];
  return (
    <section
      id="flow"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "아이디어부터 성장까지", en: "From idea to growth" })}
        title={L({
          ko: "사업의 순서대로 놓인 25개 도구",
          en: "25 tools, laid out in the order a business happens",
        })}
        body={L({
          ko: "어느 단계에서 시작해도 돼요. 앞 단계의 결과가 있으면 다음 도구가 그걸 이어받아요.",
          en: "Start at any stage. Whatever earlier stages produced, the next tool picks up.",
        })}
      />
      <div
        role="tablist"
        aria-label={L({ ko: "단계", en: "Stages" })}
        className="mt-10 grid grid-cols-2 gap-1.5 sm:grid-cols-5"
      >
        {FLOW.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`flow-tab-${s.id}`}
            aria-selected={i === active}
            aria-controls="flow-panel"
            onClick={() => setActive(i)}
            className={cn(
              "relative rounded-2xl border px-3 py-3 text-left transition-colors",
              i === active
                ? "border-accent bg-accent text-white"
                : "border-hairline bg-surface text-fg hover:border-accent/40",
            )}
          >
            <span
              className={cn(
                "block font-mono text-[11px] tracking-wider",
                i === active ? "text-white" : "text-fg-subtle",
              )}
            >
              {String(i + 1).padStart(2, "0")} · {s.label}
            </span>
            <span className="mt-1 block text-sm font-semibold break-keep">
              {L(s.title)}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-2xs",
                i === active ? "text-white" : "text-fg-subtle",
              )}
            >
              {L({
                ko: `도구 ${s.tools.length}개`,
                en: `${s.tools.length} tools`,
              })}
            </span>
          </button>
        ))}
      </div>
      <div
        id="flow-panel"
        role="tabpanel"
        aria-labelledby={`flow-tab-${stage.id}`}
        className="mt-4 grid overflow-hidden rounded-[24px] border border-hairline bg-surface-2/50 lg:grid-cols-[1.15fr_1fr]"
      >
        <StagePhoto active={active} />
        <div className="p-4 md:p-6">
          <p className="max-w-2xl text-sm leading-relaxed break-keep text-fg-muted">
            {L(stage.body)}
          </p>
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
          >
            {stage.tools.map((slug) => (
              <ToolLink key={slug} slug={slug} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Five categories, five pictures ────────────────────────────────── */

function DiscoverArt() {
  return (
    <div className="space-y-1.5" aria-hidden>
      {[82, 64, 58].map((v, i) => (
        <div key={v} className="flex items-center gap-2">
          <span className="w-6 font-mono text-[10px] text-fg-subtle">{v}</span>
          <div className="h-2 flex-1 rounded-full bg-fg/8">
            <div
              className={cn(
                "h-full rounded-full",
                i === 0 ? "bg-accent" : "bg-fg-subtle/50",
              )}
              style={{ width: `${v}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
function BrandArt() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="flex h-12 flex-1 overflow-hidden rounded-xl">
        {["#F3EBDD", "#8A5A2B", "#1F1B16", "#5E8C7A", "#D9622B"].map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <span
        className="text-3xl leading-none font-semibold text-fg"
        style={{ fontFamily: "serif" }}
      >
        Aa
      </span>
    </div>
  );
}
function CampaignArt() {
  return (
    <div className="relative h-14" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-xl border border-hairline bg-surface px-2.5 py-1.5 shadow-sm"
          style={{
            left: `${i * 22}%`,
            top: `${i * 6}px`,
            transform: `rotate(${(i - 1) * 4}deg)`,
            width: "52%",
          }}
        >
          <div className="h-1 w-8 rounded-full bg-accent/70" />
          <div className="mt-1.5 h-1 rounded-full bg-fg/15" />
          <div className="mt-1 h-1 w-2/3 rounded-full bg-fg/10" />
        </div>
      ))}
    </div>
  );
}
function OperateArt() {
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-hidden>
      {[3, 2, 1].map((n, c) => (
        <div key={c} className="space-y-1 rounded-lg bg-fg/5 p-1.5">
          {Array.from({ length: n }).map((_, k) => (
            <div
              key={k}
              className={cn(
                "h-3 rounded",
                c === 2 ? "bg-grounded/40" : "bg-surface",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
function ResearchArt() {
  return (
    <div
      className="relative h-14 rounded-lg border border-dashed border-hairline-str"
      aria-hidden
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-hairline-str" />
      <span className="absolute inset-y-0 left-1/2 w-px bg-hairline-str" />
      {[
        [18, 30],
        [70, 22],
        [40, 70],
        [82, 66],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute size-2 -translate-1/2 rounded-full bg-fg-subtle/70"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
      <span
        className="absolute size-3 -translate-1/2 rounded-full bg-accent ring-4 ring-accent/20"
        style={{ left: "74%", top: "78%" }}
      />
    </div>
  );
}
const ART: Record<CategoryId, () => React.ReactElement> = {
  discover: DiscoverArt,
  brand: BrandArt,
  campaign: CampaignArt,
  operate: OperateArt,
  research: ResearchArt,
};

export function CategorySection() {
  const L = useBi();
  return (
    <section
      id="tools"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "다섯 분야", en: "Five areas" })}
        title={L({
          ko: "도구마다 결과 화면이 달라요",
          en: "Every tool has its own result screen",
        })}
        body={L({
          ko: "점수표, 브랜드 보드, 훅 카드, 칸반, 포지셔닝 맵. 25개의 같은 입력창이 아니라 일에 맞는 화면이에요.",
          en: "Score tables, brand boards, hook cards, kanban, positioning maps — screens that fit the job, not 25 copies of one form.",
        })}
      />
      <div className="mt-10 grid gap-3 md:grid-cols-6">
        {CATEGORY_ORDER.map((id, i) => {
          const Art = ART[id];
          const tools = toolsIn(id).filter((t) => !t.hidden);
          return (
            <motion.div
              key={id}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.05 }}
              className={cn(i < 2 ? "md:col-span-3" : "md:col-span-2")}
            >
              <Link
                href={`/tools?category=${id}`}
                className="group flex h-full flex-col rounded-[24px] border border-hairline bg-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-accent/40"
              >
                <Art />
                <p className="mt-5 text-lg font-semibold break-keep text-fg">
                  {L(CATEGORIES[id].name)}
                </p>
                <p className="mt-1 text-sm break-keep text-fg-muted">
                  {L(CATEGORIES[id].pitch)}
                </p>
                <p className="mt-4 text-2xs leading-relaxed break-keep text-fg-subtle">
                  {tools.map((t) => L(t.name)).join(" · ")}
                </p>
                <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-medium text-accent">
                  {L({
                    ko: `도구 ${tools.length}개 보기`,
                    en: `See ${tools.length} tools`,
                  })}{" "}
                  <ArrowRight
                    size={12}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ── How it works ──────────────────────────────────────────────────── */

export function StepsSection() {
  const L = useBi();
  return (
    <section
      id="how"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "사용 방법", en: "How it works" })}
        title={L({
          ko: "다섯 단계, 한 번 정한 건 다시 묻지 않아요",
          en: "Five steps — and nothing you've settled gets asked twice",
        })}
      />
      <ol className="mt-10 grid gap-3 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title.en}
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.06 }}
            className="relative rounded-[22px] border border-hairline bg-surface p-5"
          >
            <span className="font-mono text-xs text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-3 font-semibold break-keep text-fg">
              {L(s.title)}
            </p>
            <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
              {L(s.body)}
            </p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

/* ── Before / after: a real run ────────────────────────────────────── */

function Unsure({ text }: { text: string }) {
  return (
    <span className="rounded bg-warn/15 px-1 text-[11px] text-fg">{text}</span>
  );
}

export function BeforeAfterSection() {
  const L = useBi();
  const { before, after } = BEFORE_AFTER;
  const tool = catalogTool(BEFORE_AFTER.tool)!;
  const won = (n: number) =>
    L({
      ko: `${n.toLocaleString("ko-KR")}원`,
      en: `₩${n.toLocaleString("en-US")}`,
    });
  return (
    <section
      id="example"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "실제 결과", en: "A real result" })}
        title={L({
          ko: "다섯 줄의 입력이 팔 수 있는 제안이 되기까지",
          en: "Five lines in, an offer you can sell out",
        })}
        body={L({
          ko: `${tool.name.ko}를 실제로 실행한 결과에서 일부를 옮겼어요. 모르는 건 지어내지 않고 '확인 필요'로 남겨요.`,
          en: `An excerpt from a real ${tool.name.en} run. What it couldn't know, it marks "needs checking" instead of inventing.`,
        })}
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-[0.8fr_auto_1.2fr] lg:items-stretch">
        <motion.div
          {...reveal}
          className="rounded-[24px] border border-hairline bg-surface-2/60 p-5"
        >
          <p className="text-xs font-semibold text-fg-subtle">
            {L({ ko: "입력", en: "Input" })}
          </p>
          <dl className="mt-3 space-y-3">
            {before.map((f) => (
              <div key={f.label.en}>
                <dt className="text-2xs text-fg-subtle">{L(f.label)}</dt>
                <dd className="mt-0.5 text-sm break-keep text-fg">
                  {L(f.value)}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
        <div className="hidden items-center lg:flex" aria-hidden>
          <span className="grid size-10 place-items-center rounded-full bg-accent text-white">
            <ArrowRight size={18} />
          </span>
        </div>
        <motion.div
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.1 }}
          className="rounded-[24px] border border-hairline bg-surface p-5 shadow-[0_24px_60px_-40px_rgba(43,30,18,0.5)]"
        >
          <p className="text-xs font-semibold text-accent">
            {L({ ko: "결과 (발췌)", en: "Result (excerpt)" })}
          </p>
          <p className="mt-3 text-2xs text-fg-subtle">{L(after.offerName)}</p>
          <p className="mt-1 text-xl leading-snug font-bold break-keep text-fg">
            {L(after.headline)}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {after.packages.map((p, i) => (
              <div
                key={p.name.en}
                className={cn(
                  "rounded-2xl border p-3",
                  i === 1
                    ? "border-accent/50 bg-accent-dim"
                    : "border-hairline",
                )}
              >
                <p className="text-xs font-semibold break-keep text-fg">
                  {L(p.name)}
                </p>
                <p className="mt-1 font-mono text-sm text-fg">{won(p.price)}</p>
                <p className="mt-1.5 text-2xs leading-relaxed break-keep text-fg-muted">
                  {L(p.bestFor)}
                </p>
                {p.note ? (
                  <p className="mt-1.5">
                    <Unsure text={L(p.note)} />
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed break-keep text-fg-muted">
            <ShieldCheck
              size={14}
              className="mt-0.5 shrink-0 text-grounded"
              aria-hidden
            />{" "}
            {L(after.guarantee)}
          </p>
          <p className="mt-3 text-2xs text-fg-subtle">
            {L({
              ko: "이 밖에 가치 목록, 보너스, 반론 대응, 판매 문구, CTA가 함께 나와요.",
              en: "Also in the result: value stack, bonuses, objection handling, sales copy and CTA.",
            })}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Personas ──────────────────────────────────────────────────────── */

export function PersonasSection() {
  const L = useBi();
  return (
    <section
      id="who"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "이런 분께", en: "Who it's for" })}
        title={L({
          ko: "혼자 혹은 작은 팀으로 사업하는 사람",
          en: "People running a business alone or with a small team",
        })}
      />
      <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {PERSONAS.map((p, i) => (
          <motion.article
            key={p.id}
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.05 }}
            className="flex flex-col rounded-[22px] border border-hairline bg-surface p-5"
          >
            <p className="font-semibold break-keep text-fg">{L(p.who)}</p>
            <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
              &ldquo;{L(p.pain)}&rdquo;
            </p>
            <ul className="mt-4 space-y-1.5">
              {p.tools.map((slug) => {
                const t = catalogTool(slug)!;
                return (
                  <li key={slug}>
                    <Link
                      href={`/tools/${t.slug}`}
                      className="flex items-center gap-2 text-xs text-fg hover:text-accent"
                    >
                      <t.icon
                        size={13}
                        className="shrink-0 text-accent"
                        aria-hidden
                      />{" "}
                      <span className="break-keep">{L(t.name)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
