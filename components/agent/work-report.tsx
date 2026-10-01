"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, FileSearch, Globe, Info } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { WorkReport } from "@/lib/agents/core/doc-agent";

// How a document was made, for the member to check (lib/agents/core):
// what kind of task it was read as, which checks the result passed
// (targets against measured values — the rendered page count included),
// which sources and research it used, conflicts between them, the
// assumptions it made, and what happened to each original section.

const STATUS: Record<string, { ko: string; en: string }> = {
  kept: { ko: "원문 그대로", en: "Kept verbatim" },
  polished: { ko: "문장만 다듬음", en: "Polished" },
  rewritten: { ko: "다시 씀", en: "Rewritten" },
  new: { ko: "새로 씀", en: "New" },
};

export function WorkReportCard({ report }: { report: WorkReport }) {
  const L = useBi();
  const [open, setOpen] = useState(false);
  const failed = report.checks.filter((c) => !c.pass && c.severity !== "info");
  const passed = report.checks.filter((c) => c.pass && c.severity !== "info").length;
  const counted = report.checks.filter((c) => c.severity !== "info").length;

  return (
    <section className="mt-3 rounded-2xl border border-hairline bg-surface-2/50">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <ClipboardCheck className="size-4 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">
            {L({ ko: "작업 보고서", en: "Work report" })} · {report.modeLabel}
          </span>
          <span className="block truncate text-2xs text-fg-muted">
            {L({ ko: `검증 ${passed}/${counted} 통과`, en: `${passed}/${counted} checks passed` })}
            {report.renderedPages ? ` · ${L({ ko: `실제 ${report.renderedPages}쪽`, en: `${report.renderedPages} pages rendered` })}` : ""}
            {failed.length ? ` · ${L({ ko: `확인 필요 ${failed.length}`, en: `${failed.length} to check` })}` : ""}
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-fg-subtle transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-hairline px-4 py-4 text-xs">
          <p className="leading-relaxed break-keep text-fg-muted">{report.reason}</p>

          {report.contract.explicit.length || report.contract.length ? (
            <div>
              <p className="font-semibold text-fg">{L({ ko: "요청에서 읽은 요구사항", en: "Requirements read from the request" })}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {report.contract.length ? <li className="rounded-full bg-surface px-2 py-0.5 text-fg">{L({ ko: "분량", en: "Length" })} {report.contract.length}</li> : null}
                {report.contract.explicit.map((e) => (
                  <li key={e} className="rounded-full bg-surface px-2 py-0.5 text-fg">“{e}”</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="font-semibold text-fg">{L({ ko: "자동 검증", en: "Verification" })}</p>
            <table className="mt-1 w-full border-collapse">
              <tbody>
                {report.checks.map((c) => (
                  <tr key={c.label} className="border-t border-hairline first:border-0">
                    <td className="py-1.5 pr-2 align-top">
                      {c.severity === "info" ? <Info className="size-3.5 text-fg-subtle" aria-label="info" /> : c.pass ? <CheckCircle2 className="size-3.5 text-grounded" aria-label={L({ ko: "통과", en: "Passed" })} /> : <CircleAlert className="size-3.5 text-warn" aria-label={L({ ko: "확인 필요", en: "Check" })} />}
                    </td>
                    <td className="py-1.5 pr-2 align-top font-medium text-fg">{c.label}</td>
                    <td className="py-1.5 pr-2 align-top text-fg-subtle">{c.target}</td>
                    <td className="py-1.5 align-top text-fg">{c.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.source?.length ? (
            <div>
              <p className="flex items-center gap-1 font-semibold text-fg"><FileSearch className="size-3.5" aria-hidden /> {L({ ko: "올린 자료", en: "Your sources" })}</p>
              <ul className="mt-1 space-y-0.5 text-fg-muted">
                {report.source.map((s) => (
                  <li key={s.name}>
                    {s.name}
                    {s.pages ? ` · ${s.pages}${L({ ko: "쪽", en: "p" })}` : ""} · {L({ ko: `섹션 ${s.sections}개 분석`, en: `${s.sections} sections analyzed` })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.research ? (
            <div>
              <p className="flex items-center gap-1 font-semibold text-fg"><Globe className="size-3.5" aria-hidden /> {L({ ko: `외부 조사 — 출처 ${report.research.sources}개, 사실 ${report.research.facts}개`, en: `Research — ${report.research.sources} sources, ${report.research.facts} facts` })}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-muted">
                {report.research.questions.map((q) => (
                  <li key={q}>{q}{report.research!.unanswered.includes(q) ? L({ ko: " (답을 찾지 못함)", en: " (unanswered)" }) : ""}</li>
                ))}
              </ul>
              {report.research.conflicts.length ? (
                <div className="mt-2 rounded-xl bg-warn/10 p-2.5">
                  <p className="font-semibold text-fg">{L({ ko: "자료와 조사가 다른 곳 — 올린 자료를 유지했어요", en: "Where research disagreed — your source was kept" })}</p>
                  <ul className="mt-1 space-y-1 text-fg-muted">
                    {report.research.conflicts.map((c, i) => (
                      <li key={i}>
                        {L({ ko: "자료", en: "Source" })}: {c.source} / {L({ ko: "조사", en: "Research" })}: {c.research}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {report.assumptions.length ? (
            <div>
              <p className="font-semibold text-fg">{L({ ko: "가정으로 쓴 것 — 확인해 주세요", en: "Assumptions — please check" })}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-muted">
                {report.assumptions.slice(0, 10).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.changes.length ? (
            <div>
              <p className="font-semibold text-fg">{L({ ko: "섹션별 변경", en: "What happened to each section" })}</p>
              <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                {report.changes.slice(0, 40).map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1">
                    <span className="min-w-0 flex-1 truncate text-fg">{c.title || "—"}</span>
                    <span className="shrink-0 text-2xs text-fg-subtle">{L(STATUS[c.status] ?? STATUS.new)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
