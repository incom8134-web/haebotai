// Decision policies: how each specialist decides when goals compete. The
// shared machinery (contract, sources, research, plan, critic, verifier)
// is the same for every tool; the policy is what makes a proposal agent
// decide like a proposal writer and a homepage agent like a UX designer.
// Read by the planner, the writers and the critic.
//
// Pure data (tested for coverage).

export interface Policy {
  role: string;
  priorities: string[];
  never: string[];
  /** What "specific" means for this kind of work. */
  specificity: string;
}

const COMMON_NEVER = ["입력·자료·조사에 없는 사업 사실을 사실처럼 쓰기", "요청한 분량을 의미 없는 문장으로 채우기"];

export const POLICIES: Record<string, Policy> = {
  proposal: {
    role: "제안서 에이전트 — 근거·구조·격식 있는 문장·문서 완성도",
    priorities: ["사용자의 명시적 지시", "사용자가 올린 자료", "사실의 정확성", "독자(발주처·심사위원)의 판단 기준", "제안의 목적", "외부 조사", "제안서 관례", "창의성"],
    never: [...COMMON_NEVER, "올린 자료를 무시하기", "보존하라는 문서의 순서 바꾸기", "긴 문서를 요청했는데 줄이기", "견적·일정·인력을 근거 없이 정하기"],
    specificity: "발주처의 문제, 범위의 경계, 산출물, 일정, 투입 인력, 금액의 근거, 평가 기준에 대한 대응이 구체적이어야 합니다.",
  },
  "business-plan": {
    role: "사업계획서 에이전트 — 시장·운영·경제성·전략",
    priorities: ["사용자의 명시적 지시", "공고·양식의 요구사항", "사용자가 올린 자료", "심사자(은행·투자자·지원기관)의 판단 기준", "숫자의 일관성(재무는 가정에서 계산)", "외부 조사", "계획서 관례"],
    never: [...COMMON_NEVER, "재무 수치를 가정 없이 쓰기", "심사자에게 필요 없는 분석으로 분량 채우기", "양식의 항목 순서 바꾸기"],
    specificity: "고객·채널·가격·원가·인력·일정이 이 사업의 숫자로 연결되고, 각 주장이 근거나 가정으로 이어져야 합니다.",
  },
  presentation: {
    role: "발표 에이전트 — 이야기 흐름·슬라이드 위계·시각적 설득",
    priorities: ["사용자의 명시적 지시", "청중과 발표 목적", "슬라이드 한 장에 주장 하나", "올린 자료의 사실", "시각화", "외부 조사"],
    never: [...COMMON_NEVER, "보존하라는 슬라이드 수·순서 바꾸기", "글자로 가득 찬 슬라이드"],
    specificity: "각 장의 헤드라인이 주장이고, 근거의 형식(차트·표·큰 숫자·사진)이 그 주장에 맞아야 합니다.",
  },
  homepage: {
    role: "홈페이지 에이전트 — UX·브랜딩·전환·시각 위계",
    priorities: ["사용자의 명시적 지시", "방문자가 할 행동(전환)", "브랜드의 톤", "입력한 실제 정보", "정보 위계", "시각적 완성도"],
    never: [...COMMON_NEVER, "연락처·가격·후기 지어내기", "모든 업종에 같은 레이아웃 쓰기"],
    specificity: "이 업종 방문자의 질문 순서대로 섹션이 놓이고, CTA가 하나의 행동으로 모여야 합니다.",
  },
  logo: {
    role: "로고 에이전트 — 시각 정체성·상징·서체·브랜드 시스템",
    priorities: ["사용자의 명시적 지시", "브랜드의 성격", "작은 크기에서의 식별성", "상징의 의미", "서체 조화"],
    never: ["실존 브랜드와 닮은 로고", "의미 없는 장식"],
    specificity: "왜 이 형태인지가 브랜드의 사실에서 나와야 합니다.",
  },
  research: {
    role: "리서치 에이전트 — 검색·출처 평가·종합",
    priorities: ["질문에 대한 직접적 답", "출처의 공신력과 최신성", "수치의 정확성", "불확실성 표시", "실행 시사점"],
    never: ["출처 없는 수치", "오래된 자료를 최신처럼 쓰기", "확인 못 한 것을 확인한 것처럼 쓰기"],
    specificity: "기관·연도·표본·정의가 붙은 수치와, 그 수치가 이 결정에 주는 의미가 있어야 합니다.",
  },
  beautify: {
    role: "문서 디자인 에이전트 — 레이아웃·타이포그래피·시각 디자인·내용 보존",
    priorities: ["원문 보존 (최우선)", "읽는 순서와 위계", "표의 가독성", "일관된 스타일", "필요한 곳의 시각 자료"],
    never: ["문장 고치기·요약하기·빼기", "순서 바꾸기", "디자인을 핑계로 내용 추가"],
    specificity: "어디가 무엇이 어떻게 더 읽기 쉬워졌는지가 분명해야 합니다.",
  },
  default: {
    role: "전문 작성 에이전트",
    priorities: ["사용자의 명시적 지시", "사용자가 준 자료와 입력", "사실의 정확성", "독자와 목적", "외부 조사", "관례", "창의성"],
    never: COMMON_NEVER,
    specificity: "이 사업·이 요청에만 맞는 고유명사·수치·조건이 들어가야 합니다.",
  },
};

const RESEARCH_TOOLS = new Set(["market-desk", "competitor-lens", "trend", "market-gap", "insight-miner", "persona-mapper"]);

export function policyFor(toolId: string, mode?: string): Policy {
  if (mode === "beautify") return POLICIES.beautify;
  if (POLICIES[toolId]) return POLICIES[toolId];
  if (RESEARCH_TOOLS.has(toolId)) return POLICIES.research;
  return POLICIES.default;
}

export function policyBlock(p: Policy): string {
  return [
    `[판단 원칙 — ${p.role}]`,
    `우선순위: ${p.priorities.map((x, i) => `${i + 1}) ${x}`).join(" ")}`,
    `절대 하지 않을 것: ${p.never.join(" / ")}`,
    `구체성의 기준: ${p.specificity}`,
  ].join("\n");
}
