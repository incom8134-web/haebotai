"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRINT_THEME, renderChart } from "@/lib/tools/report/charts";
import { deckChartSpec, deckPalette, type DeckChart } from "@/lib/tools/report/deck";

// The presentation result shown as the deck itself: a photo cover, one
// 16:9 slide per entry (photo slides split text and picture, the rest
// use the brand accent), and the closing ask — the same layouts the
// .pptx download uses. Type sizes are container units (cqw) so a slide
// reads the same on a phone and a monitor.

interface Slide {
  layout?: string;
  headline?: string;
  title?: string;
  points?: string[];
  visual?: string;
  speaker_notes?: string;
  image_url?: string;
  stat?: { value?: string; label?: string; context?: string };
  chart?: DeckChart;
  table?: { header?: string[]; rows?: string[][] };
  compare?: { left_title?: string; left_points?: string[]; right_title?: string; right_points?: string[] };
  steps?: { title?: string; text?: string }[];
  quote?: { text?: string; source?: string };
}

export interface DeckOutput {
  title?: string;
  subtitle?: string;
  storyline?: string;
  slides: Slide[];
  closing_ask?: string;
  accent_color?: string;
  cover_image_url?: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

function Frame({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl border border-hairline shadow-sm ${className}`}
      style={{ containerType: "inline-size", ...style }}
    >
      {children}
    </div>
  );
}

function PhotoBackdrop({ url, accent }: { url?: string; accent: string }) {
  return url ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
    </>
  ) : (
    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0E1116 30%, ${accent})` }} />
  );
}

function ChartSvg({ chart, accent }: { chart?: DeckChart; accent: string }) {
  const svg = useMemo(() => {
    const spec = deckChartSpec(chart);
    return spec ? renderChart(spec, { width: 560, palette: deckPalette(accent), theme: PRINT_THEME }) : "";
  }, [chart, accent]);
  if (!svg) return null;
  return <div className="flex size-full items-center justify-center [&>svg]:max-h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Head({ num, headline, accent, light = false }: { num: string; headline: string; accent: string; light?: boolean }) {
  return (
    <>
      <p className="font-bold" style={{ color: light ? "rgba(255,255,255,.8)" : accent, fontSize: "1.5cqw" }}>{num}</p>
      <p className={`mt-[0.8%] font-bold leading-tight break-keep ${light ? "text-white" : ""}`} style={{ fontSize: "2.7cqw" }}>{headline}</p>
    </>
  );
}

function Bullets({ items, accent, size = 1.45 }: { items: string[]; accent: string; size?: number }) {
  return (
    <ul className="flex flex-col gap-[1.4cqw]">
      {items.map((p, j) => (
        <li key={j} className="flex gap-[1cqw] leading-snug text-[#3A4046] break-keep" style={{ fontSize: `${size}cqw` }}>
          <span className="mt-[0.55cqw] block shrink-0 rounded-full" style={{ background: accent, width: "0.8cqw", height: "0.8cqw" }} />
          {p}
        </li>
      ))}
    </ul>
  );
}

/** The slide's own layout; null falls back to the classic photo / columns layouts. */
function LayoutBody({ slide, num, headline, points, accent }: { slide: Slide; num: string; headline: string; points: string[]; accent: string }) {
  const pad = "absolute inset-0 flex flex-col px-[5%] pt-[4.5%] pb-[4%]";
  switch (slide.layout) {
    case "big_number":
      if (!slide.stat?.value) return null;
      return (
        <div className={pad}>
          <Head num={num} headline={headline} accent={accent} />
          <div className="mt-[3%] grid flex-1 grid-cols-[44%_1fr] gap-[4%] min-h-0">
            <div className="flex flex-col justify-center rounded-[1.2cqw] px-[8%]" style={{ background: `color-mix(in srgb, ${accent} 10%, white)`, borderLeft: `0.8cqw solid ${accent}` }}>
              <p className="font-extrabold leading-none tracking-tight" style={{ color: accent, fontSize: "7.5cqw" }}>{slide.stat.value}</p>
              <p className="mt-[5%] font-bold break-keep" style={{ fontSize: "1.8cqw" }}>{slide.stat.label}</p>
              {slide.stat.context ? <p className="mt-[3%] leading-snug text-[#5B6167] break-keep" style={{ fontSize: "1.25cqw" }}>{slide.stat.context}</p> : null}
            </div>
            <div className="flex flex-col justify-center"><Bullets items={points} accent={accent} /></div>
          </div>
        </div>
      );
    case "chart":
      if (!deckChartSpec(slide.chart)) return null;
      return (
        <div className={pad}>
          <Head num={num} headline={headline} accent={accent} />
          <div className="mt-[2.5%] grid flex-1 grid-cols-[62%_1fr] gap-[3%] min-h-0">
            <div className="min-h-0"><ChartSvg chart={slide.chart} accent={accent} /></div>
            <div className="flex flex-col justify-center gap-[4%]">
              {slide.chart?.source === "estimate" ? <span className="self-start rounded-full bg-amber-100 px-[4%] py-[1%] font-bold text-amber-700" style={{ fontSize: "1.1cqw" }}>추정치</span> : null}
              {slide.chart?.takeaway ? <p className="font-bold leading-snug break-keep" style={{ color: accent, fontSize: "1.55cqw" }}>{slide.chart.takeaway}</p> : null}
              <Bullets items={points} accent={accent} size={1.3} />
            </div>
          </div>
        </div>
      );
    case "table": {
      const header = slide.table?.header ?? [];
      const rows = slide.table?.rows ?? [];
      if (!header.length || !rows.length) return null;
      return (
        <div className={pad}>
          <Head num={num} headline={headline} accent={accent} />
          <div className="mt-[3%] min-h-0 flex-1 overflow-hidden rounded-[1cqw] border border-[#E3E6EA]">
            <table className="w-full border-collapse" style={{ fontSize: rows.length > 5 ? "1.15cqw" : "1.35cqw" }}>
              <thead>
                <tr style={{ background: accent }}>
                  {header.map((h, i) => <th key={i} className="px-[1.2cqw] py-[0.9cqw] text-left font-bold text-white break-keep">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-[#F8F9FB]" : ""}>
                    {header.map((_, j) => <td key={j} className={`px-[1.2cqw] py-[0.8cqw] align-top leading-snug break-keep ${j === 0 ? "font-bold" : "text-[#3A4046]"}`}>{r[j] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case "comparison": {
      const c = slide.compare;
      if (!c) return null;
      const col = (title: string | undefined, items: string[] | undefined, strong: boolean) => (
        <div className="flex flex-col rounded-[1.2cqw] p-[6%]" style={{ background: strong ? `color-mix(in srgb, ${accent} 10%, white)` : "#F3F4F6", borderTop: `0.6cqw solid ${strong ? accent : "#9CA3AF"}` }}>
          <p className="font-bold break-keep" style={{ color: strong ? accent : "#4B5563", fontSize: "1.9cqw" }}>{title}</p>
          <div className="mt-[6%]"><Bullets items={items ?? []} accent={strong ? accent : "#9CA3AF"} size={1.35} /></div>
        </div>
      );
      return (
        <div className={pad}>
          <Head num={num} headline={headline} accent={accent} />
          <div className="relative mt-[3%] grid flex-1 grid-cols-2 gap-[5%] min-h-0">
            {col(c.left_title, c.left_points, false)}
            {col(c.right_title, c.right_points, true)}
            <span className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-extrabold text-white" style={{ background: accent, width: "5cqw", height: "5cqw", fontSize: "1.4cqw" }}>VS</span>
          </div>
        </div>
      );
    }
    case "process": {
      const steps = slide.steps ?? [];
      if (steps.length < 2) return null;
      return (
        <div className={pad}>
          <Head num={num} headline={headline} accent={accent} />
          <div className="mt-[4%] grid flex-1 gap-[2%] min-h-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((st, j) => (
              <div key={j} className="flex flex-col rounded-[1cqw] p-[10%]" style={{ background: `color-mix(in srgb, ${accent} ${8 + j * 4}%, white)` }}>
                <span className="grid place-items-center rounded-full font-bold text-white" style={{ background: accent, width: "3.4cqw", height: "3.4cqw", fontSize: "1.4cqw" }}>{j + 1}</span>
                <p className="mt-[12%] font-bold leading-tight break-keep" style={{ fontSize: "1.55cqw" }}>{st.title}</p>
                <p className="mt-[8%] leading-snug text-[#3A4046] break-keep" style={{ fontSize: "1.2cqw" }}>{st.text}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "quote":
      if (!slide.quote?.text) return null;
      return (
        <div className="absolute inset-0 flex flex-col justify-center px-[9%]" style={{ background: `color-mix(in srgb, ${accent} 9%, white)` }}>
          <p className="font-serif leading-none font-bold" style={{ color: accent, fontSize: "10cqw" }}>“</p>
          <p className="-mt-[2%] font-bold leading-snug break-keep" style={{ fontSize: "3cqw" }}>{slide.quote.text}</p>
          {slide.quote.source ? <p className="mt-[3%] text-[#5B6167]" style={{ fontSize: "1.5cqw" }}>— {slide.quote.source}</p> : null}
        </div>
      );
    case "photo":
      if (!slide.image_url) return null;
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image_url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end px-[6%] pb-[7%]">
            <span className="block h-[0.6cqw] w-[8%]" style={{ background: accent }} />
            <p className="mt-[2.5%] max-w-[65%] font-bold leading-tight text-white break-keep" style={{ fontSize: "3.6cqw" }}>{headline}</p>
            {points[0] ? <p className="mt-[2%] max-w-[60%] leading-snug text-white/85 break-keep" style={{ fontSize: "1.5cqw" }}>{points.slice(0, 2).join(" · ")}</p> : null}
          </div>
        </>
      );
    case "statement":
      return (
        <div className="absolute inset-0 flex flex-col justify-center px-[9%]" style={{ background: `color-mix(in srgb, ${accent} 9%, white)` }}>
          <p className="font-bold" style={{ color: accent, fontSize: "1.6cqw" }}>{num}</p>
          <p className="mt-[2%] font-extrabold leading-tight break-keep" style={{ fontSize: "4.2cqw" }}>{headline}</p>
          <span className="mt-[4%] block h-[0.6cqw] w-[10%]" style={{ background: accent }} />
        </div>
      );
    default:
      return null;
  }
}

function SlideCard({ slide, index, accent }: { slide: Slide; index: number; accent: string }) {
  const [open, setOpen] = useState(false);
  const headline = slide.headline ?? slide.title ?? `슬라이드 ${index + 1}`;
  const points = slide.points ?? [];
  const num = String(index + 1).padStart(2, "0");
  const custom = LayoutBody({ slide, num, headline, points, accent });

  return (
    <div className="flex flex-col gap-1.5">
      <Frame className="bg-white text-[#16181A]">
        {slide.layout !== "photo" || !custom ? <div className="absolute inset-y-0 left-0 z-10 w-[1.2%]" style={{ background: accent }} /> : null}
        {custom ? (
          custom
        ) : slide.image_url ? (
          <div className="absolute inset-0 grid grid-cols-[1fr_40%]">
            <div className="flex flex-col px-[5%] pt-[5%] pb-[4%]">
              <p className="font-bold" style={{ color: accent, fontSize: "1.6cqw" }}>{num}</p>
              <p className="mt-[1.5%] font-bold leading-tight break-keep" style={{ fontSize: "3.1cqw" }}>{headline}</p>
              <span className="mt-[3%] block h-[0.6cqw] w-[8%]" style={{ background: accent }} />
              <ol className="mt-[3.5%] flex flex-col gap-[2.2cqw]">
                {points.map((p, j) => (
                  <li key={j} className="flex items-start gap-[1.4cqw] leading-snug text-[#3A4046] break-keep" style={{ fontSize: "1.55cqw" }}>
                    <span className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ background: accent, width: "2.6cqw", height: "2.6cqw", fontSize: "1.2cqw" }}>
                      {j + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image_url} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col px-[5%] pt-[5%] pb-[4%]">
            <p className="font-bold" style={{ color: accent, fontSize: "1.6cqw" }}>{num}</p>
            <p className="mt-[1%] font-bold leading-tight break-keep" style={{ fontSize: "2.9cqw" }}>{headline}</p>
            <div className="mt-[4%] grid flex-1 gap-[2%]" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(points.length, 1), 4)}, minmax(0, 1fr))` }}>
              {points.slice(0, 4).map((p, j) => (
                <div key={j} className="flex flex-col rounded-[1cqw] p-[8%]" style={{ background: `color-mix(in srgb, ${accent} 9%, white)`, borderTop: `0.5cqw solid ${accent}` }}>
                  <span className="font-bold" style={{ color: accent, fontSize: "2.6cqw" }}>{String(j + 1).padStart(2, "0")}</span>
                  <span className="mt-[10%] font-semibold leading-snug break-keep" style={{ fontSize: "1.55cqw" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Frame>
      {slide.speaker_notes || slide.visual ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 self-start text-2xs text-fg-subtle hover:text-fg">
          발표 메모 {open ? "닫기" : "보기"}
          <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      ) : null}
      {open ? (
        <div className="rounded-lg border border-hairline p-2.5 text-xs leading-relaxed text-fg-muted">
          {slide.speaker_notes ? <p>{slide.speaker_notes}</p> : null}
          {slide.visual ? <p className="mt-1.5 text-fg-subtle">시각 자료: {slide.visual}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function SlideDeck({ deck }: { deck: DeckOutput }) {
  const accent = deck.accent_color && HEX.test(deck.accent_color) ? deck.accent_color : "#4D7CFE";
  return (
    <div className="mt-3 flex flex-col gap-4">
      <Frame className="text-white">
        <PhotoBackdrop url={deck.cover_image_url} accent={accent} />
        <div className="absolute inset-0 flex flex-col justify-center px-[6%]">
          <span className="block h-[0.7cqw] w-[7%]" style={{ background: accent }} />
          <p className="mt-[3%] max-w-[62%] font-bold leading-tight break-keep" style={{ fontSize: "4.4cqw" }}>
            {deck.title ?? "발표자료"}
          </p>
          {deck.subtitle ? (
            <p className="mt-[2%] max-w-[55%] font-semibold text-white/90 break-keep" style={{ fontSize: "1.8cqw" }}>
              {deck.subtitle}
            </p>
          ) : null}
          {deck.storyline ? (
            <p className="mt-[3%] max-w-[55%] leading-relaxed text-white/80 break-keep" style={{ fontSize: "1.5cqw" }}>
              {deck.storyline}
            </p>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[1.2%]" style={{ background: accent }} />
      </Frame>

      <div className="grid gap-5">
        {deck.slides.map((s, i) => (
          <SlideCard key={i} slide={s} index={i} accent={accent} />
        ))}
      </div>

      {deck.closing_ask ? (
        <Frame className="text-white">
          <PhotoBackdrop url={deck.cover_image_url} accent={accent} />
          <div className="absolute inset-0 grid place-items-center px-[8%] text-center">
            <p className="font-bold leading-snug break-keep" style={{ fontSize: "3.4cqw" }}>
              {deck.closing_ask}
            </p>
          </div>
        </Frame>
      ) : null}
    </div>
  );
}
