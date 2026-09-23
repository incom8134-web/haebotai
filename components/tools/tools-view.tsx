"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowUpRight, Search, Star } from "lucide-react";
import { getTool, listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { getToolContent } from "@/lib/tools/content";
import { WORKFLOWS } from "@/lib/site/guides";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { CategoryId, ToolManifest } from "@/lib/tools/types";
import { Page, PageHeader, Segmented } from "@/components/site/page";
import { cn } from "@/lib/utils";

const ORDER: CategoryId[] = ["ideas", "content", "design", "sales", "docs"];

function ToolTile({ tool }: { tool: ToolManifest }) {
  const L = useBi();
  const { locale } = useLocale();
  const favorites = useFavorites();
  const fav = favorites.has(tool.id);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover group relative flex min-h-[188px] flex-col rounded-[24px] p-5"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="studio-gradient-bg grid size-11 place-items-center rounded-2xl text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%)]">
          <tool.icon size={19} aria-hidden />
        </span>
        <button
          type="button"
          onClick={() => favorites.toggle(tool.id)}
          aria-pressed={fav}
          aria-label={fav ? L({ ko: "고정 해제", en: "Unpin" }) : L({ ko: "스튜디오에 고정", en: "Pin to Studio" })}
          className={cn("relative z-10 grid size-9 place-items-center rounded-xl transition-colors", fav ? "text-studio-warning" : "text-fg-subtle hover:text-fg")}
        >
          <Star size={16} fill={fav ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>
      <h3 className="mt-5 font-semibold tracking-[-0.01em]">{locale === "en" ? tool.name_en : tool.name_ko}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-fg-muted">{L(getToolContent(tool.id)!.tagline)}</p>
      <div className="mt-4 flex items-center justify-between">
        {tool.comingSoon ? (
          <span className="rounded-full border border-hairline px-2 py-0.5 text-2xs text-fg-muted">{L({ ko: "준비 중", en: "Coming soon" })}</span>
        ) : (
          <span className="font-mono text-2xs text-fg-subtle">{tool.estimatedCredits} cr · ~{tool.estimatedSeconds}s</span>
        )}
        <Link href={`/tools/${tool.id}`} aria-label={locale === "en" ? tool.name_en : tool.name_ko} className="grid size-8 place-items-center rounded-full text-fg-muted transition-all duration-500 ease-[var(--spring)] group-hover:rotate-45 group-hover:bg-studio-cyan/15 group-hover:text-studio-cyan after:absolute after:inset-0 after:rounded-[24px]">
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
    </motion.div>
  );
}

function ToolsView({ initialCategory }: { initialCategory: CategoryId | "all" }) {
  const L = useBi();
  const { locale } = useLocale();
  const tools = useMemo(() => listTools(), []);
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matches = (t: ToolManifest) => {
    if (category !== "all" && t.category !== category) return false;
    if (!q) return true;
    const c = getToolContent(t.id);
    return [t.name_ko, t.name_en, t.summary, c?.tagline.ko, c?.tagline.en].some((s) => s?.toLowerCase().includes(q));
  };
  const visible = tools.filter(matches);
  const groups = ORDER.map((cat) => ({ cat, items: visible.filter((t) => t.category === cat) })).filter((g) => g.items.length);

  return (
    <Page wide>
      <PageHeader
        eyebrow={L({ ko: `${tools.length}개 도구, 하나의 앱`, en: `${tools.length} tools, one app` })}
        title={L({ ko: "무엇을 만들까요?", en: "What are we making?" })}
        lead={L({ ko: "도구는 서로 결과를 이어받습니다. 흐름으로 시작하거나, 필요한 도구 하나를 바로 여세요.", en: "Tools pass results to each other. Start from a flow, or open the one tool you need." })}
      />

      {/* Flows first — the thing a catalog of separate apps can't do. */}
      <section id="flows" className="scroll-mt-24">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">{L({ ko: "흐름으로 시작", en: "Start with a flow" })}</h2>
          <span className="text-2xs text-fg-subtle">{L({ ko: "옆으로 넘겨 보기", en: "Scroll sideways" })}</span>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          {WORKFLOWS.map((w) => (
            <Link key={w.id} href={`/tools/${w.tools[0]}/run`} className="glass glass-hover flex w-[300px] shrink-0 snap-start flex-col items-start rounded-[24px] p-5 text-left">
              <div className="flex -space-x-2">
                {w.tools.map((id) => {
                  const t = getTool(id)!;
                  return (
                    <span key={id} className="glass-strong grid size-10 place-items-center rounded-full text-studio-cyan">
                      <t.icon size={16} aria-hidden />
                    </span>
                  );
                })}
              </div>
              <p className="mt-4 font-semibold">{L(w.title)}</p>
              <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{L(w.body)}</p>
              <p className="mt-3 flex flex-wrap items-center gap-1 text-2xs text-fg-subtle">
                {w.tools.map((id, i) => (
                  <span key={id} className="flex items-center gap-1">
                    {i > 0 ? <ArrowRight size={10} aria-hidden /> : null}
                    {locale === "en" ? getTool(id)!.name_en : getTool(id)!.name_ko}
                  </span>
                ))}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="sticky top-[68px] z-20 mt-10 mb-6 flex flex-wrap items-center gap-3">
        <label className="glass flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl px-4 sm:max-w-xs">
          <Search size={15} className="text-fg-subtle" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L({ ko: "이름이나 하는 일로 찾기", en: "Search by name or task" })} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={L({ ko: "도구 검색", en: "Search tools" })} />
        </label>
        <Segmented
          label={L({ ko: "분야", en: "Category" })}
          value={category}
          onChange={setCategory}
          options={[{ value: "all" as const, label: L({ ko: "전체", en: "All" }), count: tools.length }, ...ORDER.map((c) => ({ value: c, label: L(CATEGORY_LABELS[c]), count: tools.filter((t) => t.category === c).length }))]}
        />
      </div>

      {groups.length === 0 ? (
        <p className="glass rounded-[24px] p-10 text-center text-sm text-fg-muted">{L({ ko: "맞는 도구가 없어요. 검색어를 줄여 보세요.", en: "No tools match. Try a shorter search." })}</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.cat}>
              {category === "all" ? <h2 className="mb-3 text-sm font-semibold text-fg-muted">{L(CATEGORY_LABELS[g.cat])}</h2> : null}
              <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {g.items.map((t) => <ToolTile key={t.id} tool={t} />)}
                </AnimatePresence>
              </motion.div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

export { ToolsView };
