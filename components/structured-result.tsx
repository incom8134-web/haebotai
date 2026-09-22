import type { Source } from "@/lib/tools/registry/shared";

// HAEBOT_A_TOOLS_SPEC.md §3.1 — one generic renderer for the 8 tools
// with no dedicated preview (money, trend, keyword, place, proposal,
// business-plan, grant, prompt), replacing the raw JSON dump those
// tools used to fall through to. No per-tool component: walks the
// manifest's own zod-shaped output and renders it as a real document —
// labeled fields, 출처 chips wherever a `sources` array appears at any
// depth (not just top-level), 추정 badges wherever `data_source:
// "estimated"` appears.
//
// `insideCard` (not depth) decides whether an array of objects gets the
// full bordered/titled treatment: a repeated item only avoids it when
// it's already inside another item's card (money.models[].first_30_days,
// e.g.) — nested cards are always wrong. A plain wrapper object like
// `tiers: {mega, mid, micro}` does NOT put its children inside a card,
// so keyword's tiers.mega[] still gets full treatment despite being two
// levels deep. Tracking raw depth instead of this got it backwards.

const LABELS: Record<string, string> = {
  // money
  models: "추천 모델",
  rank: "순위",
  fit_reason: "적합한 이유",
  fit_cites: "근거",
  first_30_days: "첫 30일",
  day: "일차",
  title: "내용",
  startup_cost_krw: "초기 비용",
  breakeven_months: "손익분기",
  difficulty: "난이도",
  skill_gaps: "필요 역량",
  // trend
  ideas: "아이디어",
  scores: "평가 점수",
  composite: "종합 점수",
  price_gap: "가격대",
  band: "범위",
  evidence: "근거",
  differentiation_angles: "차별화 포인트",
  market_size: "시장 규모",
  growth: "성장성",
  entry_barrier: "진입 장벽",
  competition: "경쟁 강도",
  margin: "마진",
  execution_difficulty: "실행 난이도",
  capital_need: "필요 자본",
  personal_fit: "개인 적합도",
  // keyword
  tiers: "키워드 티어",
  mega: "메가",
  mid: "미드",
  micro: "마이크로",
  term: "키워드",
  volume_band: "검색량",
  best_use: "활용처",
  data_source: "데이터 출처",
  combinations: "조합 키워드",
  content_gaps: "콘텐츠 공백",
  gap: "공백",
  suggested_topic: "제안 주제",
  // place
  business_name_suggestions: "상호 제안",
  description_optimized: "최적화된 소개글",
  primary_keywords: "핵심 키워드",
  menu_recommendations: "메뉴 추천",
  photo_checklist: "사진 체크리스트",
  shot: "촬영 항목",
  why: "이유",
  priority: "우선순위",
  review_response_templates: "리뷰 답글 템플릿",
  weekly_ops_checklist: "주간 운영 체크리스트",
  // proposal
  cover: "표지",
  executive_summary: "개요",
  problem: "문제 정의",
  solution: "해결 방안",
  execution_plan: "실행 계획",
  timeline: "일정",
  phase: "단계",
  weeks: "기간(주)",
  deliverable: "산출물",
  pricing_table: "가격",
  item: "항목",
  amount_krw: "금액",
  company_intro: "회사 소개",
  // business-plan
  sections: "본문",
  summary: "요약",
  team: "팀 구성",
  product: "제품",
  market_analysis: "시장 분석",
  size: "시장 규모",
  competitor_matrix: "경쟁사 분석",
  financials: "재무 계획",
  pl_3yr: "3개년 손익",
  assumptions: "가정",
  breakeven_month: "손익분기 시점",
  // grant
  matches: "지원사업 매칭 결과",
  program_name: "사업명",
  agency: "주관 기관",
  deadline: "마감일",
  funding_scale: "지원 규모",
  eligibility: "자격 요건",
  requirement: "요건",
  user_meets: "충족 여부",
  note: "비고",
  document_checklist: "필요 서류",
  source_url: "출처",
  unmatched_reasons: "매칭되지 않은 이유",
  // copy
  core_message: "핵심 메시지",
  angles: "동기별 카피",
  motivation: "고객 동기",
  headline: "헤드라인",
  body: "본문",
  cta: "행동 유도",
  channel_versions: "채널별 버전",
  channel: "채널",
  copy: "카피",
  words_to_avoid: "피할 표현",
  // presentation
  storyline: "스토리라인",
  slides: "슬라이드",
  points: "요점",
  visual: "시각 자료",
  speaker_notes: "발표 메모",
  closing_ask: "마무리 요청",
  // strategy
  audience: "대상 고객",
  competitive_frame: "경쟁 구도",
  core_tension: "핵심 긴장",
  promise: "약속",
  reasons_to_believe: "믿을 이유",
  territories: "캠페인 방향",
  idea: "아이디어",
  example_line: "예시 문장",
  recommended_territory: "추천 방향",
  risks: "리스크",
  // prompt
  system_prompt: "시스템 프롬프트",
  user_template: "사용자 템플릿",
  variables: "변수",
  name: "이름",
  description: "설명",
  example: "예시",
  sample_runs: "실행 예시",
  input: "입력",
  expected_output: "예상 출력",
  failure_modes: "실패 유형",
  mode: "유형",
  mitigation: "대응 방안",
};

function humanize(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ");
}

function formatPrimitive(key: string, value: number | boolean): string {
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (key.endsWith("_krw")) return `${value.toLocaleString("ko-KR")}원`;
  if (key === "breakeven_months" || key === "breakeven_month") return `${value}개월`;
  if (key === "weeks") return `${value}주`;
  if (key === "day") return `${value}일차`;
  return String(value);
}

function DifficultyBar({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`난이도 ${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i < value ? "bg-accent" : "bg-hairline-str"}`} />
      ))}
    </span>
  );
}

function EstimateBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warn/25 bg-warn/10 px-1.5 py-0.5 text-2xs text-warn">
      추정
    </span>
  );
}

function SourceChips({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-grounded/25 bg-grounded-dim px-2 py-0.5 font-mono text-2xs text-grounded hover:underline"
        >
          출처 · {s.domain ?? s.title}
        </a>
      ))}
    </div>
  );
}

function isSourceArray(value: unknown): value is Source[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => v && typeof v === "object" && "url" in v && "title" in v)
  );
}

// A day/order + short-text pair (money's first_30_days, etc.) reads far
// better as one line than as two stacked labeled blocks.
function asCompactPair(obj: Record<string, unknown>): { order: unknown; text: string } | null {
  const keys = Object.keys(obj);
  if (keys.length !== 2) return null;
  const orderKey = keys.find((k) => typeof obj[k] === "number");
  const textKey = keys.find((k) => typeof obj[k] === "string");
  if (!orderKey || !textKey || orderKey === textKey) return null;
  return { order: obj[orderKey], text: obj[textKey] as string };
}

function StructuredField({
  fieldKey,
  value,
  insideCard,
}: {
  fieldKey: string;
  value: unknown;
  insideCard: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  const label = humanize(fieldKey);

  if (typeof value === "string") {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">{value}</p>
      </div>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        {fieldKey === "difficulty" && typeof value === "number" ? (
          <DifficultyBar value={value} />
        ) : (
          <p className="text-sm font-medium text-fg">{formatPrimitive(fieldKey, value)}</p>
        )}
      </div>
    );
  }

  if (isSourceArray(value)) {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <SourceChips sources={value} />
      </div>
    );
  }

  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <ul className="mt-1 flex flex-col gap-1">
          {(value as string[]).map((v, i) => (
            <li key={i} className="flex gap-1.5 text-sm text-fg">
              <span className="text-fg-subtle">·</span>
              {v}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const objects = value as Record<string, unknown>[];
    if (!insideCard) {
      return (
        <div>
          <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
          <div className="mt-2 flex flex-col gap-3">
            {objects.map((item, i) => (
              <StructuredItem key={i} obj={item} />
            ))}
          </div>
        </div>
      );
    }
    // Already inside a card: no nested card. Compact pairs render as one
    // line each; anything else falls back to plain stacked fields.
    const allPairs = objects.every((o) => asCompactPair(o));
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        {allPairs ? (
          <ul className="mt-1 flex flex-col gap-1">
            {objects.map((item, i) => {
              const pair = asCompactPair(item)!;
              return (
                <li key={i} className="flex gap-1.5 text-sm text-fg">
                  <span className="shrink-0 font-mono text-fg-subtle">{formatPrimitive("day", pair.order as number)}</span>
                  {pair.text}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-1.5 flex flex-col gap-2.5 pl-3">
            {objects.map((item, i) => (
              <div key={i} className="flex flex-col gap-2 border-t border-hairline pt-2 first:border-t-0 first:pt-0">
                {Object.entries(item).map(([k, v]) => (
                  <StructuredField key={k} fieldKey={k} value={v} insideCard />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // nested object — a plain wrapper (like `tiers` or `price_gap`), not a
  // card, so insideCard passes through unchanged for its children.
  return (
    <div>
      <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
      <div className="mt-1.5 flex flex-col gap-2.5 pl-3">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <StructuredField key={k} fieldKey={k} value={v} insideCard={insideCard} />
        ))}
      </div>
    </div>
  );
}

function StructuredItem({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  const sources = isSourceArray(obj.sources) ? obj.sources : null;
  const dataSource = typeof obj.data_source === "string" ? obj.data_source : null;

  const titleKey = ["name", "term", "program_name", "phase", "item", "shot", "gap", "requirement", "mode"].find(
    (k) => typeof obj[k] === "string",
  );
  const title = titleKey ? (obj[titleKey] as string) : null;

  return (
    <div className="glass rounded-[20px]-2 p-3">
      {title ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-fg">{title}</p>
          {dataSource === "estimated" ? <EstimateBadge /> : null}
        </div>
      ) : null}
      <div className={title ? "mt-2 flex flex-col gap-2.5" : "flex flex-col gap-2.5"}>
        {entries
          .filter(([k]) => k !== "sources" && k !== "data_source" && k !== titleKey)
          .map(([k, v]) => (
            <StructuredField key={k} fieldKey={k} value={v} insideCard />
          ))}
      </div>
      {sources ? <SourceChips sources={sources} /> : null}
    </div>
  );
}

function StructuredResult({ output }: { output: unknown }) {
  const entries = Object.entries(output as Record<string, unknown>);
  return (
    <div className="mt-2 flex flex-col gap-5">
      {entries.map(([k, v]) => (
        <StructuredField key={k} fieldKey={k} value={v} insideCard={false} />
      ))}
    </div>
  );
}

export { StructuredResult };
