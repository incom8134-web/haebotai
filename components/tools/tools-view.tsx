"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, FileCheck2, Hammer, LayoutGrid, MousePointerClick, PencilLine, Search, Star, X } from "lucide-react";
import { CATEGORIES, CATEGORY_ORDER, modesOf, publicTools, stepNumber, toolNumber, toolsIn, catalogTool, type CatalogTool } from "@/lib/tools/catalog";
import { getTool } from "@/lib/tools/registry";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { useBi } from "@/lib/i18n/context";
import type { CategoryId } from "@/lib/tools/types";
import { Page } from "@/components/site/page";
import { IconTile, PageHero, TONE } from "@/components/site/tone";
import { cn } from "@/lib/utils";

// Tool list, made to follow in order. A three-picture "how to use" strip,
// then the five steps as a map, then every tool numbered 1–16 under its
// step. A tool's other modes sit inside its card, so similar jobs live in
// one place. Search and pins stay for people who know what they want.

type Filter = { q: string; category: CategoryId | "all"; favoritesOnly: boolean };

function matches(t: CatalogTool, f: Filter, favorites: Set<string>) {
  if (f.category !== "all" && t.category !== f.category) return false;
  if (f.favoritesOnly && !favorites.has(t.engine ?? t.slug)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  // A search also finds a tool through its modes ("경쟁" finds 시장 조사하기).
  return [t, ...modesOf(t.slug)].some((x) =>
    [x.name.ko, x.name.en, x.promise.ko, x.promise.en, ...x.outputs.flatMap((o) => [o.ko, o.en])].some((s) => s.toLowerCase().includes(q)),
  );
}

function Status({ tool }: { tool: CatalogTool }) {
  const L = useBi();
  if (!tool.engine) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-2xs text-fg-muted">
        <Hammer size={11} aria-hidden /> {L({ ko: "곧 공개", en: "Coming soon" })}
      </span>
    );
  }
  const m = getTool(tool.engine);
  return m ? <span className="font-mono text-2xs text-fg-subtle">{m.estimatedCredits} {L({ ko: "크레딧", en: "cr" })} · ~{Math.round(m.estimatedSeconds / 60) || 1}{L({ ko: "분", en: "min" })}</span> : null;
}

function FavButton({ tool }: { tool: CatalogTool }) {
  const L = useBi();
  const favorites = useFavorites();
  const key = tool.engine ?? tool.slug;
  const on = favorites.has(key);
  return (
    <button
      type="button"
      onClick={() => favorites.toggle(key)}
      aria-pressed={on}
      aria-label={on ? L({ ko: `${tool.name.ko} 즐겨찾기 해제`, en: `Unpin ${tool.name.en}` }) : L({ ko: `${tool.name.ko} 즐겨찾기`, en: `Pin ${tool.name.en}` })}
      className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-lg transition-colors", on ? "text-studio-warning" : "text-fg-subtle hover:text-fg")}
    >
      <Star size={15} fill={on ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}

/** The tool's number in a coloured circle: the order to go in. */
function Num({ n, tone, size = "md" }: { n: number; tone: CategoryId; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-mono font-bold text-white",
        TONE[tone].dot,
        size === "sm" ? "size-6 text-[11px]" : size === "lg" ? "size-11 text-lg" : "size-8 text-sm",
      )}
      aria-hidden
    >
      {n}
    </span>
  );
}

/** One numbered tool. The whole card opens the tool; the star and mode links stay clickable. */
function ToolCard({ tool, compact = false }: { tool: CatalogTool; compact?: boolean }) {
  const L = useBi();
  const tone = TONE[tool.category];
  const n = toolNumber(tool.slug);
  const modes = modesOf(tool.slug);
  const title = (
    <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none">
      <span className="text-[16px] font-bold break-keep">{L(tool.name)}</span>
    </Link>
  );
  const base = cn(
    "group relative rounded-[20px] border border-hairline bg-surface transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-22px_var(--studio-violet)] focus-within:ring-2 focus-within:ring-accent/40",
    tone.hover,
  );

  if (compact) {
    return (
      <li className={cn(base, "flex items-center gap-3 p-4")}>
        <Num n={n} tone={tool.category} />
        <IconTile icon={tool.icon} tone={tool.category} />
        <div className="min-w-0 flex-1">
          {title}
          <p className="mt-0.5 text-sm leading-relaxed break-keep text-fg-muted">{L(tool.promise)}</p>
        </div>
        <FavButton tool={tool} />
      </li>
    );
  }
  return (
    <li className={cn(base, "flex flex-col p-5")}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <Num n={n} tone={tool.category} />
          <IconTile icon={tool.icon} tone={tool.category} />
        </span>
        <FavButton tool={tool} />
      </div>
      <div className="mt-4">{title}</div>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed break-keep text-fg-muted">{L(tool.promise)}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={L({ ko: "받게 될 결과", en: "What you get" })}>
        {tool.outputs.slice(0, 3).map((o) => (
          <li key={o.en} className={cn("rounded-full px-2 py-0.5 text-2xs font-medium break-keep", tone.chip)}>{L(o)}</li>
        ))}
      </ul>
      {modes.length ? (
        <div className="relative z-10 mt-3 border-t border-hairline pt-3">
          <p className="text-2xs text-fg-subtle">{L({ ko: "이 도구로 이런 것도 할 수 있어요", en: "This tool can also" })}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {modes.map((m) => (
              <Link key={m.slug} href={`/tools/${m.slug}`} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium break-keep hover:border-accent/50 hover:text-accent">
                <m.icon size={12} aria-hidden /> {L(m.name)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between">
        <Status tool={tool} />
        <ArrowRight size={16} className={cn("transition-transform group-hover:translate-x-0.5", tone.text)} aria-hidden />
      </div>
    </li>
  );
}

/** "How to use" in three pictures, drawn with the app's own pieces. */
function HowTo() {
  const L = useBi();
  const steps = [
    {
      icon: MousePointerClick,
      title: L({ ko: "도구 고르기", en: "Pick a tool" }),
      body: L({ ko: "번호 순서대로 따라가도 되고, 필요한 도구만 골라도 돼요.", en: "Go in number order, or pick only the tool you need." }),
      art: (
        <div className="grid grid-cols-3 gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn("h-7 rounded-lg border", i === 4 ? "border-accent bg-accent-dim" : "border-hairline bg-bg")} />
          ))}
        </div>
      ),
    },
    {
      icon: PencilLine,
      title: L({ ko: "평소 말하듯 적기", en: "Say it in plain words" }),
      body: L({ ko: "어려운 말 없이 원하는 것을 적으면, 모르는 칸은 비워 둬도 돼요.", en: "Write what you want in plain words; leave blank what you don't know." }),
      art: (
        <div className="rounded-lg border border-hairline bg-bg p-2" aria-hidden>
          <span className="block h-1.5 w-4/5 rounded-full bg-fg/15" />
          <span className="mt-1.5 block h-1.5 w-3/5 rounded-full bg-fg/15" />
          <span className="mt-1.5 flex items-center gap-1">
            <span className="h-1.5 w-2/5 rounded-full bg-accent/50" />
            <span className="h-3 w-0.5 animate-pulse bg-accent" />
          </span>
        </div>
      ),
    },
    {
      icon: FileCheck2,
      title: L({ ko: "결과 받고 다음 번호로", en: "Get it, then the next number" }),
      body: L({ ko: "결과는 보관함에 저장되고, 다음 도구에 내용이 미리 채워져요.", en: "Results are saved, and the next tool comes pre-filled." }),
      art: (
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="grid h-12 flex-1 place-items-center rounded-lg border border-hairline bg-bg">
            <span className="h-1.5 w-1/2 rounded-full bg-fg/15" />
          </span>
          <ArrowRight size={14} className="text-accent" />
          <span className="grid h-12 flex-1 place-items-center rounded-lg border border-dashed border-accent/60 bg-accent-dim text-xs font-bold text-accent">+1</span>
        </div>
      ),
    },
  ];
  return (
    <section aria-labelledby="howto-title" className="mt-8">
      <h2 id="howto-title" className="text-lg font-semibold">{L({ ko: "이렇게 쓰면 돼요", en: "How it works" })}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4 rounded-[20px] border border-hairline bg-surface p-4">
            <div className="w-28 shrink-0">{s.art}</div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[15px] font-bold break-keep">
                <span className="grid size-6 place-items-center rounded-full bg-fg font-mono text-xs text-bg" aria-hidden>{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed break-keep text-fg-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The five steps in a row (a column on phones), each jumping to its tools. */
function StepMap({ onPick }: { onPick: (c: CategoryId) => void }) {
  const L = useBi();
  return (
    <section aria-labelledby="steps-title" className="mt-10">
      <h2 id="steps-title" className="text-lg font-semibold">{L({ ko: "다섯 단계, 순서대로", en: "Five steps, in order" })}</h2>
      <ol className="mt-3 grid gap-2 md:grid-cols-5">
        {CATEGORY_ORDER.map((c) => {
          const tools = toolsIn(c);
          return (
            <li key={c} className="relative">
              <button
                type="button"
                onClick={() => onPick(c)}
                className={cn("flex h-full w-full flex-col rounded-[20px] border border-hairline p-4 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5", TONE[c].wash, TONE[c].hover)}
              >
                <span className="flex items-center gap-2">
                  <Num n={stepNumber(c)} tone={c} size="sm" />
                  <span className={cn("text-2xs font-bold tracking-wide", TONE[c].text)}>{L({ ko: `${stepNumber(c)}단계`, en: `Step ${stepNumber(c)}` })}</span>
                </span>
                <span className="mt-2 text-[15px] font-bold break-keep">{L(CATEGORIES[c].name)}</span>
                <span className="mt-2 space-y-0.5 text-xs text-fg-muted">
                  {tools.map((t) => (
                    <span key={t.slug} className="block break-keep">
                      <span className="font-mono">{toolNumber(t.slug)}.</span> {L(t.name)}
                    </span>
                  ))}
                </span>
              </button>
              {stepNumber(c) < CATEGORY_ORDER.length ? (
                <ArrowRight size={16} className="absolute top-1/2 -right-2.5 z-10 hidden -translate-y-1/2 rounded-full bg-bg text-fg-subtle md:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StepSection({ category }: { category: CategoryId }) {
  const L = useBi();
  const c = CATEGORIES[category];
  const tools = toolsIn(category);
  return (
    <section id={category} aria-labelledby={`cat-${category}`} className="scroll-mt-40">
      <div className="mb-4 flex items-center gap-3">
        <Num n={stepNumber(category)} tone={category} size="lg" />
        <div>
          <p className={cn("text-2xs font-bold tracking-wide", TONE[category].text)}>
            {L({ ko: `${stepNumber(category)}단계 · 도구 ${tools.length}개`, en: `Step ${stepNumber(category)} · ${tools.length} tools` })}
          </p>
          <h2 id={`cat-${category}`} className="font-display text-2xl font-bold tracking-[-0.01em] break-keep">{L(c.name)}</h2>
          <p className="text-sm break-keep text-fg-muted">{L(c.pitch)}</p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((t) => <ToolCard key={t.slug} tool={t} />)}
      </ul>
    </section>
  );
}

function ToolsView({ initialCategory, recent }: { initialCategory: CategoryId | "all"; recent: string[] }) {
  const L = useBi();
  const favorites = useFavorites();
  const [f, setF] = useState<Filter>({ q: "", category: initialCategory, favoritesOnly: false });
  const favSet = useMemo(() => new Set(favorites.list), [favorites.list]);
  const visible = publicTools().filter((t) => matches(t, f, favSet));
  const filtering = Boolean(f.q.trim()) || f.category !== "all" || f.favoritesOnly;
  // A mode used recently shows as the tool it belongs to.
  const recentTools = [...new Set(recent.map((id) => {
    const t = catalogTool(id);
    return t?.hidden ? t.hidden.parent : t?.slug;
  }).filter((s): s is string => !!s))].map((s) => catalogTool(s)!).filter((t) => !t.hidden).slice(0, 4);
  const favTools = publicTools().filter((t) => favSet.has(t.engine ?? t.slug));
  const total = publicTools().length;

  const pick = (c: CategoryId) => {
    setF({ ...f, category: "all", q: "", favoritesOnly: false });
    requestAnimationFrame(() => document.getElementById(c)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <Page wide>
      <PageHero
        icon={LayoutGrid}
        tone="accent"
        eyebrow={L({ ko: `도구 ${total}개 · 5단계`, en: `${total} tools · 5 steps` })}
        title={L({ ko: "어떤 일을 도와드릴까요?", en: "What can we help with?" })}
        lead={L({
          ko: "1번부터 순서대로 따라 하면 사업 준비가 끝나요. 필요한 도구만 골라 써도 괜찮아요.",
          en: "Follow the tools from number 1 and your business is ready. Or just pick the one you need.",
        })}
        className="mb-0"
      />

      {/* Find */}
      <div className="sticky top-[64px] z-20 -mx-4 mt-8 border-b border-hairline bg-bg/95 px-4 py-3 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-hairline bg-surface px-4 focus-within:border-accent sm:max-w-sm">
            <Search size={15} className="text-fg-subtle" aria-hidden />
            <input
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              placeholder={L({ ko: "하고 싶은 일로 찾기 (예: 상세페이지, 회의)", en: "Search by task (e.g. product page, meeting)" })}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label={L({ ko: "도구 검색", en: "Search tools" })}
            />
            {f.q ? (
              <button type="button" onClick={() => setF({ ...f, q: "" })} aria-label={L({ ko: "검색어 지우기", en: "Clear search" })} className="text-fg-subtle hover:text-fg">
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => setF({ ...f, favoritesOnly: !f.favoritesOnly })}
            aria-pressed={f.favoritesOnly}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors", f.favoritesOnly ? "border-fg bg-fg text-bg" : "border-hairline bg-surface text-fg-muted hover:text-fg")}
          >
            <Star size={13} aria-hidden /> {L({ ko: "즐겨찾기", en: "Pinned" })}
          </button>
        </div>
        <nav aria-label={L({ ko: "단계", en: "Steps" })} className="mt-2 -mx-1 flex gap-1 overflow-x-auto px-1 text-sm">
          <button type="button" onClick={() => setF({ ...f, category: "all" })} aria-pressed={f.category === "all"} className={cn("rounded-lg px-2.5 py-1 whitespace-nowrap", f.category === "all" ? "bg-accent-dim font-medium text-accent" : "text-fg-muted hover:text-fg")}>
            {L({ ko: "전체", en: "All" })}
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} type="button" onClick={() => setF({ ...f, category: f.category === c ? "all" : c })} aria-pressed={f.category === c} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium whitespace-nowrap", f.category === c ? TONE[c].chip : "text-fg hover:bg-surface-2")}>
              <Num n={stepNumber(c)} tone={c} size="sm" />
              {L(CATEGORIES[c].name)}
            </button>
          ))}
        </nav>
      </div>

      {filtering ? (
        <section aria-live="polite" className="mt-8">
          <p className="mb-3 text-sm text-fg-muted">{L({ ko: `도구 ${visible.length}개`, en: `${visible.length} tools` })}</p>
          {visible.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((t) => <ToolCard key={t.slug} tool={t} />)}
            </ul>
          ) : (
            <div className="rounded-[20px] border border-dashed border-hairline-str p-8 text-center">
              <p className="font-medium">{L({ ko: "맞는 도구가 없어요", en: "No tool matches" })}</p>
              <p className="mt-1 text-sm text-fg-muted">{L({ ko: "다른 말로 찾거나, 단계에서 골라 보세요.", en: "Try other words, or pick a step." })}</p>
              <button type="button" onClick={() => setF({ q: "", category: "all", favoritesOnly: false })} className="mt-4 text-sm font-medium text-accent hover:underline">
                {L({ ko: "모두 보기", en: "Show all" })}
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <HowTo />

          {/* Personal: pinned and recently used (from your real runs) */}
          {favTools.length || recentTools.length ? (
            <section className="mt-10 grid gap-4 md:grid-cols-2">
              {favTools.length ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Star size={14} className="text-studio-warning" aria-hidden /> {L({ ko: "즐겨찾기", en: "Pinned" })}</h2>
                  <ul className="grid gap-2">{favTools.map((t) => <ToolCard key={t.slug} tool={t} compact />)}</ul>
                </div>
              ) : null}
              {recentTools.length ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock size={14} className="text-fg-subtle" aria-hidden /> {L({ ko: "최근 사용", en: "Recently used" })}</h2>
                  <ul className="grid gap-2">{recentTools.map((t) => <ToolCard key={t.slug} tool={t} compact />)}</ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <StepMap onPick={pick} />

          <div className="mt-14 space-y-14">
            {CATEGORY_ORDER.map((c) => (
              <StepSection key={c} category={c} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

export { ToolsView };
