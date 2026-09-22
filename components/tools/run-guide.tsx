"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Headset, Lightbulb, WandSparkles } from "lucide-react";
import { getToolContent } from "@/lib/tools/content";
import { useBi } from "@/lib/i18n/context";
import { Plus } from "lucide-react";

// Guide rail beside every tool's run form: examples that refill the form,
// tips, what a result looks like, and where to get help — so suggestions
// and help live inside each AI, not only on its overview page.
export function RunGuide({ toolId, onPreset }: { toolId: string; onPreset: (index: number) => void }) {
  const L = useBi();
  const c = getToolContent(toolId);
  if (!c) return null;
  return (
    <div className="space-y-4">
      <section className="glass rounded-[24px] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><WandSparkles size={15} className="text-studio-cyan" aria-hidden /> {L({ ko: "예시로 채우기", en: "Fill with an example" })}</p>
        <div className="mt-3 space-y-1.5">
          {c.presets.map((p, i) => (
            <button key={p.title.en} type="button" onClick={() => onPreset(i)} className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2/50">
              <span className="min-w-0">
                <span className="block truncate font-medium">{L(p.title)}</span>
                <span className="block text-2xs text-fg-subtle">{L(p.tag)}</span>
              </span>
              <Plus size={14} className="shrink-0 text-fg-subtle transition-transform duration-500 ease-[var(--spring)] group-hover:rotate-90 group-hover:text-studio-cyan" aria-hidden />
            </button>
          ))}
        </div>
      </section>
      {c.tips.length ? (
        <section className="rounded-[24px] bg-studio-warning/10 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-studio-warning"><Lightbulb size={15} aria-hidden /> {L({ ko: "팁", en: "Tips" })}</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-fg-muted">{c.tips.map((t) => <li key={t.en}>{L(t)}</li>)}</ul>
        </section>
      ) : null}
      <details className="smooth glass rounded-[24px] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          {L({ ko: "결과 미리보기", en: "What you'll get" })}
          <Plus size={14} className="smooth-plus text-fg-subtle" aria-hidden />
        </summary>
        <div className="smooth-body"><div><pre className="mt-3 rounded-xl border border-hairline bg-bg/40 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{L(c.sample)}</pre></div></div>
      </details>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm">
        <Link href={`/tools/${toolId}`} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><BookOpen size={13} aria-hidden /> {L({ ko: "사용법·FAQ", en: "How-to & FAQ" })}</Link>
        <Link href={`/help/contact?tool=${toolId}`} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><Headset size={13} aria-hidden /> {L({ ko: "문의하기", en: "Ask support" })} <ArrowUpRight size={12} aria-hidden /></Link>
      </div>
    </div>
  );
}
