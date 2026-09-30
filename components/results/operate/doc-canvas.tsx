"use client";

import { useMemo } from "react";
import { useBi } from "@/lib/i18n/context";
import { buildReport } from "@/lib/tools/report";
import { ReportView } from "@/components/results/report-view";

// 비즈니스 문서 스튜디오 result: the document with its outline — a sticky
// table of contents (tap to jump) beside the rendered plan, so a long
// business plan reads like a document rather than one long scroll.

export function DocCanvas({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const report = useMemo(() => buildReport("business-plan", output, input), [output, input]);
  if (!report) return null;
  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={L({ ko: "문서 목차", en: "Document outline" })} className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-2xs font-semibold text-fg-subtle">{L({ ko: "목차", en: "Outline" })}</p>
        <ol className="mt-2 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
          {report.sections.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <a href={`#r-${s.id}`} className="block rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-fg-muted hover:border-accent hover:text-fg lg:border-0 lg:px-2">
                <span className="mr-1.5 font-mono text-2xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="min-w-0">
        <ReportView report={report} />
      </div>
    </div>
  );
}
