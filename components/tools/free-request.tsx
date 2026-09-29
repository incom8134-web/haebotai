"use client";

import { Sparkles } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// "원하는 대로 자유롭게 요청": the user's own words, on every tool. The
// presets above help; this is where anything else goes, and it takes
// priority over the tool's defaults (lib/tools/generate-prompt.ts).

const EXAMPLES: Record<string, { ko: string; en: string }[]> = {
  presentation: [
    { ko: "기존 슬라이드 순서와 장수는 그대로, 문장과 디자인만 더 설득력 있게", en: "Keep my slide order and count; just make the wording and design more convincing" },
    { ko: "숫자는 크게, 글은 최소로. 사진 위주의 감성적인 덱", en: "Big numbers, minimal text — a photo-led, emotional deck" },
    { ko: "투자자용이라 재무 슬라이드를 3장 이상 넣어 줘", en: "It's for investors — include at least 3 financial slides" },
  ],
  homepage: [
    { ko: "흑백 필름 사진 느낌에 큰 세리프 제목, 스크롤하면 이야기처럼 이어지게", en: "Black-and-white film look, big serif headings, scrolls like a story" },
    { ko: "첫 화면에 예약 버튼이 바로 보이게, 모바일 위주로", en: "Booking button visible right away, mobile first" },
    { ko: "귀엽고 장난스러운 손그림 느낌, 파스텔은 빼고", en: "Cute, playful hand-drawn feel — no pastels" },
  ],
  blog: [
    { ko: "광고처럼 보이지 않게 친구에게 추천하듯", en: "Not like an ad — like recommending it to a friend" },
    { ko: "사진 설명을 자세히, 소제목은 질문형으로", en: "Detailed photo captions, subheadings as questions" },
  ],
  copy: [
    { ko: "반말로 짧고 위트 있게", en: "Casual, short and witty" },
    { ko: "할인 얘기는 빼고 품질 이야기만", en: "No discounts — talk only about quality" },
  ],
  image: [
    { ko: "창가 자연광, 대리석 테이블 위, 위에서 45도", en: "Window light, on a marble table, shot from 45° above" },
    { ko: "배경은 진한 초록, 그림자 강하게", en: "Deep green background, strong shadows" },
  ],
  logo: [
    { ko: "한글 자음 ㄷ을 모티프로", en: "Use the Hangul letter ㄷ as the motif" },
    { ko: "선 두께가 일정한 미니멀 심볼", en: "A minimal symbol with even line weight" },
  ],
  "business-plan": [
    { ko: "정부지원사업 양식(PSST) 순서로", en: "Follow the government-grant (PSST) format" },
    { ko: "보수적인 숫자로, 리스크를 솔직하게", en: "Conservative numbers, honest about risks" },
  ],
  strategy: [
    { ko: "20대 대학생을 핵심 고객으로 다시 잡아 줘", en: "Re-target college students in their 20s as the core customer" },
    { ko: "경쟁사 비방 없이 우리 강점만", en: "No knocking competitors — only our strengths" },
  ],
};
const DEFAULT = [
  { ko: "꼭 지켜야 할 조건, 원하는 분위기, 빼야 할 것을 자유롭게", en: "Must-keeps, the mood you want, anything to leave out" },
  { ko: "예: '○○는 바꾸지 말고 △△만 더 좋게'", en: "e.g. 'Don't change X, just improve Y'" },
];

export function FreeRequest({ toolId, value, onChange, className }: { toolId: string; value: string; onChange: (v: string) => void; className?: string }) {
  const L = useBi();
  const examples = (EXAMPLES[toolId] ?? DEFAULT).map((e) => L(e));
  return (
    <section className={cn("glass mt-4 rounded-[24px] p-5 md:px-6", className)} aria-label={L({ ko: "자유 요청", en: "Free-form request" })}>
      <label htmlFor={`free-${toolId}`} className="flex items-center gap-2 text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-studio-violet/15 text-studio-violet">
          <Sparkles className="size-4" aria-hidden />
        </span>
        {L({ ko: "원하는 대로 자유롭게 요청", en: "Ask for anything, in your own words" })}
      </label>
      <p className="mt-1.5 text-sm break-keep text-fg-muted">
        {L({ ko: "위 선택지에 없는 것, 꼭 지킬 것, 바꾸지 말 것을 적어 주세요. 여기 적은 내용이 가장 먼저 반영돼요.", en: "Anything the options don't cover — what to keep, what to change. This comes first." })}
      </p>
      <textarea
        id={`free-${toolId}`}
        value={value}
        maxLength={2000}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder={examples[0]}
        className="mt-3 w-full resize-y rounded-2xl border border-hairline bg-surface/60 px-4 py-3 text-sm leading-relaxed outline-none focus-visible:border-studio-violet/60"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChange(value.trim() ? `${value.trim()}\n${ex}` : ex)}
            className="rounded-full border border-hairline px-2.5 py-1 text-left text-2xs break-keep text-fg-muted hover:border-studio-violet/50 hover:text-fg"
          >
            + {ex}
          </button>
        ))}
      </div>
    </section>
  );
}
