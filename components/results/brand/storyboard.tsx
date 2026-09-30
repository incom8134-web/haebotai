"use client";

import { Clock } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { SlideDeck, type DeckOutput } from "@/components/results/slide-deck";

// 피치 비주얼 디렉터 result: a storyboard strip over the deck — every slide
// as a thumbnail with its layout and an estimated speaking time from its
// speaker notes (Korean at about 5.5 syllables a second), plus the total,
// so the member can see the talk's pacing before opening the slides.

const LAYOUT: Record<string, { ko: string; en: string }> = {
  points: { ko: "요점", en: "Points" },
  big_number: { ko: "큰 숫자", en: "Big number" },
  chart: { ko: "차트", en: "Chart" },
  table: { ko: "표", en: "Table" },
  comparison: { ko: "비교", en: "Compare" },
  process: { ko: "단계", en: "Process" },
  quote: { ko: "인용", en: "Quote" },
  photo: { ko: "사진", en: "Photo" },
  statement: { ko: "한 문장", en: "Statement" },
};

export const speakSeconds = (notes: string, headline: string) => Math.max(15, Math.round((notes.replace(/\s/g, "").length + headline.length) / 5.5));

export function Storyboard({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const deck = output as unknown as DeckOutput;
  const slides = deck.slides.map((s, i) => {
    const raw = s as unknown as Record<string, unknown>;
    return { n: i + 1, headline: String(raw.headline ?? ""), layout: String(raw.layout ?? "points"), secs: speakSeconds(String(raw.speaker_notes ?? ""), String(raw.headline ?? "")) };
  });
  const total = slides.reduce((a, s) => a + s.secs, 0);
  const max = Math.max(...slides.map((s) => s.secs), 1);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <section className="rounded-2xl border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg">{L({ ko: "스토리보드", en: "Storyboard" })}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
            <Clock className="size-3" aria-hidden />
            {L({ ko: `예상 발표 약 ${Math.round(total / 60)}분`, en: `About ${Math.round(total / 60)} min to present` })}
          </span>
          <span className="text-2xs text-fg-subtle">{L({ ko: "발표 메모 길이로 계산", en: "from speaker-note length" })}</span>
        </div>
        {deck.storyline ? <p className="mt-2 text-xs leading-relaxed text-fg-muted break-keep">{deck.storyline}</p> : null}
        <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((s) => (
            <li key={s.n} className="w-36 shrink-0">
              <a href={`#slide-${s.n}`} className="flex h-full flex-col rounded-xl border border-hairline bg-bg p-2 hover:border-accent">
                <span className="flex items-center justify-between text-[10px] text-fg-subtle">
                  <span className="font-semibold text-fg">{s.n}</span>
                  <span>{L(LAYOUT[s.layout] ?? { ko: s.layout, en: s.layout })}</span>
                </span>
                <span className="mt-1 line-clamp-3 flex-1 text-xs leading-snug text-fg break-keep">{s.headline}</span>
                <span className="mt-2 h-1 rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(s.secs / max) * 100}%` }} />
                </span>
                <span className="mt-0.5 text-[10px] text-fg-subtle">{s.secs}{L({ ko: "초", en: "s" })}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
      <SlideDeck deck={deck} />
    </div>
  );
}
