"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Hammer, Search, Star, X } from "lucide-react";
import { CATEGORIES, CATEGORY_ORDER, VERBS, publicTools, toolsIn, catalogTool, type CatalogTool, type Verb } from "@/lib/tools/catalog";
import { getTool } from "@/lib/tools/registry";
import { WORKFLOWS, GOALS } from "@/lib/site/guides";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { CategoryId } from "@/lib/tools/types";
import { Page } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Tool discovery. Find a tool by what you want to do (search, verb,
// category, goal), see what each one hands you before opening it, and
// start from favourites or recently used ones. Each category is laid out
// in its own way — a path, a board, a strip, a list, a desk — so 25 tools
// don't read as one repeated grid.

type Filter = { q: string; verb: Verb | "all"; category: CategoryId | "all"; favoritesOnly: boolean };

function matches(t: CatalogTool, f: Filter, favorites: Set<string>) {
  if (f.verb !== "all" && t.verb !== f.verb) return false;
  if (f.category !== "all" && t.category !== f.category) return false;
  if (f.favoritesOnly && !favorites.has(t.engine ?? t.slug)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  return [t.name.ko, t.name.en, t.promise.ko, t.promise.en, ...t.outputs.flatMap((o) => [o.ko, o.en])].some((s) => s.toLowerCase().includes(q));
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
  return m ? <span className="font-mono text-2xs text-fg-subtle">{m.estimatedCredits} cr · ~{Math.round(m.estimatedSeconds / 60) || 1}{L({ ko: "분", en: "min" })}</span> : null;
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

/** One tool, in the shape its category uses. The whole card is the link (stretched), the star stays clickable. */
function ToolCard({ tool, variant, index }: { tool: CatalogTool; variant: "path" | "board" | "strip" | "row" | "desk"; index: number }) {
  const L = useBi();
  const href = `/tools/${tool.slug}`;
  const title = (
    <Link href={href} className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none">
      <span className="font-semibold break-keep">{L(tool.name)}</span>
    </Link>
  );
  const outputs = (n: number) => (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={L({ ko: "받게 될 결과", en: "What you get" })}>
      {tool.outputs.slice(0, n).map((o) => (
        <li key={o.en} className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs break-keep text-fg-muted">{L(o)}</li>
      ))}
    </ul>
  );
  const base = "group relative rounded-[20px] border border-hairline bg-surface transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_14px_34px_-22px_var(--studio-violet)] focus-within:ring-2 focus-within:ring-accent/40";

  if (variant === "row" || variant === "desk") {
    return (
      <li className={cn(base, "flex items-center gap-4 p-4")}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", variant === "desk" ? "bg-ai-dim text-ai" : "bg-accent-dim text-accent")}>
          <tool.icon size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">{title}<span className="text-2xs text-fg-subtle">{tool.name.en}</span></div>
          <p className="mt-0.5 text-sm leading-relaxed break-keep text-fg-muted">{L(tool.promise)}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex"><Status tool={tool} /></div>
        <FavButton tool={tool} />
      </li>
    );
  }
  return (
    <li className={cn(base, "flex flex-col p-5", variant === "board" && index < 2 && "md:col-span-3", variant === "board" && index >= 2 && "md:col-span-2")}>
      <div className="flex items-start justify-between gap-2">
        {variant === "path" ? (
          <span className="grid size-9 place-items-center rounded-full bg-fg font-mono text-sm text-bg">{index + 1}</span>
        ) : (
          <span className="grid size-10 place-items-center rounded-xl bg-accent-dim text-accent"><tool.icon size={19} aria-hidden /></span>
        )}
        <FavButton tool={tool} />
      </div>
      <div className="mt-4">{title}</div>
      <p className="text-2xs text-fg-subtle">{tool.name.en}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed break-keep text-fg-muted">{L(tool.promise)}</p>
      {outputs(variant === "board" && index < 2 ? 3 : 2)}
      <div className="mt-4 flex items-center justify-between">
        <Status tool={tool} />
        <ArrowRight size={16} className="text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
      </div>
    </li>
  );
}

const VARIANT: Record<CategoryId, "path" | "board" | "strip" | "row" | "desk"> = {
  discover: "path",
  brand: "board",
  campaign: "strip",
  operate: "row",
  research: "desk",
};

function CategorySection({ category, tools }: { category: CategoryId; tools: CatalogTool[] }) {
  const L = useBi();
  const c = CATEGORIES[category];
  const variant = VARIANT[category];
  const all = toolsIn(category);
  return (
    <section id={category} aria-labelledby={`cat-${category}`} className="scroll-mt-40">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-2xs font-medium tracking-wide text-accent uppercase">{L(VERBS[c.verb])} · {L({ ko: `${all.length}개 도구`, en: `${all.length} tools` })}</p>
          <h2 id={`cat-${category}`} className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] break-keep">{L(c.name)}</h2>
          <p className="mt-1 text-sm break-keep text-fg-muted">{L(c.pitch)}</p>
        </div>
      </div>
      {variant === "path" ? (
        <ol className="relative grid gap-3 md:grid-cols-5">
          {tools.map((t) => <ToolCard key={t.slug} tool={t} variant="path" index={all.indexOf(t)} />)}
        </ol>
      ) : variant === "board" ? (
        <ul className="grid gap-3 md:grid-cols-6">
          {tools.map((t) => <ToolCard key={t.slug} tool={t} variant="board" index={all.indexOf(t)} />)}
        </ul>
      ) : variant === "strip" ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 [&>li]:w-[260px] [&>li]:shrink-0 [&>li]:snap-start md:[&>li]:w-auto">
          {tools.map((t) => <ToolCard key={t.slug} tool={t} variant="strip" index={all.indexOf(t)} />)}
        </ul>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {tools.map((t) => <ToolCard key={t.slug} tool={t} variant={variant} index={all.indexOf(t)} />)}
        </ul>
      )}
    </section>
  );
}

function ToolsView({ initialCategory, recent }: { initialCategory: CategoryId | "all"; recent: string[] }) {
  const L = useBi();
  const { locale } = useLocale();
  const favorites = useFavorites();
  const [f, setF] = useState<Filter>({ q: "", verb: "all", category: initialCategory, favoritesOnly: false });
  const favSet = useMemo(() => new Set(favorites.list), [favorites.list]);
  const visible = publicTools().filter((t) => matches(t, f, favSet));
  const filtering = Boolean(f.q.trim()) || f.verb !== "all" || f.category !== "all" || f.favoritesOnly;
  const recentTools = recent.map((id) => catalogTool(id)).filter((t): t is CatalogTool => Boolean(t && !t.hidden)).slice(0, 4);
  const favTools = publicTools().filter((t) => favSet.has(t.engine ?? t.slug));

  const chip = (active: boolean) =>
    cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors", active ? "border-fg bg-fg text-bg" : "border-hairline bg-surface text-fg-muted hover:text-fg");

  return (
    <Page wide>
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-accent">{L({ ko: "25개 도구 · 5개 분야", en: "25 tools · 5 areas" })}</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4.2vw,3.1rem)] leading-[1.06] font-bold tracking-[-0.02em] break-keep">
          {L({ ko: "오늘 무엇을 끝낼까요?", en: "What will you finish today?" })}
        </h1>
        <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "아이디어에서 브랜드, 판매, 콘텐츠, 문서, 리서치까지. 각 도구는 결과물 하나를 끝까지 만들고, 그 결과를 다음 도구로 넘겨줍니다.",
            en: "From idea to brand, sales, content, documents and research. Each tool finishes one real deliverable and hands it to the next.",
          })}
        </p>
      </header>

      {/* Find */}
      <div className="sticky top-[64px] z-20 -mx-4 mt-8 border-b border-hairline bg-bg/95 px-4 py-3 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-hairline bg-surface px-4 focus-within:border-accent sm:max-w-sm">
            <Search size={15} className="text-fg-subtle" aria-hidden />
            <input
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              placeholder={L({ ko: "하고 싶은 일로 찾기 (예: 상세페이지, 회의록)", en: "Search by task (e.g. sales page, meeting notes)" })}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label={L({ ko: "도구 검색", en: "Search tools" })}
            />
            {f.q ? (
              <button type="button" onClick={() => setF({ ...f, q: "" })} aria-label={L({ ko: "검색어 지우기", en: "Clear search" })} className="text-fg-subtle hover:text-fg">
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </label>
          <div role="group" aria-label={L({ ko: "하려는 일", en: "What you want to do" })} className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
            <button type="button" onClick={() => setF({ ...f, verb: "all" })} aria-pressed={f.verb === "all"} className={chip(f.verb === "all")}>{L({ ko: "전체", en: "All" })}</button>
            {(Object.keys(VERBS) as Verb[]).map((v) => (
              <button key={v} type="button" onClick={() => setF({ ...f, verb: f.verb === v ? "all" : v })} aria-pressed={f.verb === v} className={chip(f.verb === v)}>
                {L(VERBS[v])}
              </button>
            ))}
            <button type="button" onClick={() => setF({ ...f, favoritesOnly: !f.favoritesOnly })} aria-pressed={f.favoritesOnly} className={chip(f.favoritesOnly)}>
              <Star size={13} aria-hidden /> {L({ ko: "즐겨찾기", en: "Pinned" })}
            </button>
          </div>
        </div>
        <nav aria-label={L({ ko: "분야", en: "Areas" })} className="mt-2 -mx-1 flex gap-1 overflow-x-auto px-1 text-sm">
          <button type="button" onClick={() => setF({ ...f, category: "all" })} aria-pressed={f.category === "all"} className={cn("rounded-lg px-2.5 py-1 whitespace-nowrap", f.category === "all" ? "bg-accent-dim font-medium text-accent" : "text-fg-muted hover:text-fg")}>
            {L({ ko: "모든 분야", en: "All areas" })}
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} type="button" onClick={() => setF({ ...f, category: f.category === c ? "all" : c })} aria-pressed={f.category === c} className={cn("rounded-lg px-2.5 py-1 whitespace-nowrap", f.category === c ? "bg-accent-dim font-medium text-accent" : "text-fg-muted hover:text-fg")}>
              {L(CATEGORIES[c].name)}
            </button>
          ))}
        </nav>
      </div>

      {filtering ? (
        <section aria-live="polite" className="mt-8">
          <p className="mb-3 text-sm text-fg-muted">{L({ ko: `${visible.length}개 도구`, en: `${visible.length} tools` })}</p>
          {visible.length ? (
            <ul className="grid gap-2 lg:grid-cols-2">
              {visible.map((t, i) => <ToolCard key={t.slug} tool={t} variant="row" index={i} />)}
            </ul>
          ) : (
            <div className="rounded-[20px] border border-dashed border-hairline-str p-8 text-center">
              <p className="font-medium">{L({ ko: "맞는 도구가 없어요", en: "No tool matches" })}</p>
              <p className="mt-1 text-sm text-fg-muted">{L({ ko: "다른 말로 찾거나, 아래 목표에서 골라 보세요.", en: "Try other words, or pick a goal below." })}</p>
              <button type="button" onClick={() => setF({ q: "", verb: "all", category: "all", favoritesOnly: false })} className="mt-4 text-sm font-medium text-accent hover:underline">
                {L({ ko: "필터 모두 지우기", en: "Clear all filters" })}
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Personal: pinned and recently used (from your real runs) */}
          {favTools.length || recentTools.length ? (
            <section className="mt-8 grid gap-4 md:grid-cols-2">
              {favTools.length ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Star size={14} className="text-studio-warning" aria-hidden /> {L({ ko: "즐겨찾기", en: "Pinned" })}</h2>
                  <div className="flex flex-wrap gap-2">
                    {favTools.map((t) => (
                      <Link key={t.slug} href={`/tools/${t.slug}`} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm hover:border-accent/50">
                        <t.icon size={14} className="text-accent" aria-hidden /> {L(t.name)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {recentTools.length ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock size={14} className="text-fg-subtle" aria-hidden /> {L({ ko: "최근 사용", en: "Recently used" })}</h2>
                  <div className="flex flex-wrap gap-2">
                    {recentTools.map((t) => (
                      <Link key={t.slug} href={`/tools/${t.slug}/run`} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm hover:border-accent/50">
                        <t.icon size={14} className="text-accent" aria-hidden /> {L(t.name)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* By goal */}
          <section className="mt-10" aria-labelledby="goals-title">
            <h2 id="goals-title" className="text-lg font-semibold">{L({ ko: "목표로 시작하기", en: "Start from a goal" })}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setF({ ...f, category: g.category as CategoryId });
                    document.getElementById(g.category)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-[20px] border border-hairline bg-surface p-4 text-left transition-colors hover:border-accent/50"
                >
                  <span className="block font-semibold break-keep">{L(g.title)}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{L(g.body)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Flows */}
          <section className="mt-10" aria-labelledby="flows-title">
            <h2 id="flows-title" className="text-lg font-semibold">{L({ ko: "이어서 만드는 흐름", en: "Flows that chain tools" })}</h2>
            <p className="mt-1 text-sm text-fg-muted">{L({ ko: "앞 도구의 결과가 다음 도구의 입력이 됩니다.", en: "Each tool's result becomes the next one's input." })}</p>
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
              {WORKFLOWS.map((w) => (
                <Link key={w.id} href={`/tools/${w.tools[0]}/run`} className="flex w-[290px] shrink-0 snap-start flex-col rounded-[20px] border border-hairline bg-surface p-5 transition-colors hover:border-accent/50">
                  <p className="font-semibold break-keep">{L(w.title)}</p>
                  <p className="mt-1 line-clamp-3 text-sm break-keep text-fg-muted">{L(w.body)}</p>
                  <ol className="mt-4 space-y-1.5 text-xs">
                    {w.tools.map((s, i) => {
                      const t = catalogTool(s)!;
                      return (
                        <li key={s} className="flex items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-full bg-surface-2 font-mono text-[10px]">{i + 1}</span>
                          <t.icon size={13} className="text-accent" aria-hidden />
                          <span className="break-keep">{locale === "en" ? t.name.en : t.name.ko}</span>
                        </li>
                      );
                    })}
                  </ol>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-14 space-y-14">
            {CATEGORY_ORDER.map((c) => (
              <CategorySection key={c} category={c} tools={toolsIn(c)} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

export { ToolsView };
