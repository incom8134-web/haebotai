"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { OutputPreview } from "@/components/run-result";
import { useBi } from "@/lib/i18n/context";
import { catalogTool, toolSlug } from "@/lib/tools/catalog";
import type { Source } from "@/lib/tools/registry/shared";
import { primaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { OWN_KEY_ONLY } from "@/lib/site/access";

// A result someone shared (/share/<token>): read-only — no actions that
// need the owner's account — with its sources and a way to make one.

export function SharedResult({ toolId, title, output, input, sources, createdAt }: { toolId: string; title: string | null; output: unknown; input: Record<string, unknown>; sources: Source[]; createdAt: string }) {
  const L = useBi();
  const tool = catalogTool(toolId);
  const toolName = tool ? L(tool.name) : toolId;
  const date = createdAt.slice(0, 10);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-fg">
          <BrandMark size={28} /> {L({ ko: "해봇 AI", en: "Haebot AI" })}
        </Link>
        <Link href={`/tools/${toolSlug(toolId)}`} className={cn(primaryButton, "h-9 px-4 text-sm")}>
          {L({ ko: "나도 만들어 보기", en: "Make your own" })} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <p className="mt-8 text-xs text-fg-subtle">
        {toolName} · {date} · {L({ ko: "공유된 결과", en: "Shared result" })}
      </p>
      <h1 className="mt-1 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg">{title || toolName}</h1>

      <div className="mt-6">
        <OutputPreview output={output} toolId={toolId} input={input} sources={sources} />
      </div>

      {sources.length ? (
        <section className="mt-6 border-t border-hairline pt-4">
          <h2 className="font-mono text-2xs text-fg-subtle">
            {L({ ko: "출처", en: "Sources" })} ({sources.length})
          </h2>
          <ol className="mt-2 flex flex-col gap-1.5">
            {sources.map((s, i) => (
              <li key={i} id={`src-${i + 1}`} className="text-xs">
                <span className="mr-1.5 font-mono text-fg-subtle">[{i + 1}]</span>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {s.title}
                </a>
                {s.domain ? <span className="ml-1.5 text-fg-subtle">{s.domain}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="mt-6 flex items-start gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-2xs leading-relaxed break-keep text-fg-muted">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        {L({
          ko: "AI가 만든 결과물이에요. 사실, 숫자, 표현은 만든 사람이 확인해야 하며, 법률·세무·의료·투자 조언이 아닙니다.",
          en: "Made with AI. Facts, figures and wording are for the creator to check; this isn't legal, tax, medical or investment advice.",
        })}
      </p>

      <section className="mt-10 rounded-[24px] border border-hairline bg-surface p-6 text-center">
        <p className="font-display text-xl font-bold break-keep text-fg">{L({ ko: `이런 ${toolName} 결과, 내 사업으로도 만들어 보세요`, en: `Make a ${toolName} result for your own business` })}</p>
        <p className="mt-1 text-sm text-fg-muted">{OWN_KEY_ONLY ? L({ ko: "도구는 내 Gemini API 키로 실행해요", en: "Tools run on your own Gemini API key" }) : L({ ko: "가입하면 500 크레딧, 카드 등록 없음", en: "500 credits on sign-up, no card needed" })}</p>
        <Link href={`/tools/${toolSlug(toolId)}`} className={cn(primaryButton, "mt-4 inline-flex h-11 px-6")}>
          {L({ ko: "나도 만들어 보기", en: "Make your own" })} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
