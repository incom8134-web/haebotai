"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// The presentation result shown as the deck itself: a photo cover, one
// 16:9 slide per entry (photo slides split text and picture, the rest
// use the brand accent), and the closing ask — the same layouts the
// .pptx download uses. Type sizes are container units (cqw) so a slide
// reads the same on a phone and a monitor.

interface Slide {
  headline?: string;
  title?: string;
  points?: string[];
  visual?: string;
  speaker_notes?: string;
  image_url?: string;
}

export interface DeckOutput {
  title?: string;
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

function SlideCard({ slide, index, accent }: { slide: Slide; index: number; accent: string }) {
  const [open, setOpen] = useState(false);
  const headline = slide.headline ?? slide.title ?? `슬라이드 ${index + 1}`;
  const points = slide.points ?? [];
  const num = String(index + 1).padStart(2, "0");

  return (
    <div className="flex flex-col gap-1.5">
      <Frame className="bg-white text-[#16181A]">
        <div className="absolute inset-y-0 left-0 w-[1.2%]" style={{ background: accent }} />
        {slide.image_url ? (
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
          {deck.storyline ? (
            <p className="mt-[3%] max-w-[55%] leading-relaxed text-white/80 break-keep" style={{ fontSize: "1.5cqw" }}>
              {deck.storyline}
            </p>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[1.2%]" style={{ background: accent }} />
      </Frame>

      <div className="grid gap-4 md:grid-cols-2">
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
