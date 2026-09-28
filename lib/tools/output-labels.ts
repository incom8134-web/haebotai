import type { Source } from "./registry/shared.ts";

// Field labels and value formatting for tool outputs, shared by the
// on-screen renderer (components/structured-result.tsx) and the file
// exports (lib/tools/export/document.ts) so a result reads the same in
// the app and in the downloaded PDF/DOCX/PPTX/MD.

export const LABELS: Record<string, string> = {
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
  market_insights: "시장 인사이트",
  insight: "인사이트",
  implication: "시사점",
  segments: "고객 세그먼트",
  situation: "구매 상황",
  need: "핵심 니즈",
  current_alternative: "지금 쓰는 대안",
  message: "전할 메시지",
  competitor_map: "경쟁 지도",
  position: "차지한 자리",
  strength: "강점",
  weakness: "약점",
  our_angle: "우리가 이길 틈",
  positioning_statement: "포지셔닝",
  offers: "상품·오퍼 제안",
  what: "구성",
  price_idea: "가격 아이디어",
  why_it_works: "효과가 있는 이유",
  channels: "채널",
  first_content: "첫 콘텐츠",
  action_plan: "30/60/90일 실행 계획",
  goal: "목표",
  tasks: "할 일",
  kpis: "성과 지표",
  metric: "지표",
  target: "목표치",
  how_to_measure: "측정 방법",
  risk: "리스크",
  // logo
  concepts: "로고 콘셉트",
  concept_rationale: "콘셉트 설명",
  symbol: "심볼",
  symbol_image: "심볼 이미지",
  image: "로고",
  color_spec: "색상",
  hex: "HEX",
  type_spec: "서체",
  family: "서체",
  weight: "굵기",
  tracking: "자간",
  usage_notes: "사용 팁",
  mockups: "목업",
  // blog
  titles: "제목 후보",
  meta_description: "메타 설명",
  h2_outline: "소제목 구성",
  body_markdown: "본문",
  char_count: "글자 수",
  hashtags: "해시태그",
  image_slots: "이미지 자리",
  after_section: "들어갈 위치",
  prompt: "이미지 프롬프트",
  purpose: "목적",
  // calendar
  week_no: "주차",
  milestone: "마일스톤",
  est_minutes: "예상 시간(분)",
  done_criteria: "완료 기준",
  depends_on: "선행 과제",
  // sangsepage
  usps: "핵심 강점",
  pain_points: "고객 고민",
  faq: "자주 묻는 질문",
  q: "질문",
  a: "답변",
  order: "순서",
  type: "유형",
  image_instruction: "이미지 가이드",
  shipping_template: "배송·교환 안내",
  rendered_images: "상세페이지 이미지",
  // image / brand-model
  images: "이미지",
  shots: "모델 컷",
  disclosure: "표기",
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

export function humanize(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ");
}

export function formatPrimitive(key: string, value: number | boolean): string {
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (key.endsWith("_krw")) return `${value.toLocaleString("ko-KR")}원`;
  if (key === "breakeven_months" || key === "breakeven_month") return `${value}개월`;
  if (key === "weeks") return `${value}주`;
  if (key === "day") return `${value}일차`;
  return String(value);
}

export function isSourceArray(value: unknown): value is Source[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => v && typeof v === "object" && "url" in v && "title" in v)
  );
}

// A day/order + short-text pair (money's first_30_days, etc.) reads far
// better as one line than as two stacked labeled blocks.
export function asCompactPair(obj: Record<string, unknown>): { order: unknown; text: string } | null {
  const keys = Object.keys(obj);
  if (keys.length !== 2) return null;
  const orderKey = keys.find((k) => typeof obj[k] === "number");
  const textKey = keys.find((k) => typeof obj[k] === "string");
  if (!orderKey || !textKey || orderKey === textKey) return null;
  return { order: obj[orderKey], text: obj[textKey] as string };
}

// The field that names a repeated item (a competitor, a phase, a
// keyword…) — shown as the item's title instead of as a labeled field.
const TITLE_KEYS = ["name", "term", "program_name", "phase", "item", "shot", "gap", "requirement", "mode", "metric", "risk", "title", "headline"];

export function titleKeyOf(obj: Record<string, unknown>): string | undefined {
  return TITLE_KEYS.find((k) => typeof obj[k] === "string");
}
