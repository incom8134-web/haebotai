"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { catalogTool } from "@/lib/tools/catalog";

// After the profile is saved: straight on to a first result that uses it,
// rather than a toast and a dead end. A missing logo puts Logo Lab first.

export function BrandNextSteps({ hasLogo }: { hasLogo: boolean }) {
  const L = useBi();
  const slugs = hasLogo ? ["sales-page", "hook-lab", "brand-dna"] : ["logo-lab", "brand-dna", "sales-page"];
  const tools = slugs.map((s) => catalogTool(s)).filter((t) => !!t);
  return (
    <section aria-live="polite" className="mt-6 rounded-2xl border border-accent/30 bg-accent-dim/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-fg">
        <CheckCircle2 className="size-4 text-accent" aria-hidden />
        {L({ ko: "저장했어요. 이제 모든 도구가 이 프로필로 시작해요.", en: "Saved. Every tool now starts from this profile." })}
      </p>
      <p className="mt-1 text-xs break-keep text-fg-muted">{L({ ko: "바로 첫 결과물을 만들어 볼까요?", en: "Make a first result with it now?" })}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}/run`}
            className="group flex items-center gap-2.5 rounded-xl border border-hairline bg-surface p-3 transition-colors hover:border-accent/50"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-dim text-accent"><t.icon size={15} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{L(t.name)}</span>
              <span className="block truncate text-2xs text-fg-muted">{L(t.outputs[0])}</span>
            </span>
            <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
