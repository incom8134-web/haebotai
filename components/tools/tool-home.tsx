"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, Lightbulb, Play, Plus, Star } from "lucide-react";
import { getTool, listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { getToolContent } from "@/lib/tools/content";
import { presetLines } from "@/lib/tools/preset-lines";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { getToolCapability } from "@/lib/ai/capabilities";
import { PROVIDER_LABEL } from "@/lib/ai/types";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { ToolManifest } from "@/lib/tools/types";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Tool overview. Split layout: a sticky glass identity card on the left
// (what it is, what it costs, start), and a scrolling column on the right
// with examples, the path from input to result, a sample, tips and FAQ.

function ToolHome({ toolId }: { toolId: string }) {
  const L = useBi();
  const { locale } = useLocale();
  const favorites = useFavorites();
  const [copied, setCopied] = useState<number | null>(null);
  const tool = getTool(toolId)!;
  const c = getToolContent(toolId)!;
  const name = (t: ToolManifest) => (locale === "en" ? t.name_en : t.name_ko);
  const fav = favorites.has(tool.id);
  const chainsFrom = (tool.acceptsChainFrom ?? []).map((id) => getTool(id)).filter((t): t is ToolManifest => !!t);
  const chainsTo = listTools().filter((t) => t.acceptsChainFrom?.includes(tool.id));
  const related = listTools().filter((t) => t.category === tool.category && t.id !== tool.id);
  const engines = getToolCapability(tool.id)?.providers ?? ["google"];

  async function copyPreset(i: number) {
    try {
      await navigator.clipboard.writeText(presetLines(tool, c.presets[i]).join("\n"));
      setCopied(i);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <Link href={`/tools?category=${tool.category}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> {L(CATEGORY_LABELS[tool.category])}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start">
        {/* Identity card */}
        <aside className="glass-strong rounded-[28px] p-6 lg:sticky lg:top-24 md:p-7">
          <span className="studio-gradient-bg grid size-14 place-items-center rounded-[18px] text-white shadow-[inset_0_1px_0_oklch(1_0_0/35%),0_16px_40px_-16px_var(--studio-violet)]">
            <tool.icon size={26} aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-[34px] leading-[1.08] font-bold tracking-[-0.02em]">{name(tool)}</h1>
          <p className="studio-gradient-type mt-2 text-lg font-medium">{L(c.tagline)}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">{L(c.description)}</p>

          <ul className="mt-5 space-y-2.5">
            {c.features.map((f) => (
              <li key={f.title.en} className="flex gap-2.5 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden />
                <span>
                  <span className="font-medium">{L(f.title)}</span>
                  <span className="text-fg-muted"> — {L(f.body)}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className={cn("mt-6 grid gap-2 rounded-2xl border border-hairline bg-bg/30 p-3 text-center", engines.length > 1 ? "grid-cols-3" : "grid-cols-2")}>
            <div>
              <p className="font-mono text-lg">{tool.estimatedCredits}</p>
              <p className="text-2xs text-fg-subtle">{L({ ko: "예상 크레딧", en: "est. credits" })}</p>
            </div>
            <div>
              <p className="font-mono text-lg">~{tool.estimatedSeconds}s</p>
              <p className="text-2xs text-fg-subtle">{L({ ko: "소요 시간", en: "to finish" })}</p>
            </div>
            {engines.length > 1 ? (
              <div>
                <p className="font-mono text-sm leading-tight">{engines.map((p) => PROVIDER_LABEL[p]).join(" / ")}</p>
                <p className="text-2xs text-fg-subtle">{L({ ko: "지원 엔진", en: "engines" })}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2">
            <Link href={`/tools/${tool.id}/run`} className={cn(primaryButton, "flex-1")}>
              <Play size={14} fill="currentColor" aria-hidden /> {L({ ko: "시작하기", en: "Start" })}
            </Link>
            <button type="button" onClick={() => favorites.toggle(tool.id)} aria-pressed={fav} aria-label={fav ? L({ ko: "고정 해제", en: "Unpin" }) : L({ ko: "스튜디오에 고정", en: "Pin to Studio" })} className={cn(secondaryButton, "w-11 px-0", fav && "text-studio-warning")}>
              <Star size={16} fill={fav ? "currentColor" : "none"} aria-hidden />
            </button>
          </div>

          {chainsFrom.length || chainsTo.length ? (
            <div className="mt-6 border-t border-hairline pt-5 text-sm">
              {chainsFrom.length ? (
                <p className="text-fg-muted">
                  {L({ ko: "이어받는 결과", en: "Takes results from" })}{" "}
                  {chainsFrom.map((t, i) => (
                    <span key={t.id}>{i ? ", " : ""}<Link href={`/tools/${t.id}`} className="text-fg underline-offset-4 hover:underline">{name(t)}</Link></span>
                  ))}
                </p>
              ) : null}
              {chainsTo.length ? (
                <p className="mt-1.5 text-fg-muted">
                  {L({ ko: "다음으로 이어지는 도구", en: "Continues into" })}{" "}
                  {chainsTo.map((t, i) => (
                    <span key={t.id}>{i ? ", " : ""}<Link href={`/tools/${t.id}`} className="text-fg underline-offset-4 hover:underline">{name(t)}</Link></span>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>

        {/* Scrolling column */}
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="mb-1 font-display text-2xl font-bold tracking-[-0.01em]">{L({ ko: "예시에서 시작", en: "Start from an example" })}</h2>
            <p className="mb-4 text-sm text-fg-muted">{L({ ko: "고르면 입력이 채워진 채로 열려요. 내 상황에 맞게 고쳐서 실행하세요.", en: "Opens with the form filled in. Adjust it to your situation and run." })}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {c.presets.map((p, i) => (
                <motion.article
                  key={p.title.en}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                  className="glass glass-hover group flex flex-col rounded-[22px] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-studio-cyan/12 px-2.5 py-1 text-2xs font-medium text-studio-cyan">{L(p.tag)}</span>
                    <button type="button" onClick={() => copyPreset(i)} className="grid size-8 place-items-center rounded-xl text-fg-subtle transition-colors hover:bg-surface-2/60 hover:text-fg" aria-label={L({ ko: "입력값 복사", en: "Copy inputs" })}>
                      {copied === i ? <Check size={14} className="text-studio-success" aria-hidden /> : <Copy size={14} aria-hidden />}
                    </button>
                  </div>
                  <h3 className="mt-3 font-semibold">{L(p.title)}</h3>
                  <ul className="mt-2 flex-1 space-y-1 text-sm text-fg-muted">
                    {presetLines(tool, p).slice(0, 3).map((line) => <li key={line} className="truncate" title={line}>{line}</li>)}
                  </ul>
                  <Link href={`/tools/${tool.id}/run?preset=${i}`} className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-studio-cyan">
                    {L({ ko: "이 예시로 열기", en: "Open with this" })}
                    <ArrowRight size={14} className="transition-transform duration-500 ease-[var(--spring)] group-hover:translate-x-1" aria-hidden />
                  </Link>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
            <div className="glass rounded-[24px] p-6">
              <h2 className="text-lg font-semibold">{L({ ko: "입력에서 결과까지", en: "From input to result" })}</h2>
              <ol className="relative mt-5 space-y-5 border-l border-hairline pl-6">
                {c.steps.map((s, i) => (
                  <li key={s.en} className="relative text-sm leading-relaxed">
                    <span className="studio-gradient-bg absolute top-0.5 -left-[33px] grid size-4.5 place-items-center rounded-full font-mono text-[9px] text-white ring-4 ring-[var(--color-bg)]">{i + 1}</span>
                    {L(s)}
                  </li>
                ))}
              </ol>
              {c.tips.length ? (
                <div className="mt-6 rounded-2xl bg-studio-warning/10 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-studio-warning"><Lightbulb size={14} aria-hidden /> {L({ ko: "팁", en: "Tips" })}</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg-muted">{c.tips.map((tip) => <li key={tip.en}>{L(tip)}</li>)}</ul>
                </div>
              ) : null}
            </div>
            <div className="glass rounded-[24px] p-6">
              <h2 className="text-lg font-semibold">{L({ ko: "이런 결과가 나와요", en: "What comes back" })}</h2>
              <pre className="mt-4 rounded-2xl border border-hairline bg-bg/40 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">{L(c.sample)}</pre>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">{L({ ko: "궁금한 점", en: "Questions" })}</h2>
            <div className="glass divide-y divide-hairline rounded-[24px]">
              {c.faq.map((f) => (
                <details key={f.q.en} className="smooth px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {L(f.q)}
                    <Plus size={16} className="smooth-plus shrink-0 text-fg-subtle" aria-hidden />
                  </summary>
                  <div className="smooth-body"><div><p className="pt-3 text-sm leading-relaxed text-fg-muted">{L(f.a)}</p></div></div>
                </details>
              ))}
            </div>
            <p className="mt-3 text-sm text-fg-muted">
              {L({ ko: "더 궁금하면", en: "More questions?" })} <Link href={`/help/contact?tool=${tool.id}`} className="text-studio-cyan hover:underline">{L({ ko: "도움말에서 물어보세요", en: "Ask in Help" })}</Link>
            </p>
          </section>

          {related.length ? (
            <section className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-sm text-fg-subtle">{L({ ko: "같은 분야", en: "Same area" })}</span>
              {related.map((t) => (
                <Link key={t.id} href={`/tools/${t.id}`} className="glass glass-hover inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
                  <t.icon size={14} className="text-studio-cyan" aria-hidden /> {name(t)}
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { ToolHome };
