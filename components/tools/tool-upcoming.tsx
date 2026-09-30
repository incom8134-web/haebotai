"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Hammer, PackageCheck } from "lucide-react";
import { CATEGORIES, catalogTool, toolsIn, type CatalogTool } from "@/lib/tools/catalog";
import { useBi } from "@/lib/i18n/context";
import { secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// A tool that is announced but not built yet (no engine in the catalog).
// It says exactly that: what the tool will produce and which working tools
// cover part of the job today. Nothing here can be run or pretends to run.

export function ToolUpcoming({ slug }: { slug: string }) {
  const L = useBi();
  const tool = catalogTool(slug)!;
  const category = CATEGORIES[tool.category];
  const live = (t: CatalogTool | undefined): t is CatalogTool => Boolean(t && t.engine && !t.hidden);
  const related = [...tool.next.map((s) => catalogTool(s)), ...toolsIn(tool.category)].filter(live).filter((t, i, all) => t.slug !== slug && all.findIndex((x) => x.slug === t.slug) === i).slice(0, 4);

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <Link href={`/tools?category=${tool.category}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> {L(category.name)}
      </Link>

      <section className="rounded-[28px] border border-hairline bg-surface p-6 md:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-dim text-accent">
            <tool.icon size={24} aria-hidden />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs text-fg-muted">
            <Hammer size={13} aria-hidden /> {L({ ko: "만드는 중 · 곧 공개", en: "In the works · coming soon" })}
          </span>
        </div>
        <h1 className="mt-5 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L(tool.name)}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed break-keep text-fg-muted">{L(tool.promise)}</p>

        <h2 className="mt-8 text-sm font-semibold">{L({ ko: "이 도구가 만들어 줄 것", en: "What it will produce" })}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {tool.outputs.map((o) => (
            <li key={o.en} className="flex items-start gap-2 rounded-2xl border border-hairline bg-bg p-3 text-sm break-keep">
              <PackageCheck size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {L(o)}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed break-keep text-fg-subtle">
          {L({
            ko: "아직 실행할 수 없는 도구예요. 공개되면 도구 목록과 이 페이지에서 바로 시작할 수 있어요. 크레딧은 실행할 때만 사용됩니다.",
            en: "This tool can't be run yet. Once it launches you can start it from the tools list and this page. Credits are only used when you run a tool.",
          })}
        </p>
      </section>

      {related.length ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold break-keep">{L({ ko: "지금 바로 쓸 수 있는 관련 도구", en: "Related tools you can use today" })}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="group flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-accent/50">
                <t.icon size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold break-keep">{L(t.name)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed break-keep text-fg-muted">{L(t.promise)}</span>
                </span>
                <ArrowRight size={16} className="ml-auto shrink-0 self-center text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/tools" className={cn(secondaryButton, "mt-8 inline-flex")}>
        {L({ ko: "전체 도구 보기", en: "See all tools" })}
      </Link>
    </div>
  );
}
