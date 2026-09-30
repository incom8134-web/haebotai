"use client";

import { useMemo, useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { readRevenue, STREAM_ROLES, STREAM_TYPES, unitEconomics, WILLINGNESS } from "@/lib/tools/report/revenue-mapper";
import { SectionTitle, won } from "./shared";

// 수익 구조 지도 result: a flow diagram from customer segments to revenue
// streams (hover or tap a stream to trace who pays for it), the value
// ladder drawn as rising steps, and a unit-economics panel whose inputs
// the member can change to see customer value recompute on the page.

const ROLE_STYLE: Record<string, string> = {
  core: "border-accent bg-accent-dim",
  recurring: "border-ai bg-ai-dim",
  upsell: "border-hairline-str bg-surface-2",
  experimental: "border-dashed border-hairline-str bg-surface",
};

export function RevenueMap({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const { segments, streams, ladder, mix } = useMemo(() => readRevenue(output), [output]);
  const [active, setActive] = useState<number | null>(null);
  const baseUe = (output.unit_economics ?? {}) as Record<string, unknown>;
  const [ue, setUe] = useState(() => ({
    price_krw: Number(baseUe.price_krw) || 0,
    variable_cost_krw: Number(baseUe.variable_cost_krw) || 0,
    acquisition_cost_krw: Number(baseUe.acquisition_cost_krw) || 0,
    purchases_per_year: Number(baseUe.purchases_per_year) || 0,
    retention_years: Number(baseUe.retention_years) || 0,
  }));
  const calc = unitEconomics(ue);
  const edited = Object.entries(ue).some(([k, v]) => v !== (Number(baseUe[k]) || 0));

  // Diagram geometry: segments on the left, streams on the right.
  const rowH = 56;
  const h = Math.max(segments.length, streams.length, 1) * rowH;
  const yOf = (i: number, n: number) => (h / n) * (i + 0.5);
  const segIndex = new Map(segments.map((s, i) => [s.id, i]));
  const activeSegs = active === null ? null : new Set(streams[active]?.segmentIds ?? []);
  const maxLadder = Math.max(1, ...ladder.map((l) => l.price));

  return (
    <div className="mt-3 flex flex-col gap-6">
      {output.business_summary ? <p className="text-sm leading-relaxed text-fg-muted break-keep">{String(output.business_summary)}</p> : null}

      <section>
        <SectionTitle kicker={L({ ko: "지도", en: "Map" })} title={L({ ko: "누가 무엇에 돈을 내나", en: "Who pays for what" })} lead={L({ ko: "수익원을 누르면 그 돈을 내는 고객이 보여요.", en: "Tap a stream to see who pays for it." })} />
        <div className="relative grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1.4fr)] sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1.4fr)]" style={{ minHeight: h }}>
          <ul className="flex flex-col justify-around gap-2">
            {segments.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-xl border border-hairline bg-surface p-2.5 transition-opacity",
                  activeSegs && !activeSegs.has(s.id) && "opacity-40",
                )}
              >
                <p className="text-sm font-semibold text-fg break-keep">{s.name}</p>
                <p className="mt-0.5 text-2xs text-fg-subtle break-keep">{s.paysFor}</p>
                <p className="mt-1 text-2xs text-fg-muted">
                  {L({ ko: "지불 의향", en: "Willingness" })}: {WILLINGNESS[s.willingness] ?? s.willingness}
                </p>
              </li>
            ))}
          </ul>
          <svg className="h-full w-full" viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" aria-hidden>
            {streams.flatMap((st, si) =>
              st.segmentIds
                .filter((id) => segIndex.has(id))
                .map((id) => {
                  const y1 = yOf(segIndex.get(id)!, segments.length);
                  const y2 = yOf(si, streams.length);
                  const on = active === null || active === si;
                  return (
                    <path
                      key={`${si}-${id}`}
                      d={`M0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={on ? 2 : 1}
                      strokeOpacity={on ? 0.7 : 0.15}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }),
            )}
          </svg>
          <ul className="flex flex-col justify-around gap-2">
            {streams.map((st, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={active === i}
                  onClick={() => setActive(active === i ? null : i)}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  className={cn("w-full rounded-xl border p-2.5 text-left transition-opacity", ROLE_STYLE[st.role] ?? "border-hairline", active !== null && active !== i && "opacity-50")}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-fg break-keep">{st.name}</span>
                    <span className="text-2xs text-fg-subtle">
                      {STREAM_ROLES[st.role] ?? st.role} · {STREAM_TYPES[st.type] ?? st.type}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs font-medium tabular-nums text-fg">
                    {st.low && st.high && st.low !== st.high ? `${won(st.low)}~${won(st.high)}` : won(st.high || st.low)}
                    {st.frequency ? <span className="font-normal text-fg-subtle"> / {st.frequency}</span> : null}
                  </span>
                  {active === i ? (
                    <span className="mt-1.5 block text-2xs leading-relaxed text-fg-muted break-keep">
                      {st.what}
                      {st.weeks ? ` · ${L({ ko: "첫 매출까지", en: "first revenue in" })} ${st.weeks}${L({ ko: "주", en: " wks" })}` : ""}
                      {st.margin ? ` · ${st.margin}` : ""}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {ladder.length > 0 ? (
        <section>
          <SectionTitle kicker={L({ ko: "가치 사다리", en: "Value ladder" })} title={L({ ko: "첫 구매에서 프리미엄까지", en: "From first purchase to premium" })} />
          <ol className="flex items-end gap-2 overflow-x-auto pb-1">
            {ladder.map((l, i) => (
              <li key={i} className="flex min-w-36 flex-1 flex-col justify-end">
                <div
                  className="flex flex-col justify-end rounded-t-xl border border-b-0 border-hairline bg-gradient-to-t from-accent-dim to-surface p-3"
                  style={{ minHeight: `${5 + (l.price / maxLadder) * 7}rem` }}
                >
                  <p className="text-2xs font-semibold text-accent">{l.step}</p>
                  <p className="mt-0.5 text-sm font-semibold text-fg break-keep">{l.offer}</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{won(l.price)}</p>
                  <p className="mt-1 text-2xs leading-relaxed text-fg-muted break-keep">{l.purpose}</p>
                </div>
                <div className="h-1.5 rounded-b bg-accent" style={{ opacity: 0.35 + (0.65 * (i + 1)) / ladder.length }} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="rounded-2xl border border-hairline bg-surface p-4">
        <SectionTitle
          kicker={L({ ko: "단위 경제성", en: "Unit economics" })}
          title={L({ ko: "고객 한 명이 남기는 것", en: "What one customer is worth" })}
          lead={L({ ko: "숫자를 바꿔 보면 바로 다시 계산돼요. 처음 값은 AI의 추정입니다.", en: "Change the numbers to recompute. Starting values are the AI's estimates." })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["price_krw", { ko: "가격", en: "Price" }, "원"],
                ["variable_cost_krw", { ko: "건당 변동비", en: "Variable cost" }, "원"],
                ["acquisition_cost_krw", { ko: "고객 확보 비용", en: "Acquisition cost" }, "원"],
                ["purchases_per_year", { ko: "연 구매 횟수", en: "Purchases / year" }, L({ ko: "회", en: "×" })],
                ["retention_years", { ko: "유지 기간", en: "Years retained" }, L({ ko: "년", en: "yrs" })],
              ] as const
            ).map(([key, label, unit]) => (
              <label key={key} className="flex flex-col gap-1 text-2xs text-fg-subtle">
                {L(label)}
                <span className="flex items-center gap-1 rounded-lg border border-hairline bg-bg px-2 py-1.5 focus-within:border-accent">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={key === "retention_years" ? 0.5 : 1}
                    value={ue[key]}
                    onChange={(e) => setUe((u) => ({ ...u, [key]: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-full min-w-0 bg-transparent text-sm tabular-nums text-fg outline-none"
                  />
                  <span className="shrink-0">{unit}</span>
                </span>
              </label>
            ))}
            {edited ? (
              <button
                type="button"
                onClick={() =>
                  setUe({
                    price_krw: Number(baseUe.price_krw) || 0,
                    variable_cost_krw: Number(baseUe.variable_cost_krw) || 0,
                    acquisition_cost_krw: Number(baseUe.acquisition_cost_krw) || 0,
                    purchases_per_year: Number(baseUe.purchases_per_year) || 0,
                    retention_years: Number(baseUe.retention_years) || 0,
                  })
                }
                className="self-end rounded-lg border border-hairline px-2 py-1.5 text-xs text-fg-muted hover:text-fg"
              >
                {L({ ko: "처음 값으로", en: "Reset" })}
              </button>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-2" aria-live="polite">
            {[
              [L({ ko: "건당 마진", en: "Margin / sale" }), won(calc.margin)],
              [L({ ko: "고객 생애 가치", en: "Customer value" }), won(calc.ltv)],
              [L({ ko: "확보 비용 뺀 가치", en: "Value after CAC" }), won(calc.net)],
              [L({ ko: "가치 ÷ 확보 비용", en: "Value ÷ CAC" }), calc.ratio ? `${calc.ratio.toFixed(1)}×` : "—"],
            ].map(([k, v], i) => (
              <div key={k} className={cn("rounded-xl p-3", i === 3 ? (calc.ratio >= 3 ? "bg-grounded-dim" : "bg-warn/15") : "bg-surface-2")}>
                <dt className="text-2xs text-fg-subtle">{k}</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-fg">{v}</dd>
              </div>
            ))}
            <p className="col-span-2 text-2xs leading-relaxed text-fg-subtle">
              {L({ ko: "고객 생애 가치 = (가격 − 변동비) × 연 구매 횟수 × 유지 기간. 가치가 확보 비용의 3배 이상이면 건강한 편입니다.", en: "Customer value = (price − variable cost) × purchases/yr × years. Above 3× acquisition cost is generally healthy." })}
            </p>
          </dl>
        </div>
      </section>

      {mix.start_with ? (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4 md:col-span-2">
            <p className="text-2xs font-semibold text-accent">{L({ ko: "먼저 시작", en: "Start with" })}</p>
            <p className="mt-1 text-base font-bold text-fg break-keep">{String(mix.start_with)}</p>
            {mix.reason ? <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{String(mix.reason)}</p> : null}
            {mix.add_next ? (
              <p className="mt-2 text-xs text-fg-muted break-keep">
                {L({ ko: "다음", en: "Next" })}: {String(mix.add_next)}
              </p>
            ) : null}
          </div>
          {Array.isArray(mix.avoid_for_now) && mix.avoid_for_now.length ? (
            <div className="rounded-2xl border border-hairline p-4">
              <p className="text-2xs font-semibold text-fg-subtle">{L({ ko: "지금은 미룰 것", en: "Not yet" })}</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-xs text-fg-muted">
                {(mix.avoid_for_now as unknown[]).map((a, i) => (
                  <li key={i} className="break-keep">· {String(a)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {Array.isArray(output.assumptions) && output.assumptions.length ? (
        <details className="text-xs text-fg-muted">
          <summary className="cursor-pointer text-fg-subtle">{L({ ko: "가정 보기", en: "Assumptions" })}</summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {(output.assumptions as unknown[]).map((a, i) => (
              <li key={i} className="break-keep">· {String(a)}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
