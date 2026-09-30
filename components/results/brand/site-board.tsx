"use client";

import { Home } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { SitePreview } from "@/components/results/site-preview";
import { Kicker } from "@/components/results/discover/shared";

// 웹 익스피리언스 빌더 result: the sitemap — the page's sections in scroll
// order with what each one is for — above the live PC/mobile preview.
// Runs from before the sitemap was stored show section titles only.

export function SiteBoard({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const planned = objs(output.sitemap).map((s) => ({ title: str(s.title), goal: str(s.goal), layout: str(s.layout) }));
  const nodes = planned.length ? planned : strs(output.sections).map((title) => ({ title, goal: "", layout: "" }));
  const design = obj(output.design);

  return (
    <div className="mt-3 flex flex-col gap-5">
      {nodes.length ? (
        <section className="rounded-2xl border border-hairline bg-surface-2/40 p-4">
          <Kicker>{L({ ko: "사이트맵", en: "Sitemap" })}</Kicker>
          <div className="mt-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-accent bg-accent-dim px-3 py-2 text-sm font-semibold text-fg">
              <Home className="size-4 shrink-0 text-accent" aria-hidden />
              {L({ ko: "첫 화면", en: "Home" })}
              {str(design.hero) ? <span className="line-clamp-1 text-2xs font-normal text-fg-muted">· {str(design.hero)}</span> : null}
            </div>
            <ol className="mt-2 ml-4 grid gap-2 border-l-2 border-hairline-str pl-4 md:grid-cols-2">
              {nodes.map((n, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-5 -left-4 h-0.5 w-4 bg-hairline-str" aria-hidden />
                  <div className="h-full rounded-xl border border-hairline bg-surface px-3 py-2">
                    <p className="text-sm font-semibold text-fg break-keep">
                      <span className="mr-1.5 text-2xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                      {n.title}
                    </p>
                    {n.goal ? <p className="mt-0.5 text-xs text-fg-muted break-keep">{n.goal}</p> : null}
                    {n.layout ? <p className="mt-0.5 text-2xs text-fg-subtle break-keep">{n.layout}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
      <SitePreview html={String(output.html)} design={design as Parameters<typeof SitePreview>[0]["design"]} />
    </div>
  );
}
