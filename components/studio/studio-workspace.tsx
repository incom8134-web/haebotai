"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  FileQuestion,
  Layers3,
  Library,
  Play,
  Sparkles,
  UserRound,
} from "lucide-react";
import { listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { briefField } from "@/lib/tools/brief";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { useLocale, useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { BusinessProfile, CategoryId, ToolManifest } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

// HAEBOT AI STUDIO — the Lovable prototype's layout (hero + tool cards +
// brief panel on the left, glass "studio" panel on the right) rebuilt on
// the real registry. "Generate" doesn't fake a run here: it hands the
// brief to the tool page (?brief=), which seeds the manifest's main text
// field and runs through the normal streaming/credits/sources pipeline.

export interface StudioRun {
  id: string;
  toolId: string;
  status: string;
  credits: number | null;
  createdAt: string;
}

const STATUS_KEY: Record<string, DictKey> = {
  pending: "status_pending",
  streaming: "status_streaming",
  done: "status_done",
  cancelled: "status_cancelled",
  error: "status_error",
};

const CATEGORY_ORDER: CategoryId[] = ["ideas", "content", "design", "sales", "docs"];

// Example briefs, keyed by tool id — shown as the textarea placeholder so
// an empty brief still teaches what the tool wants. Korean first: tool
// prompts and field labels are Korean-only for now (see dictionaries.ts).
const EXAMPLE_BRIEFS: Partial<Record<string, { ko: string; en: string }>> = {
  money: { ko: "10년차 제과 경력, 주말만 가능. 온라인 클래스나 소량 판매로 수익화하고 싶어요.", en: "10 years as a pastry chef, weekends only. Want to monetize via online classes or small-batch sales." },
  trend: { ko: "20~30대 1인 가구 대상 밀키트 구독", en: "Meal-kit subscription for single-person households in their 20s–30s" },
  calendar: { ko: "동네 베이커리의 주말 원데이 클래스 모델", en: "Weekend one-day baking classes for a neighborhood bakery" },
  prompt: { ko: "매주 고객 리뷰를 모아 개선점 3가지로 요약하는 업무", en: "Every week, summarize customer reviews into three improvement points" },
  blog: { ko: "봄 시즌 딸기 디저트 신메뉴 소개", en: "Introducing our spring strawberry dessert menu" },
  keyword: { ko: "수제 케이크 주문", en: "Custom cake orders" },
  place: { ko: "해봇 베이커리", en: "Haebot Bakery" },
  image: { ko: "딸기 생크림 케이크, 봄 햇살 아래 원목 테이블 위", en: "Strawberry cream cake on a wooden table in spring sunlight" },
  logo: { ko: "해봇 베이커리", en: "Haebot Bakery" },
  sangsepage: { ko: "저당 수제 그래놀라 500g", en: "Low-sugar handmade granola, 500g" },
  proposal: { ko: "지역 카페 3곳 대상 디저트 납품 제안", en: "Dessert supply proposal for three local cafés" },
  "business-plan": { ko: "비건 디저트 정기배송 서비스", en: "Vegan dessert subscription delivery" },
};

function relativeTime(iso: string, locale: "ko" | "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

function StudioWorkspace({
  profile,
  recentRuns,
}: {
  profile: BusinessProfile | null;
  recentRuns: StudioRun[];
}) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const [isOpening, startOpening] = useTransition();

  const favorites = useFavorites();
  // Coming-soon tools can't run, so a brief has nowhere to go — leave them out.
  const allTools = useMemo(() => listTools().filter((tool) => !tool.comingSoon), []);
  // Pinned tools (★ on /tools or a tool page) float to the front.
  const tools = useMemo(() => [...allTools].sort((a, b) => Number(favorites.list.includes(b.id)) - Number(favorites.list.includes(a.id))), [allTools, favorites.list]);
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [activeId, setActiveId] = useState<string>("image");
  const [brief, setBrief] = useState("");

  const active = tools.find((tool) => tool.id === activeId) ?? tools[0];
  const visible = category === "all" ? tools : tools.filter((tool) => tool.category === category);
  const activeBriefField = briefField(active);
  const toolName = (tool: ToolManifest) => (locale === "en" ? tool.name_en : tool.name_ko);

  const grounding = profile
    ? (
        [
          profile.tone.length ? `${t("profile_tone").replace(/\s*\(.*\)/, "")}: ${profile.tone.join(", ")}` : null,
          profile.target_customer ? `${t("profile_target_customer")}: ${profile.target_customer}` : null,
          profile.industry ? `${t("profile_industry")}: ${profile.industry}` : null,
        ] as (string | null)[]
      ).filter((line): line is string => line !== null)
    : [];

  function generate() {
    const query = activeBriefField && brief.trim() ? `?brief=${encodeURIComponent(brief.trim())}` : "";
    startOpening(() => router.push(`/tools/${active.id}/run${query}`));
  }

  return (
    <div className="text-fg">

      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pt-6 pb-10 md:px-8 md:pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {/* ── Left: brief ─────────────────────────────────────────── */}
        <section className="min-w-0">
          <div className="mb-7">
            <div className="mb-4 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.24em] text-studio-cyan">
              <span className="h-px w-8 bg-studio-cyan" aria-hidden />
              {t("studio_eyebrow")}
            </div>
            <h1 className="font-display text-[clamp(2.4rem,4.4vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.02em]">
              {t("studio_headline_1")}
              <br />
              <span className="studio-gradient-type">{t("studio_headline_2")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-fg-muted">{t("studio_sub")}</p>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t("studio_panel_title")}>
            {(["all", ...CATEGORY_ORDER] as const).map((id) => {
              const count = id === "all" ? tools.length : tools.filter((tool) => tool.category === id).length;
              const selected = category === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setCategory(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    selected
                      ? "border-transparent bg-fg text-bg"
                      : "glass text-fg-muted hover:text-fg",
                  )}
                >
                  {id === "all" ? t("studio_all") : CATEGORY_LABELS[id][locale]}
                  <span className={cn("font-mono text-2xs", selected ? "opacity-70" : "text-fg-subtle")}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 grid max-h-[372px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3" role="listbox" aria-label={t("studio_panel_title")}>
            {visible.map((tool) => {
              const Icon = tool.icon;
              const selected = tool.id === active.id;
              return (
                <button
                  key={tool.id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => setActiveId(tool.id)}
                  className={cn(
                    "min-h-[104px] rounded-[20px] border p-3.5 text-left transition-[transform,background,border-color,box-shadow] duration-500 ease-[var(--spring)] hover:-translate-y-0.5",
                    selected
                      ? "studio-tool-active"
                      : "glass hover:border-hairline-str",
                  )}
                >
                  <Icon size={19} strokeWidth={1.8} className={selected ? "text-studio-cyan" : "text-fg-subtle"} aria-hidden />
                  <p className="mt-3 text-sm font-semibold leading-tight">{toolName(tool)}</p>
                  <p className="mt-1 font-mono text-2xs text-fg-subtle">
                    {tool.estimatedCredits} {t("credits")} · ~{tool.estimatedSeconds}
                    {t("seconds")}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="glass-strong rounded-[26px] p-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs text-fg-muted">
              <span className="truncate">
                {activeBriefField ? `${t("studio_brief_label")} — ${activeBriefField.label}` : active.summary}
              </span>
              {activeBriefField ? <span className="hidden shrink-0 text-2xs sm:inline">{t("studio_brief_hint")}</span> : null}
            </div>

            {activeBriefField ? (
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") generate();
                }}
                placeholder={EXAMPLE_BRIEFS[active.id]?.[locale] ?? active.summary}
                maxLength={activeBriefField.max}
                className="min-h-[92px] w-full resize-none bg-transparent text-sm leading-6 text-fg outline-none placeholder:text-fg-subtle"
                aria-label={activeBriefField.label}
              />
            ) : (
              <p className="min-h-[92px] text-sm leading-6 text-fg-muted">{active.summary}</p>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-hairline pt-3">
              <div className="flex flex-wrap gap-2 text-2xs text-fg-muted">
                <Link
                  href="/brand"
                  className="flex items-center gap-1 rounded-md border border-hairline bg-surface/70 px-2 py-1.5 hover:text-fg"
                >
                  <Layers3 size={12} aria-hidden />
                  {profile?.brand_name || t("studio_profile_setup")}
                </Link>
                {active.usesProfile.length > 0 ? (
                  <span className="flex items-center gap-1 rounded-md border border-hairline bg-surface/70 px-2 py-1.5">
                    <Check size={11} aria-hidden />
                    {t("studio_uses")} {active.usesProfile.length}
                  </span>
                ) : null}
                <span className="flex items-center rounded-md border border-hairline bg-surface/70 px-2 py-1.5 font-mono">
                  {t("estimated_credits")} {active.estimatedCredits}
                </span>
              </div>
              <button
                onClick={generate}
                disabled={isOpening}
                className="studio-gradient-bg flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%),0_12px_32px_-12px_var(--studio-violet)] transition-transform duration-500 ease-[var(--spring)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
              >
                {isOpening ? <Sparkles className="animate-spin" size={15} aria-hidden /> : <Play size={14} fill="currentColor" aria-hidden />}
                {isOpening ? t("studio_opening") : t("studio_generate")}
              </button>
            </div>
          </div>
        </section>

        {/* ── Right: studio panel ─────────────────────────────────── */}
        <section className="glass min-w-0 rounded-[28px] p-4 sm:p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", isOpening ? "animate-pulse bg-studio-warning" : "bg-studio-success")} aria-hidden />
              <span className="font-display text-sm font-semibold">
                {t("studio_panel_title")} — {profile?.brand_name || t("brand")}
              </span>
            </div>
            <Link
              href="/library"
              className="flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface/70 px-2.5 text-2xs text-fg-muted hover:text-fg"
            >
              <Library size={13} aria-hidden /> {t("studio_open_library")}
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{t("studio_recent")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {recentRuns.map((run) => {
                  const manifest = tools.find((tool) => tool.id === run.toolId);
                  const Icon = manifest?.icon ?? FileQuestion;
                  return (
                    <Link
                      key={run.id}
                      href={`/library/${run.id}`}
                      className="glass glass-hover group flex min-h-[132px] flex-col justify-between rounded-[20px] p-4"
                    >
                      <div className="flex items-start justify-between">
                        <span className="grid size-9 place-items-center rounded-lg bg-studio-cyan/12">
                          <Icon size={17} className="text-studio-cyan" aria-hidden />
                        </span>
                        <ArrowUpRight size={14} className="text-fg-subtle transition-colors group-hover:text-fg" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{manifest ? toolName(manifest) : run.toolId}</p>
                        <p className="mt-1 font-mono text-2xs text-fg-subtle">
                          {t(STATUS_KEY[run.status] ?? "status_pending")} · {relativeTime(run.createdAt, locale)}
                          {run.credits !== null ? ` · ${run.credits} ${t("credits")}` : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{t("studio_showcase")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="glass rounded-[20px] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-studio-cyan">{t("studio_campaign_visual")}</span>
                    <span className="text-2xs text-fg-subtle">1024 × 1024</span>
                  </div>
                  <div className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                    <Image
                      src="/images/spring-campaign.jpg"
                      alt="Example campaign visual: an athlete in cyan and violet studio light"
                      fill
                      sizes="(min-width: 1024px) 26vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-3 pt-12">
                      <span className="text-2xs text-white/85">{t("studio_variant")}</span>
                    </div>
                  </div>
                </article>

                <article className="glass rounded-[20px] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-studio-violet">{t("studio_presentation")}</span>
                    <span className="text-2xs text-fg-subtle">.docx</span>
                  </div>
                  <div className="studio-deck relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border border-hairline p-5">
                    <div className="relative z-10">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-studio-cyan">{profile?.brand_name || "Haebot"} / 2027</p>
                      <p className="mt-3 font-display text-2xl font-bold leading-none">
                        MOVE
                        <br />
                        BEYOND
                      </p>
                    </div>
                    <div className="relative z-10">
                      <div className="mb-3 grid grid-cols-3 gap-1.5" aria-hidden>
                        <span className="h-12 rounded bg-studio-cyan/25" />
                        <span className="h-12 rounded bg-studio-violet/25" />
                        <span className="h-12 rounded bg-fg/10" />
                      </div>
                      <p className="text-[9px] leading-4 text-fg-muted">{t("studio_recent_empty")}</p>
                    </div>
                    <span className="absolute -right-8 top-12 size-40 rounded-full border border-studio-cyan/30" aria-hidden />
                    <span className="absolute -right-2 top-20 size-24 rounded-full border border-studio-violet/40" aria-hidden />
                  </div>
                </article>
              </div>
            </>
          )}

          <div className="mt-3 rounded-[20px] border border-hairline bg-bg/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{t("studio_grounding")}</span>
              {grounding.length > 0 ? (
                <span className="text-2xs text-studio-cyan">
                  {grounding.length} {t("studio_grounding_count")}
                </span>
              ) : null}
            </div>
            {grounding.length > 0 ? (
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                {grounding.map((line, i) => (
                  <div key={line} className="flex min-w-0 items-center gap-2 text-fg-muted">
                    <span className="studio-source-num">{String(i + 1).padStart(2, "0")}</span>
                    <p className="truncate" title={line}>{line}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Link href="/brand" className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg">
                <UserRound size={14} className="text-studio-cyan" aria-hidden />
                {t("studio_grounding_empty")}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export { StudioWorkspace };
