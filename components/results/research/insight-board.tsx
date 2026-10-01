"use client";

import { useState } from "react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { quoteFound } from "@/lib/tools/quote-check";
import { objs, str, strs } from "@/lib/tools/report/util";
import { Kicker, SectionTitle } from "@/components/results/discover/shared";

// 인사이트 마이너 result: theme cards sized by how often they come up,
// with a positive / neutral / negative bar and quotes that are checked
// against the text the member pasted — a quote that can't be found is
// flagged, never shown as verified. Filter by complaint / praise /
// request / question; opportunities and caveats follow.

const KIND: Record<string, { ko: string; en: string; cls: string }> = {
  complaint: { ko: "불만", en: "Complaint", cls: "bg-danger/10 text-danger" },
  praise: { ko: "칭찬", en: "Praise", cls: "bg-grounded-dim text-grounded" },
  request: { ko: "요청", en: "Request", cls: "bg-accent-dim text-accent" },
  question: { ko: "질문", en: "Question", cls: "bg-ai-dim text-ai" },
};

export function InsightBoard({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const source = String(input?.data ?? "");
  const themes = objs(output.themes)
    .map((t) => ({
      name: str(t.name),
      kind: str(t.kind),
      description: str(t.description),
      mentions: Number(t.mentions) || 0,
      pos: Number(t.positive) || 0,
      neg: Number(t.negative) || 0,
      neu: Number(t.neutral) || 0,
      quotes: strs(t.quotes).map((q) => ({ text: q, found: source ? quoteFound(q, source) : null })),
    }))
    .sort((a, b) => b.mentions - a.mentions);
  const [kind, setKind] = useState("");
  const shown = themes.filter((t) => !kind || t.kind === kind);
  const most = Math.max(1, ...themes.map((t) => t.mentions));
  const allQuotes = themes.flatMap((t) => t.quotes);
  const missing = allQuotes.filter((q) => q.found === false).length;

  return (
    <div className="mt-3 flex flex-col gap-5">
      <section className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-sm leading-relaxed text-fg break-keep">{str(output.summary)}</p>
        <p className="mt-2 flex flex-wrap gap-3 text-2xs text-fg-muted">
          <span>{L({ ko: `읽은 자료 ${Number(output.items_read) || 0}건`, en: `${Number(output.items_read) || 0} items read` })}</span>
          <span>{L({ ko: `주제 ${themes.length}개`, en: `${themes.length} themes` })}</span>
          {source ? (
            <span className={missing ? "text-warn" : "text-grounded"}>
              {missing
                ? L({ ko: `인용 ${allQuotes.length}개 중 ${missing}개는 원문에서 찾지 못했어요`, en: `${missing} of ${allQuotes.length} quotes not found in your text` })
                : L({ ko: `인용 ${allQuotes.length}개 모두 원문에서 확인됨`, en: `All ${allQuotes.length} quotes found in your text` })}
            </span>
          ) : null}
        </p>
      </section>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={L({ ko: "종류", en: "Kind" })}>
        {["", ...Object.keys(KIND)].map((k) => (
          <button key={k || "all"} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("rounded-full border px-2.5 py-1 text-xs", kind === k ? "border-accent bg-accent text-white" : "border-hairline text-fg-muted hover:text-fg")}>
            {k ? L(KIND[k]) : L({ ko: "전체", en: "All" })} ({k ? themes.filter((t) => t.kind === k).length : themes.length})
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((t, i) => {
          const sum = Math.max(1, t.pos + t.neu + t.neg);
          return (
            <article key={i} className="rounded-2xl border border-hairline bg-surface p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {KIND[t.kind] ? <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", KIND[t.kind].cls)}>{L(KIND[t.kind])}</span> : null}
                <p className="text-base font-bold text-fg break-keep">{t.name}</p>
                <span className="ml-auto text-sm font-bold tabular-nums text-fg">{t.mentions}{L({ ko: "건", en: "" })}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full bg-fg/60" style={{ width: `${(t.mentions / most) * 100}%` }} />
              </div>
              {t.description ? <p className="mt-2 text-xs leading-relaxed text-fg-muted break-keep">{t.description}</p> : null}
              <div className="mt-2 flex h-2 overflow-hidden rounded-full" role="img" aria-label={`${L({ ko: "긍정", en: "positive" })} ${t.pos}, ${L({ ko: "중립", en: "neutral" })} ${t.neu}, ${L({ ko: "부정", en: "negative" })} ${t.neg}`}>
                <span className="bg-grounded" style={{ width: `${(t.pos / sum) * 100}%` }} />
                <span className="bg-hairline-str" style={{ width: `${(t.neu / sum) * 100}%` }} />
                <span className="bg-danger" style={{ width: `${(t.neg / sum) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-fg-subtle">
                {L({ ko: "긍정", en: "Pos" })} {t.pos} · {L({ ko: "중립", en: "Neu" })} {t.neu} · {L({ ko: "부정", en: "Neg" })} {t.neg}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {t.quotes.map((q, j) => (
                  <li key={j} className="flex gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs leading-relaxed text-fg break-keep">
                    {q.found === true ? <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-grounded" aria-label={L({ ko: "원문 확인됨", en: "Found in text" })} /> : q.found === false ? <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-label={L({ ko: "원문에서 찾지 못함", en: "Not found in text" })} /> : null}
                    <span>“{q.text}”{q.found === false ? <span className="ml-1 text-[10px] text-warn">{L({ ko: "원문에서 찾지 못함", en: "not found in text" })}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {objs(output.opportunities).length ? (
        <section>
          <SectionTitle kicker={L({ ko: "할 일", en: "Actions" })} title={L({ ko: "고객이 말한 것에서 나온 할 일", en: "What to do, from what customers said" })} />
          <ul className="flex flex-col gap-2">
            {objs(output.opportunities).map((o, i) => (
              <li key={i} className="rounded-xl border border-hairline p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-fg break-keep">
                  {str(o.title)}
                  <span className="ml-auto rounded bg-surface-2 px-1.5 text-2xs font-medium text-fg-muted">{str(o.effort)}</span>
                </p>
                <p className="mt-0.5 text-xs text-fg-muted break-keep">{str(o.action)}</p>
                {str(o.based_on) ? <p className="mt-0.5 text-2xs text-fg-subtle break-keep">{L({ ko: "근거", en: "Based on" })}: {str(o.based_on)}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {strs(output.caveats).length ? (
        <div className="text-2xs text-fg-subtle break-keep">
          <Kicker>{L({ ko: "해석할 때 주의", en: "Caveats" })}</Kicker>
          {strs(output.caveats).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
