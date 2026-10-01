"use client";

import { useMemo, type CSSProperties } from "react";
import { renderChart, WEB_THEME, type ChartSpec } from "@/lib/tools/report/charts";
import type { Report, ReportBlock, ReportCard, Tone } from "@/lib/tools/report/types";
import { cn } from "@/lib/utils";
import { useBi } from "@/lib/i18n/context";
import { Cited } from "@/components/results/cited";

// The data tools' result page (business plan, trend, 90-day plan, money
// models, keywords, place, proposal, strategy, grants): the report model
// from lib/tools/report drawn as a designed page — a hero band in the
// tool's own color with the headline numbers, then numbered sections of
// charts, tables and cards. Charts are laid out twice (phone and wide)
// so text stays readable at both sizes; wide tables become stacked
// cards on phones.

const TONE: Record<Tone, string> = {
  up: "text-grounded",
  down: "text-danger",
  warn: "text-warn",
  neutral: "text-fg",
};

export function Chart({ spec, palette, half }: { spec: ChartSpec; palette: string[]; half?: boolean }) {
  // A half-width chart sits in a ~320px column on desktop too, so it uses the narrow layout there.
  const [narrow, wide] = useMemo(
    () => [renderChart(spec, { width: 340, palette, theme: WEB_THEME }), half ? "" : renderChart(spec, { width: 680, palette, theme: WEB_THEME })],
    [spec, palette, half],
  );
  if (half) return narrow ? <div className="w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: narrow }} /> : null;
  if (!wide) return null;
  return (
    <>
      <div className="w-full sm:hidden [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: narrow }} />
      <div className="hidden w-full sm:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: wide }} />
    </>
  );
}

function BlockTitle({ title, estimated }: { title?: string; estimated?: boolean }) {
  const L = useBi();
  if (!title && !estimated) return null;
  return (
    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
      {title}
      {estimated ? <span className="rounded-full border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-2xs font-medium text-warn">{L({ ko: "추정", en: "Estimate" })}</span> : null}
    </p>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 100 30" className="h-7 w-24" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} style={{ fill: "none", stroke: up ? "var(--rp)" : "var(--color-danger)", strokeWidth: 2.5, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" }} />
    </svg>
  );
}

function Card({ card }: { card: ReportCard }) {
  const L = useBi();
  return (
    <div className="flex flex-col rounded-2xl border border-hairline bg-surface/60 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {card.kicker ? <p className="font-mono text-2xs tracking-wide text-[var(--rp)] uppercase">{card.kicker}</p> : null}
          <p className="mt-0.5 text-sm leading-snug font-semibold break-keep text-fg">{card.title}</p>
        </div>
        {card.badge ? <span className="shrink-0 rounded-full bg-[var(--rp)] px-2 py-0.5 text-2xs font-semibold text-white">{card.badge}</span> : null}
      </div>
      {card.meter ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-hairline-str">
            <div className="h-full rounded-full bg-[var(--rp)]" style={{ width: `${Math.round(Math.max(0, Math.min(1, card.meter.value)) * 100)}%` }} />
          </div>
          <p className="mt-1 font-mono text-2xs text-fg-subtle">{card.meter.label}</p>
        </div>
      ) : null}
      {card.spark && card.spark.length > 1 ? (
        <div className="mt-2 flex items-center gap-2">
          <Spark values={card.spark} />
          <span className="text-2xs text-fg-subtle">{L({ ko: "관심도 흐름", en: "Interest trend" })}</span>
        </div>
      ) : null}
      {card.facts?.length ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {card.facts.map((f, i) => (
            <div key={i} className="contents">
              <dt className="text-fg-subtle">{f.label}</dt>
              <dd className="font-medium break-keep text-fg"><Cited text={f.value} /></dd>
            </div>
          ))}
        </dl>
      ) : null}
      {card.lines?.length ? (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-hairline pt-3">
          {card.lines.map((l, i) => (
            <li key={i} className="text-xs leading-relaxed break-keep text-fg-muted">
              <Cited text={l} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Table({ block }: { block: Extract<ReportBlock, { type: "table" }> }) {
  const align = (i: number) => (block.align?.[i] === "r" ? "text-right" : block.align?.[i] === "c" ? "text-center" : "text-left");
  const stack = block.header.length > 3;
  const lastIsTotal = block.totalRow;
  return (
    <div>
      <BlockTitle title={block.title} />
      <div className={cn("overflow-hidden rounded-2xl border border-hairline", stack && "hidden sm:block")}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--rp-soft)]">
              {block.header.map((h, i) => (
                <th key={i} className={cn("px-3 py-2.5 text-xs font-semibold break-keep text-fg", align(i))}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className={cn("border-t border-hairline", lastIsTotal && r === block.rows.length - 1 && "bg-surface-2 font-semibold")}>
                {row.map((cell, i) => (
                  <td key={i} className={cn("px-3 py-2.5 align-top leading-relaxed break-keep", i === 0 ? "font-medium text-fg" : "text-fg-muted", align(i), block.align?.[i] === "r" && "tabular-nums")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stack ? (
        <ul className="flex flex-col gap-2 sm:hidden">
          {block.rows.map((row, r) => (
            <li key={r} className="rounded-2xl border border-hairline p-3">
              <p className="text-sm font-semibold break-keep text-fg">{row[0]}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {row.slice(1).map((cell, i) =>
                  cell ? (
                    <div key={i} className="contents">
                      <dt className="text-fg-subtle">{block.header[i + 1]}</dt>
                      <dd className="break-keep text-fg">{cell}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
      {block.caption ? <p className="mt-2 text-2xs text-fg-subtle">{block.caption}</p> : null}
    </div>
  );
}

function Block({ block, palette, half }: { block: ReportBlock; palette: string[]; half?: boolean }) {
  const L = useBi();
  switch (block.type) {
    case "kpis":
      return (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {block.items.map((k, i) => (
            <div key={i} className="rounded-2xl border border-hairline bg-surface/60 p-3">
              <p className="text-2xs text-fg-subtle">{k.label}</p>
              <p className={cn("mt-1 text-lg font-bold break-keep tabular-nums", TONE[k.tone ?? "neutral"])}>{k.value}</p>
              {k.note ? <p className="text-2xs text-fg-subtle">{k.note}</p> : null}
            </div>
          ))}
        </div>
      );
    case "chart":
      return (
        <figure className="rounded-2xl border border-hairline bg-surface/40 p-4">
          <BlockTitle title={block.title} estimated={block.estimated} />
          <Chart spec={block.chart} palette={palette} half={half} />
          {block.caption ? <figcaption className="mt-2 text-2xs leading-relaxed text-fg-subtle">{block.caption}</figcaption> : null}
        </figure>
      );
    case "table":
      return <Table block={block} />;
    case "text":
      return (
        <div>
          <BlockTitle title={block.title} />
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-keep text-fg-muted"><Cited text={block.text} /></p>
        </div>
      );
    case "callout":
      return (
        <div className={cn("rounded-2xl border-l-4 p-4", block.tone === "warn" ? "border-warn bg-warn/10" : "border-[var(--rp)] bg-[var(--rp-soft)]")}>
          <p className={cn("text-2xs font-semibold", block.tone === "warn" ? "text-warn" : "text-[var(--rp)]")}>{block.label}</p>
          <p className="mt-1 text-sm leading-relaxed font-medium whitespace-pre-wrap break-keep text-fg"><Cited text={block.text} /></p>
        </div>
      );
    case "bullets":
      return (
        <div>
          <BlockTitle title={block.title} />
          <ul className="flex flex-col gap-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed break-keep text-fg-muted">
                <span className="mt-px shrink-0 font-mono text-xs font-semibold text-[var(--rp)]">{block.style === "num" ? String(i + 1).padStart(2, "0") : block.style === "check" ? "✓" : "•"}</span>
                <span><Cited text={item} /></span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "cards":
      return (
        <div>
          <BlockTitle title={block.title} />
          <div className={cn("grid gap-3", block.columns === 3 ? "md:grid-cols-3" : block.columns === 1 ? "" : "md:grid-cols-2")}>
            {block.items.map((c, i) => (
              <Card key={i} card={c} />
            ))}
          </div>
        </div>
      );
    case "quad":
      return (
        <div>
          <BlockTitle title={block.title} />
          <div className="grid gap-2 sm:grid-cols-2">
            {block.cells.map((cell, i) => (
              <div key={i} className="rounded-2xl border border-hairline p-4" style={{ background: `color-mix(in srgb, ${palette[i % palette.length]} 9%, transparent)` }}>
                <p className="text-sm font-bold" style={{ color: palette[i % palette.length] }}>
                  {cell.title}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {cell.items.map((it, j) => (
                    <li key={j} className="text-xs leading-relaxed break-keep text-fg-muted">
                      · <Cited text={it} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    case "sources":
      return (
        <div className="flex flex-wrap gap-1.5">
          {block.items.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-grounded/25 bg-grounded-dim px-2 py-0.5 font-mono text-2xs text-grounded hover:underline">
              {L({ ko: "출처", en: "Source" })} · {s.domain ?? s.title}
            </a>
          ))}
        </div>
      );
  }
}

// Tables wider than three columns need the full width to stay readable.
const isHalf = (b: ReportBlock) => "half" in b && Boolean(b.half) && !(b.type === "table" && b.header.length > 3);

/** Half-width blocks pair up side by side; one left without a partner takes the full row. */
function widths(blocks: ReportBlock[]): boolean[] {
  const full = blocks.map((b) => !isHalf(b));
  let run = 0;
  blocks.forEach((b, i) => {
    if (isHalf(b)) run++;
    if (!isHalf(b) || i === blocks.length - 1) {
      const end = isHalf(b) ? i : i - 1;
      if (run % 2 === 1) full[end] = true;
      run = 0;
    }
  });
  return full;
}

export function ReportView({ report }: { report: Report }) {
  const accent = report.palette[0];
  const style = { "--rp": accent, "--rp-soft": `color-mix(in srgb, ${accent} 10%, transparent)` } as CSSProperties;
  let n = 0;
  return (
    <article className="mt-4 flex flex-col gap-4" style={style}>
      <header className="relative overflow-hidden rounded-[24px] p-5 text-white md:p-7" style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, #0b0d12))` }}>
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
        <p className="font-mono text-2xs tracking-widest text-white/75 uppercase">{report.hero.eyebrow}</p>
        <h2 className="mt-2 text-xl leading-snug font-bold break-keep md:text-2xl">{report.hero.title}</h2>
        {report.hero.subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed break-keep text-white/85">{report.hero.subtitle}</p> : null}
        {report.hero.kpis?.length ? (
          <div className={cn("mt-5 grid gap-2", report.hero.kpis.length >= 4 ? "grid-cols-2 md:grid-cols-4" : report.hero.kpis.length === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2")}>
            {report.hero.kpis.map((k, i) => (
              <div key={i} className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-2xs text-white/75">{k.label}</p>
                <p className="mt-0.5 text-base leading-tight font-bold break-keep tabular-nums md:text-lg">{k.value}</p>
                {k.note ? <p className="mt-0.5 truncate text-2xs text-white/70">{k.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {report.sections.map((s) => {
        const numbered = s.kicker ? ++n : n;
        return (
          <section key={s.id} id={`r-${s.id}`} className="scroll-mt-20 rounded-[24px] border border-hairline bg-surface/40 p-5 md:p-6">
            {s.kicker ? (
              <p className="font-mono text-2xs tracking-wide text-[var(--rp)] uppercase">
                {/^\d/.test(s.kicker) ? s.kicker : `${String(numbered).padStart(2, "0")} · ${s.kicker}`}
              </p>
            ) : null}
            <h3 className="mt-1 text-lg leading-snug font-bold break-keep text-fg">{s.title}</h3>
            {s.lead ? <p className="mt-1.5 text-sm leading-relaxed break-keep text-fg-muted">{s.lead}</p> : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {s.blocks.map((b, i, all) => (
                <div key={i} className={cn("min-w-0", widths(all)[i] && "md:col-span-2")}>
                  <Block block={b} palette={report.palette} half={!widths(all)[i]} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </article>
  );
}
