"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, Copy, Headset, Lightbulb, Plus, WandSparkles } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { getToolContent } from "@/lib/tools/content";
import { presetLines } from "@/lib/tools/preset-lines";
import { useBi } from "@/lib/i18n/context";

// Guide rail beside every tool's run form: examples that refill the form,
// tips, what a result looks like, and where to get help — so suggestions
// and help live inside each AI, not only on its overview page. Preset
// cards mirror ToolHome's example gallery (same presetLines + copy
// pattern) so the run page isn't thinner than the overview page it links
// from.
export function RunGuide({ toolId, onPreset }: { toolId: string; onPreset: (index: number) => void }) {
  const L = useBi();
  const c = getToolContent(toolId);
  const tool = getTool(toolId);
  const [copied, setCopied] = useState<number | null>(null);
  if (!c || !tool) return null;

  async function copyPreset(i: number) {
    try {
      await navigator.clipboard.writeText(presetLines(tool!, c!.presets[i]).join("\n"));
      setCopied(i);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass rounded-[24px] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><WandSparkles size={15} className="text-studio-cyan" aria-hidden /> {L({ ko: "예시로 채우기", en: "Fill with an example" })}</p>
        <div className="mt-3 space-y-2">
          {c.presets.map((p, i) => (
            <div key={p.title.en} className="rounded-2xl border border-hairline bg-bg/30 p-3.5 transition-colors hover:border-hairline-str">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-studio-cyan/12 px-2.5 py-1 text-2xs font-medium text-studio-cyan">{L(p.tag)}</span>
                <button
                  type="button"
                  onClick={() => copyPreset(i)}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2/60 hover:text-fg"
                  aria-label={L({ ko: "입력값 복사", en: "Copy inputs" })}
                >
                  {copied === i ? <Check size={13} className="text-studio-success" aria-hidden /> : <Copy size={13} aria-hidden />}
                </button>
              </div>
              <button type="button" onClick={() => onPreset(i)} className="group mt-2.5 block w-full text-left">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {L(p.title)}
                  <Plus size={13} className="shrink-0 text-fg-subtle transition-transform duration-500 ease-[var(--spring)] group-hover:rotate-90 group-hover:text-studio-cyan" aria-hidden />
                </span>
                <ul className="mt-1.5 space-y-0.5">
                  {presetLines(tool, p).slice(0, 2).map((line) => (
                    <li key={line} className="truncate text-2xs text-fg-subtle" title={line}>{line}</li>
                  ))}
                </ul>
              </button>
            </div>
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
