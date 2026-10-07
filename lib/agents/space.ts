// The design-strategy space (docs/ai-architecture-v2.md §4.2). Approaches
// are points in a space, not items on a menu: each kind of deliverable has
// a few dimensions a direction can vary on (narrative logic, persuasion
// mode, density, visual language…) and some well-known archetypes. The
// strategist places each candidate direction on these dimensions; code
// then checks that the candidates are materially different (they must
// differ on at least MIN_DIFFERENT dimensions, pairwise) and that one of
// them is named as the obvious default, so the default can't win in
// disguise. Selection stays by fit — nothing here is random.
//
// Pure (tested).

export interface Dimension {
  id: string;
  /** Korean label shown to the strategist. */
  name: string;
  /** Common values; the strategist may write another (short) value. */
  values: string[];
}

export interface Domain {
  id: string;
  dimensions: Dimension[];
  /** Known archetypes, as examples of distinct points in this space (not a closed list). */
  archetypes: string[];
}

const MIN_DIFFERENT = 2;

const DOMAINS: Record<string, Domain> = {
  web: {
    id: "web",
    dimensions: [
      { id: "narrative", name: "서사 논리", values: ["story", "proof", "catalog", "ia-first", "single-offer", "manifesto"] },
      { id: "persuasion", name: "설득 방식", values: ["aspiration", "evidence", "urgency", "trust", "belonging", "utility"] },
      { id: "density", name: "밀도", values: ["sparse", "balanced", "dense"] },
      { id: "visual", name: "시각 언어", values: ["editorial", "product-ui", "photographic", "typographic", "illustrative", "data"] },
    ],
    archetypes: ["럭셔리 에디토리얼", "SaaS 전환형", "대학·기관 정보구조형", "레스토랑·예약형", "포트폴리오", "캠페인 마이크로사이트", "동네 서비스", "커뮤니티·클럽"],
  },
  deck: {
    id: "deck",
    dimensions: [
      { id: "purpose", name: "목적", values: ["raise", "sell", "teach", "report", "keynote", "decide"] },
      { id: "arc", name: "흐름", values: ["problem-solution", "story", "data-led", "demo-led", "lesson", "options"] },
      { id: "density", name: "장당 밀도", values: ["minimal", "balanced", "dense"] },
      { id: "visual", name: "시각 비중", values: ["visual-heavy", "balanced", "text-heavy"] },
    ],
    archetypes: ["투자 IR", "강의·교육", "영업 제안", "회사 소개", "컨퍼런스 발표", "내부 보고"],
  },
  document: {
    id: "document",
    dimensions: [
      { id: "argument", name: "논증 구조", values: ["answer-first", "problem-solution", "options", "chronological", "evidence-led", "scoring-template"] },
      { id: "reader", name: "판단하는 독자", values: ["lender", "investor", "jury", "partner", "internal", "customer"] },
      { id: "numbers", name: "숫자 비중", values: ["light", "moderate", "heavy"] },
      { id: "length", name: "분량", values: ["brief", "standard", "exhaustive"] },
    ],
    archetypes: ["은행 대출용", "VC 시드", "정부 지원사업", "프랜차이즈", "파트너 제안", "내부 실행안"],
  },
  brand: {
    id: "brand",
    dimensions: [
      { id: "personality", name: "성격", values: ["heritage", "playful", "technical", "luxurious", "warm", "rebellious"] },
      { id: "form", name: "조형 방식", values: ["wordmark", "lettermark", "pictorial", "abstract", "emblem", "mascot"] },
      { id: "metaphor", name: "은유의 원천", values: ["product", "place", "process", "name", "value", "customer"] },
      { id: "convention", name: "업종 관습", values: ["keep", "bend", "break"] },
    ],
    archetypes: ["네거티브 스페이스 심볼", "레터마크", "엠블럼", "추상 모션 마크", "손글씨 워드마크", "캐릭터"],
  },
  campaign: {
    id: "campaign",
    dimensions: [
      { id: "motive", name: "구매 동기", values: ["scarcity", "reward", "gift", "value", "belonging", "relief", "curiosity", "status"] },
      { id: "format", name: "형식", values: ["story", "demo", "testimony", "list", "question", "contrast"] },
      { id: "voice", name: "말투", values: ["formal", "warm", "witty", "bold", "plain"] },
      { id: "proof", name: "증명 방식", values: ["numbers", "scene", "process", "comparison", "social"] },
    ],
    archetypes: ["한정 오퍼", "비하인드 스토리", "비교·대조", "질문형 훅", "체크리스트", "고객의 하루"],
  },
  analysis: {
    id: "analysis",
    dimensions: [
      { id: "lens", name: "관점", values: ["market", "behaviour", "competition", "economics", "risk", "trend"] },
      { id: "shape", name: "결론의 형태", values: ["ranked", "matrix", "narrative", "scenario", "checklist"] },
      { id: "depth", name: "깊이", values: ["scan", "standard", "deep"] },
      { id: "verdict", name: "권고 방식", values: ["single-pick", "shortlist", "conditional", "none"] },
    ],
    archetypes: ["결론 먼저", "선택지 비교", "시나리오", "진단 → 처방", "기회 지도"],
  },
};

const TOOL_DOMAIN: Record<string, string> = {
  homepage: "web",
  sangsepage: "web",
  presentation: "deck",
  "business-plan": "document",
  proposal: "document",
  strategy: "document",
  "mvp-blueprint": "document",
  "sop-builder": "document",
  "meeting-action": "document",
  logo: "brand",
  "brand-dna": "brand",
  image: "brand",
  "brand-model": "brand",
  copy: "campaign",
  "hook-lab": "campaign",
  "content-transformer": "campaign",
  blog: "campaign",
  calendar: "campaign",
};

export function domainFor(toolId: string): Domain {
  return DOMAINS[TOOL_DOMAIN[toolId] ?? "analysis"];
}

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-");

/** Normalizes a candidate's coordinates to the domain's dimension count. */
export function normalizeCoords(raw: unknown, domain: Domain): string[] {
  const list = Array.isArray(raw) ? raw.map((x) => (typeof x === "string" ? norm(x).slice(0, 40) : "")) : [];
  return domain.dimensions.map((_, i) => list[i] ?? "");
}

/** How many dimensions two candidates differ on (an empty value counts as different only when the other is set). */
export function differences(a: string[], b: string[]): number {
  let n = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? "") !== (b[i] ?? "")) n++;
  return n;
}

/** Pairs of candidates that are too close: they differ on fewer than MIN_DIFFERENT dimensions. */
export function clashes(coords: string[][], min = MIN_DIFFERENT): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < coords.length; i++) for (let j = i + 1; j < coords.length; j++) if (differences(coords[i], coords[j]) < min) out.push([i, j]);
  return out;
}

/** The space as the strategist reads it. */
export function spacePrompt(domain: Domain): string {
  return [
    "[전략 공간 — 각 후보를 이 차원 위에 놓으세요]",
    ...domain.dimensions.map((d, i) => `${i + 1}. ${d.name} (${d.id}): ${d.values.join(" | ")} — 맞는 값이 없으면 짧은 영어 단어로 새로`),
    `알려진 원형(예시일 뿐 닫힌 목록 아님): ${domain.archetypes.join(", ")}`,
    `후보끼리는 위 차원 중 최소 ${MIN_DIFFERENT}개에서 달라야 합니다. 후보 중 하나는 반드시 '이런 요청에 AI가 보통 내놓는 뻔한 기본 구성'으로 정직하게 표시(obvious_default)하세요. 그 기본안은 이 요청이 정말 그것을 요구할 때만, 그 이유(default_reason)를 쓰고 고를 수 있습니다.`,
  ].join("\n");
}
