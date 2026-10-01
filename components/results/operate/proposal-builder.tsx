"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker, won } from "@/components/results/discover/shared";

// 제안서 포지 result: the proposal as sections the member can reorder and
// switch off, then copy as one text in that order (the downloads keep the
// standard order). The pricing table adds up the items and shows VAT.

type Section = { id: string; title: { ko: string; en: string }; text: string };

function sectionsOf(o: Record<string, unknown>): Section[] {
  const scope = (o.scope ?? {}) as Record<string, unknown>;
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return [
    { id: "cover", title: { ko: "표지", en: "Cover" }, text: str(o.cover) },
    { id: "summary", title: { ko: "요약", en: "Executive summary" }, text: str(o.executive_summary) },
    { id: "problem", title: { ko: "문제", en: "Problem" }, text: str(o.problem) },
    { id: "solution", title: { ko: "해결", en: "Solution" }, text: str(o.solution) },
    {
      id: "outcomes",
      title: { ko: "기대 효과", en: "Expected outcomes" },
      text: objs(o.expected_outcomes).map((e) => `- ${str(e.metric)}: ${str(e.current)} → ${str(e.target)}`).join("\n"),
    },
    {
      id: "scope",
      title: { ko: "범위", en: "Scope" },
      text: [strs(scope.included).length ? `포함\n${list(strs(scope.included))}` : "", strs(scope.excluded).length ? `제외\n${list(strs(scope.excluded))}` : ""].filter(Boolean).join("\n\n"),
    },
    { id: "plan", title: { ko: "실행 계획", en: "Execution plan" }, text: strs(o.execution_plan).map((x, i) => `${i + 1}. ${x}`).join("\n") },
    { id: "timeline", title: { ko: "일정", en: "Timeline" }, text: objs(o.timeline).map((t) => `- ${str(t.phase)} (${Number(t.weeks) || 0}주): ${str(t.deliverable)}`).join("\n") },
    { id: "why", title: { ko: "왜 우리인가", en: "Why us" }, text: list(strs(o.why_us)) },
    { id: "company", title: { ko: "회사 소개", en: "About us" }, text: str(o.company_intro) },
  ].filter((s) => s.text.trim());
}

export function ProposalBuilder({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const all = sectionsOf(output);
  const [order, setOrder] = useState(() => all.map((s) => s.id));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const byId = new Map(all.map((s) => [s.id, s]));
  const ordered = order.map((id) => byId.get(id)).filter((s): s is Section => Boolean(s));
  const pricing = objs(output.pricing_table).map((p) => ({ item: str(p.item), amount: Number(p.amount_krw) || 0 }));
  const subtotal = pricing.reduce((a, p) => a + p.amount, 0);
  const pricingText = pricing.length ? `견적\n${pricing.map((p) => `- ${p.item}: ${won(p.amount)}`).join("\n")}\n합계(VAT 별도): ${won(subtotal)}` : "";
  const fullText = [...ordered.filter((s) => !hidden.has(s.id)).map((s) => `## ${L(s.title)}\n${s.text}`), pricingText].filter(Boolean).join("\n\n");

  const move = (i: number, d: -1 | 1) =>
    setOrder((o) => {
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="mt-3 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-fg-muted">{L({ ko: "순서를 바꾸거나 뺀 뒤 한 번에 복사하세요. 받은 파일은 기본 순서를 유지해요.", en: "Reorder or hide sections, then copy them all. Downloads keep the standard order." })}</p>
        <CopyButton text={fullText} label={L({ ko: "이 순서로 전체 복사", en: "Copy all in this order" })} className="ml-auto" />
      </div>

      <ol className="flex flex-col gap-2">
        {ordered.map((s, i) => {
          const off = hidden.has(s.id);
          return (
            <li key={s.id} className={cn("rounded-2xl border border-hairline bg-surface p-4 transition-opacity", off && "opacity-45")}>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-2xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm font-semibold text-fg">{L(s.title)}</p>
                <span className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={L({ ko: "위로", en: "Move up" })} className="rounded-md border border-hairline p-1 text-fg-muted hover:text-fg disabled:opacity-30">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === ordered.length - 1} aria-label={L({ ko: "아래로", en: "Move down" })} className="rounded-md border border-hairline p-1 text-fg-muted hover:text-fg disabled:opacity-30">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={off}
                    onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                    aria-label={off ? L({ ko: "다시 넣기", en: "Include" }) : L({ ko: "빼기", en: "Leave out" })}
                    className="rounded-md border border-hairline p-1 text-fg-muted hover:text-fg"
                  >
                    {off ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <CopyButton text={s.text} className="px-1.5" />
                </span>
              </div>
              {!off ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted break-keep">{s.text}</p> : null}
            </li>
          );
        })}
      </ol>

      {pricing.length ? (
        <section className="rounded-2xl border border-hairline p-4">
          <div className="flex items-center gap-2">
            <Kicker>{L({ ko: "견적", en: "Pricing" })}</Kicker>
            <CopyButton text={pricingText} className="ml-auto" />
          </div>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {pricing.map((p, i) => (
                <tr key={i} className="border-b border-hairline">
                  <td className="py-1.5 pr-3 text-fg break-keep">{p.item}</td>
                  <td className="py-1.5 text-right tabular-nums text-fg">{won(p.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 pr-3 text-fg-muted">{L({ ko: "합계 (VAT 별도)", en: "Subtotal (excl. VAT)" })}</td>
                <td className="pt-2 text-right font-semibold tabular-nums text-fg">{won(subtotal)}</td>
              </tr>
              <tr>
                <td className="pr-3 text-fg-muted">{L({ ko: "부가세 10%", en: "VAT 10%" })}</td>
                <td className="text-right tabular-nums text-fg-muted">{won(Math.round(subtotal * 0.1))}</td>
              </tr>
              <tr>
                <td className="pt-1 pr-3 font-semibold text-fg">{L({ ko: "총액 (VAT 포함)", en: "Total (incl. VAT)" })}</td>
                <td className="pt-1 text-right text-base font-bold tabular-nums text-accent">{won(Math.round(subtotal * 1.1))}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
