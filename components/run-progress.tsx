"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

// What a run looks like while it works: a gradient bar paced by the
// tool's typical duration (it eases toward 95% and only fills when the
// result arrives — the server doesn't report real percentages), the
// tool's own steps ticking off in order, time elapsed and left, and a
// rotating note about what's happening. Honest about being an estimate:
// past the expected time it says it's taking a little longer.

type Step = { ko: string; en: string };

const RESEARCH_STEPS: Step[] = [
  { ko: "요청과 비즈니스 정보 분석", en: "Reading your brief and profile" },
  { ko: "웹에서 최신 자료 조사", en: "Researching current sources" },
  { ko: "전문가 방식으로 초안 작성", en: "Drafting like a specialist" },
  { ko: "편집자 검토로 구체화", en: "Editor pass for specifics" },
  { ko: "결과 정리", en: "Putting it together" },
];

const STEPS: Record<string, Step[]> = {
  strategy: [
    { ko: "시장·경쟁 리서치", en: "Market and competitor research" },
    { ko: "고객 세그먼트와 핵심 긴장 찾기", en: "Segments and core tension" },
    { ko: "포지셔닝·오퍼·실행 계획 작성", en: "Positioning, offers, plan" },
    { ko: "편집자 검토", en: "Editor pass" },
    { ko: "추천 방향 무드보드 촬영", en: "Shooting the mood board" },
  ],
  blog: [
    { ko: "검색 의도와 상위 글 빈틈 조사", en: "Search intent and content gaps" },
    { ko: "제목 후보와 구성 설계", en: "Titles and outline" },
    { ko: "본문 작성과 편집자 검토", en: "Writing and editor pass" },
    { ko: "표지·본문 사진 촬영", en: "Shooting cover and body photos" },
    { ko: "글 완성", en: "Finishing the post" },
  ],
  copy: [
    { ko: "경쟁 광고 문구 조사", en: "Studying competitor ads" },
    { ko: "구매 동기별 광고 각도 설계", en: "Angles per buying motive" },
    { ko: "헤드라인·본문·CTA 작성", en: "Headlines, body, CTAs" },
    { ko: "각도별 광고 사진 촬영", en: "Shooting an ad visual per angle" },
    { ko: "채널별 버전 정리", en: "Channel versions" },
  ],
  homepage: [
    { ko: "브랜드 콘셉트·색·서체 기획", en: "Concept, palette and type" },
    { ko: "섹션 구성과 촬영 목록 작성", en: "Sections and shot list" },
    { ko: "히어로·섹션 사진 4장 촬영", en: "Shooting 4 photos" },
    { ko: "페이지 디자인과 코딩", en: "Designing and coding the page" },
    { ko: "모바일 반응형 마무리", en: "Responsive finishing" },
  ],
  presentation: [
    { ko: "핵심 결론과 이야기 흐름 설계", en: "Core message and storyline" },
    { ko: "슬라이드별 주장과 근거 작성", en: "Writing each slide's claim" },
    { ko: "발표 메모와 편집자 검토", en: "Speaker notes and editor pass" },
    { ko: "표지·슬라이드 사진 촬영", en: "Shooting cover and slide photos" },
    { ko: "브랜드 컬러로 덱 완성", en: "Finishing the deck" },
  ],
  logo: [
    { ko: "이름과 업종에서 상징 찾기", en: "Finding symbols in the name" },
    { ko: "서로 다른 4가지 방향 설정", en: "Four distinct directions" },
    { ko: "심볼 그리기", en: "Drawing the symbols" },
    { ko: "브랜드명 조판과 로고 완성", en: "Typesetting the lockups" },
  ],
  image: [
    { ko: "촬영 콘셉트와 컷 구성", en: "Planning the shots" },
    { ko: "조명·구도·배경 설정", en: "Light, angle and set" },
    { ko: "사진 4장 촬영", en: "Shooting 4 images" },
    { ko: "보정과 저장", en: "Finishing and saving" },
  ],
  "brand-model": [
    { ko: "모델과 룩 설정", en: "Casting the look" },
    { ko: "포즈와 장면 구성", en: "Poses and scenes" },
    { ko: "룩북 4컷 촬영", en: "Shooting 4 looks" },
    { ko: "보정과 저장", en: "Finishing and saving" },
  ],
  sangsepage: [
    { ko: "경쟁 상세페이지 조사", en: "Studying top product pages" },
    { ko: "구매 망설임과 셀링 포인트 정리", en: "Doubts and selling points" },
    { ko: "섹션 카피 작성", en: "Writing each section" },
    { ko: "제품 사진 촬영", en: "Shooting product photos" },
    { ko: "860px 상세페이지 렌더링", en: "Rendering the 860px page" },
  ],
  calendar: [
    { ko: "목표에서 거꾸로 마일스톤 계산", en: "Working back from the goal" },
    { ko: "13주 일정 배분", en: "Spreading 13 weeks" },
    { ko: "주별 과제와 완료 기준 작성", en: "Weekly tasks and done criteria" },
    { ko: "결과 정리", en: "Putting it together" },
  ],
  prompt: [
    { ko: "업무의 입력·출력 분해", en: "Breaking down the task" },
    { ko: "시스템 프롬프트 설계", en: "Designing the system prompt" },
    { ko: "예시 실행과 실패 사례 점검", en: "Sample runs and failure modes" },
    { ko: "결과 정리", en: "Putting it together" },
  ],
};

const NOTES: Record<string, Step[]> = {
  homepage: [
    { ko: "아트 디렉터가 먼저 콘셉트를 정하고, 그 방향으로 사진과 페이지를 동시에 만들어요.", en: "An art director sets the concept first; photos and page are made in parallel." },
    { ko: "입력하지 않은 연락처·가격은 지어내지 않고 [입력 필요]로 남겨요.", en: "Contact details you didn't give are left as [입력 필요], never invented." },
    { ko: "완성되면 PC·모바일 화면을 바로 비교해 볼 수 있어요.", en: "You'll be able to switch between PC and phone previews." },
  ],
  presentation: [
    { ko: "슬라이드 제목은 라벨이 아니라 그 장의 주장으로 써요.", en: "Every slide title is a claim, not a label." },
    { ko: "사진은 덱 전체가 한 톤으로 보이도록 같은 색감으로 촬영해요.", en: "Photos share one color grade so the deck feels like one piece." },
    { ko: "완성되면 PowerPoint로 바로 받아 발표할 수 있어요.", en: "When it's done you can download it as PowerPoint." },
  ],
};

const DEFAULT_NOTES: Step[] = [
  { ko: "검색으로 확인한 내용만 사실로 쓰고, 출처를 함께 남겨요.", en: "Facts come from what the search found, with sources." },
  { ko: "여러 접근을 비교해 이 요청에 맞는 전략을 고른 뒤 만들어요.", en: "Several approaches are compared and the one that fits your request is chosen." },
  { ko: "별도의 검토자가 점수를 매기고, 기준에 못 미치면 다시 써요.", en: "A separate reviewer scores the draft; below the bar, it's rewritten." },
  { ko: "이 창을 닫아도 작업은 계속돼요. 결과는 보관함에 남아요.", en: "You can close this page — the run continues and lands in your Library." },
  { ko: "완성되면 PDF·Word·PowerPoint로 바로 받을 수 있어요.", en: "When it's done you can download PDF, Word or PowerPoint." },
];

function clock(sec: number, en: boolean): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (en) return m ? `${m}m ${s}s` : `${s}s`;
  return m ? `${m}분 ${s}초` : `${s}초`;
}

/** `live`: the run is reporting its real steps (components/agent/agent-timeline.tsx) — the guessed step list steps aside. */
export function RunProgress({ toolId, toolName, estimatedSeconds, live = false }: { toolId: string; toolName: string; estimatedSeconds: number; live?: boolean }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // The run starts from the bottom of a long form; bring the progress
  // into view so it's the first thing seen after pressing 실행.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, []);

  const expected = Math.max(10, estimatedSeconds);
  // Eases toward 95%: ~80% at the expected time, then creeps.
  const pct = Math.min(95, 95 * (1 - Math.exp(-1.7 * (elapsed / expected))));
  const steps = STEPS[toolId] ?? RESEARCH_STEPS;
  const current = Math.min(steps.length - 1, Math.floor((pct / 95) * steps.length * 1.05));
  const notes = NOTES[toolId] ?? DEFAULT_NOTES;
  const note = notes[Math.floor(elapsed / 7) % notes.length];
  const over = elapsed > expected * 1.1;
  const left = Math.max(0, expected - elapsed);

  return (
    <div ref={ref} className="glass mt-6 scroll-mt-24 overflow-hidden rounded-[20px] p-4 md:p-5" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-fg break-keep">
          {en ? `${toolName} is working` : `${toolName} 만드는 중`}
          <span className="ml-1 inline-flex gap-0.5 align-middle" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 animate-bounce rounded-full bg-studio-violet" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
        </p>
        <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-fg">{Math.floor(pct)}%</p>
      </div>

      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="studio-gradient-bg relative h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${Math.max(3, pct)}%` }}>
          <span className="run-progress-shimmer absolute inset-0" />
        </div>
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-2xs text-fg-subtle tabular-nums">
        <span>{en ? "Elapsed" : "경과"} {clock(elapsed, en)}</span>
        <span>
          {over
            ? en ? "Taking a little longer — almost there" : "조금 더 걸리고 있어요 — 거의 다 됐어요"
            : `${en ? "About" : "약"} ${clock(left, en)} ${en ? "left" : "남음"}`}
        </span>
      </div>

      {live ? null : <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.en}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors break-keep ${active ? "bg-surface-2 text-fg" : done ? "text-fg-muted" : "text-fg-subtle"}`}
            >
              <span
                className={`grid size-4.5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${done ? "studio-gradient-bg text-white" : active ? "border-2 border-studio-violet" : "border border-hairline-str"}`}
              >
                {done ? <Check className="size-3" aria-hidden /> : active ? <span className="size-1.5 animate-ping rounded-full bg-studio-violet" /> : i + 1}
              </span>
              {en ? s.en : s.ko}
            </li>
          );
        })}
      </ol>}

      <p key={note.en} className="page-enter mt-3 border-t border-hairline pt-3 text-xs leading-relaxed text-fg-muted break-keep">
        {en ? note.en : note.ko}
      </p>
    </div>
  );
}
