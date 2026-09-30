// Strategy libraries (docs/ai-architecture-proposal.md §3.3): for each
// agent, named approaches that solve the SAME kind of request in
// materially different ways — different structure, persuasion and
// emphasis, not different wording. The strategist weighs at least three
// of them (or its own) against the request and picks by fit, never at
// random. Visual/verbal languages stay in lib/tools/directions.ts; this
// file is about how the work is built.

export interface Approach {
  id: string;
  name: string;
  /** When this approach fits. */
  when: string;
  /** How the result is built under it. */
  structure: string;
}

export interface AgentGuide {
  /** What "done well" means for this agent. */
  objective: string;
  /** What the strategist must decide for this tool beyond the approach. */
  decide: string[];
  approaches: Approach[];
}

const GENERIC: AgentGuide = {
  objective: "요청한 사람이 바로 쓰고 행동할 수 있는, 이 요청에만 맞는 구체적인 결과물",
  decide: ["결과물을 어떤 순서와 비중으로 구성할지", "무엇을 과감히 뺄지"],
  approaches: [
    { id: "answer-first", name: "결론 먼저", when: "바쁜 독자가 결정을 내려야 할 때", structure: "핵심 결론과 추천 → 근거 → 실행 방법 → 세부 자료" },
    { id: "diagnose-prescribe", name: "진단 → 처방", when: "문제가 분명하고 원인을 먼저 짚어야 할 때", structure: "현재 상태 진단 → 원인 → 우선순위별 처방 → 확인 지표" },
    { id: "options", name: "선택지 비교", when: "여러 길이 있고 독자가 골라야 할 때", structure: "선택 기준 → 선택지 2~4개 비교 → 추천과 이유 → 다음 단계" },
    { id: "playbook", name: "실행 플레이북", when: "바로 따라 할 단계가 필요할 때", structure: "목표 → 단계별 실행(누가·언제·무엇) → 체크리스트 → 흔한 실수" },
  ],
};

export const AGENT_GUIDES: Record<string, AgentGuide> = {
  "idea-radar": {
    objective: "이 사람이 가진 것으로 이번 달 안에 검증을 시작할 수 있는, 서로 확실히 다른 사업 아이디어와 솔직한 비교",
    decide: ["후보를 어디서 넓힐지(기술, 관심, 고객, 지역)", "점수에서 무엇을 가장 무겁게 볼지(조건이 정함)", "추천 하나와 그 이유"],
    approaches: [
      { id: "skill-out", name: "기술에서 바깥으로", when: "경력·기술이 뚜렷하고 관심 분야가 넓을 때", structure: "팔 수 있는 기술 목록 → 그 기술이 필요한 고객 → 사업 형태별 변형 → 점수 비교 → 추천" },
      { id: "customer-in", name: "고객에서 안으로", when: "도와주고 싶은 고객이 분명할 때", structure: "그 고객의 상황과 불편 → 이 사람이 풀 수 있는 불편 → 형태별 해결 아이디어 → 점수 비교 → 추천" },
      { id: "asset-leverage", name: "가진 자원 활용", when: "공간·장비·네트워크·자금처럼 쓸 수 있는 자원이 있을 때", structure: "가진 자원 → 자원이 곧 우위가 되는 사업 → 필요한 추가 자원 → 점수 비교 → 추천" },
      { id: "fast-cash", name: "빠른 첫 매출", when: "자금이 적고 위험을 피하고 싶을 때", structure: "2주 안에 팔 수 있는 서비스형 아이디어 → 그 경험을 상품화하는 다음 단계 → 점수 비교 → 추천" },
      { id: "local-anchor", name: "지역 기반", when: "오프라인·지역이 정해져 있을 때", structure: "그 지역의 고객과 빈자리 → 지역 밀착 아이디어 → 온라인 확장 여지 → 점수 비교 → 추천" },
    ],
  },
  "revenue-mapper": {
    objective: "하나의 아이디어가 벌 수 있는 길을 모두 펼친 뒤, 지금 시작할 조합 하나를 숫자와 함께 고르는 수익 구조",
    decide: ["핵심 수익원 하나", "반복 매출을 어디서 만들지", "가치 사다리의 첫 계단 가격"],
    approaches: [
      { id: "ladder-up", name: "사다리 올리기", when: "첫 구매 장벽이 높고 신뢰가 필요할 때", structure: "저가 첫 계단 → 핵심 상품 → 반복 매출 → 프리미엄 → 단위 경제성" },
      { id: "recurring-core", name: "반복 매출 중심", when: "고객이 주기적으로 필요로 할 때", structure: "구독·정기 핵심 → 가입 유도 상품 → 해지 방지 업셀 → 단위 경제성 → 조합" },
      { id: "service-to-product", name: "서비스에서 상품으로", when: "지금은 시간을 팔지만 확장하고 싶을 때", structure: "시간 판매(서비스) → 반복되는 부분의 상품화 → 교육·라이선스 → 단위 경제성 → 조합" },
      { id: "two-sided", name: "양쪽에서 받기", when: "공급자와 수요자를 연결하는 모델일 때", structure: "양쪽 세그먼트 → 누가 무엇에 내는지 → 수수료·광고·유료 기능 → 초기 한쪽 무료 전략 → 단위 경제성" },
    ],
  },
  "offer-architect": {
    objective: "고객이 한 번 읽고 무엇을 얻는지, 얼마인지, 왜 지금 사야 하는지 알게 되는 정직한 판매 제안",
    decide: ["핵심 약속 한 문장", "패키지 3단의 가격과 차이", "가장 큰 망설임과 그 해답"],
    approaches: [
      { id: "outcome-first", name: "결과 약속", when: "결과가 측정 가능할 때(교육, 대행, 건강)", structure: "도달할 결과 → 과정 → 받는 것 → 보증 → 가격" },
      { id: "risk-reversal", name: "위험 없애기", when: "처음 사는 고객의 불안이 클 때", structure: "고객의 불안 → 체험·보증으로 위험 제거 → 받는 것 → 가격 → 행동" },
      { id: "bundle-value", name: "묶음 가치", when: "구성품이 많고 따로 사면 비쌀 때", structure: "구성 블록별 가치 → 합친 가치 → 패키지 가격 → 보너스 → 행동" },
      { id: "identity", name: "정체성과 소속", when: "취향·커뮤니티·라이프스타일 제품일 때", structure: "이 제품을 쓰는 사람의 모습 → 경험 → 구성 → 한정성 → 행동" },
    ],
  },
  "market-gap": {
    objective: "근거와 가설을 구분한 니즈 × 해결책 지도와, 검증할 수 있는 빈틈",
    decide: ["어떤 고객 상황에서 니즈를 찾을지", "해결책의 범위(직접 경쟁만인지, 스스로 해결까지인지)", "빈틈을 고르는 기준"],
    approaches: [
      { id: "complaint-mining", name: "불만 캐기", when: "기존 업체와 리뷰가 많은 시장", structure: "리뷰·커뮤니티의 반복 불만 → 니즈 → 해결책별 커버리지 → 빈틈 → 검증 질문" },
      { id: "job-map", name: "고객의 일 지도", when: "고객이 여러 단계를 거쳐 문제를 해결할 때", structure: "고객이 하는 일의 단계 → 단계별 니즈 → 해결책 커버리지 → 방치된 단계 → 검증 질문" },
      { id: "non-consumer", name: "안 쓰는 사람", when: "시장이 작거나 비싸서 포기한 고객이 있을 때", structure: "안 사는 사람과 이유 → 그들의 니즈 → 기존 해결책이 놓친 조건 → 빈틈 → 검증 질문" },
      { id: "price-tier", name: "가격대 사이", when: "너무 싼 곳과 너무 비싼 곳만 있을 때", structure: "가격대별 해결책 → 각 가격대의 니즈 충족도 → 중간 지대 빈틈 → 검증 질문" },
    ],
  },
  "mvp-blueprint": {
    objective: "입력한 기간과 실력 안에서 실제로 출시할 수 있고, 가설 하나를 증명하는 가장 작은 첫 버전",
    decide: ["첫 버전이 증명할 가설", "must 기능의 최소 집합", "만드는 방식(노코드, 템플릿, 직접 개발)"],
    approaches: [
      { id: "concierge", name: "사람이 먼저", when: "자동화 전에 수요부터 확인할 때", structure: "사람이 수작업으로 제공 → 반복되는 일 기록 → 자동화할 부분 → 단계 → 체크리스트" },
      { id: "no-code-stack", name: "노코드 조립", when: "개발을 못 하고 기간이 짧을 때", structure: "폼·시트·메신저로 흐름 조립 → 핵심 기능 → 결제 → 단계 → 체크리스트" },
      { id: "single-feature", name: "기능 하나", when: "핵심 가치가 한 기능에 모여 있을 때", structure: "기능 하나를 제대로 → 주변 기능은 수작업 → 여정 → 단계 → 체크리스트" },
      { id: "pre-sale", name: "먼저 팔기", when: "실물·콘텐츠처럼 만드는 비용이 클 때", structure: "예약 판매 페이지 → 목표 수량 → 제작 → 배송·제공 → 체크리스트" },
    ],
  },
  homepage: {
    objective: "방문자가 이 사업을 신뢰하고 한 가지 행동(예약·문의·구매·방문)으로 이어지는, 이 사업에만 맞는 사이트",
    decide: [
      "사이트의 역할(리드 확보, 예약, 판매, 포트폴리오, 브랜드 인지)",
      "첫 화면이 먼저 증명할 것(신뢰, 감성, 제품, 가격, 결과)",
      "섹션 구성과 순서(업종 템플릿이 아니라 이 방문자의 의사결정 순서)",
      "3D·모션의 양과 성격(톤이 정함: 없음도 선택지)",
    ],
    approaches: [
      { id: "trust-first", name: "신뢰 먼저", when: "법률·의료·세무·교육처럼 방문자가 불안하고 신중할 때", structure: "전문성·자격 증명 → 해결하는 문제 → 절차와 비용 투명성 → 후기·사례(입력에 있을 때) → 상담 예약" },
      { id: "desire-first", name: "욕망 먼저", when: "외식·뷰티·패션·여행처럼 감각과 분위기가 구매를 이끌 때", structure: "감각적인 장면 → 시그니처 상품 → 경험 스토리 → 방문·주문 정보 → 예약·구매" },
      { id: "proof-led", name: "결과로 증명", when: "B2B·에이전시·스튜디오처럼 성과와 작업물이 설득할 때", structure: "대표 결과물·사례 → 방법론 → 서비스 범위 → 협업 과정 → 문의" },
      { id: "product-demo", name: "제품 시연", when: "앱·SaaS·기기처럼 기능을 보여 줘야 이해될 때", structure: "한 문장 가치 + 제품 화면 → 기능별 장면 → 비교·가격 → 도입 방법 → 시작하기" },
      { id: "story-led", name: "브랜드 이야기", when: "창업 스토리·철학·장인정신이 차별점일 때", structure: "시작의 이유 → 만드는 방식 → 사람과 장소 → 대표 상품 → 방문·구매" },
      { id: "catalog-led", name: "카탈로그 중심", when: "상품 수가 많고 고르는 경험이 핵심일 때", structure: "카테고리 → 베스트 상품 → 구매 정보(배송·교환) → 브랜드 신뢰 → 구매" },
    ],
  },
  presentation: {
    objective: "이 청중이 발표를 듣고 요청한 결정을 내리게 만드는 덱",
    decide: [
      "덱의 종류(투자 유치, 영업 제안, 내부 보고, 교육, 행사·발표)와 그에 맞는 청중의 질문 순서",
      "핵심 메시지 한 문장과 각 장의 주장",
      "데이터·사진·도식의 비중",
    ],
    approaches: [
      { id: "investor", name: "투자자 설득", when: "투자·지원금·파트너 유치", structure: "문제 → 해결 → 시장 → 비즈니스 모델 → 견인 지표(입력에 있을 때) → 팀 → 자금 사용 → 요청" },
      { id: "sales", name: "고객 제안", when: "고객사·바이어에게 도입을 설득", structure: "고객의 현재 비용·불편 → 우리가 바꾸는 것 → 작동 방식 → 도입 사례·근거 → 조건과 일정 → 다음 단계" },
      { id: "report", name: "보고·결정 요청", when: "내부 보고, 경영진 결정", structure: "결론과 요청 → 배경 → 분석 → 선택지와 추천 → 리스크 → 일정" },
      { id: "teach", name: "교육·설명", when: "강의, 워크숍, 온보딩", structure: "왜 중요한가 → 핵심 개념 3~5개(예시와 함께) → 실습·적용 → 요약 → 질문" },
      { id: "keynote", name: "비전 키노트", when: "행사·브랜드 발표·비전 공유", structure: "강한 첫 장면 → 변화의 흐름 → 우리의 관점 → 상징적 약속 → 함께할 행동" },
    ],
  },
  "business-plan": {
    objective: "이 계획서를 읽는 심사자(은행, 투자자, 정부 지원 심사위원, 동업자)가 요구하는 판단 근거를 그들의 순서대로 주는 사업계획서",
    decide: [
      "계획서의 종류와 심사자(대출, 투자, 정부 지원, 내부·동업)",
      "그 심사자에게 맞는 장(chapter) 구성 — 고정 목차가 아니라 필요한 장만",
      "시장 규모·SWOT·포지셔닝 같은 분석을 넣을지(심사자가 요구할 때만)",
      "재무 가정(객단가, 방문·판매량, 원가율, 고정비, 성장률)",
    ],
    approaches: [
      { id: "loan", name: "대출 심사용", when: "은행·정책자금 대출", structure: "사업 개요 → 상환 능력(현금흐름·손익분기) → 담보·자기자본 → 운영 계획 → 리스크 대응" },
      { id: "investor", name: "투자 유치용", when: "엔젤·VC 투자", structure: "문제와 기회 → 해결책 → 시장 규모 → 경쟁과 차별점 → 성장 전략 → 재무 전망 → 팀 → 투자 조건" },
      { id: "grant", name: "정부 지원사업용", when: "창업 지원금·바우처 심사", structure: "문제 인식 → 실현 가능성(개발·운영 계획) → 성장 전략 → 팀 역량 → 사업비 집행 계획 → 기대 효과" },
      { id: "local-launch", name: "동네 가게 오픈용", when: "소규모 매장 창업, 내부·가족·동업자 공유", structure: "콘셉트와 상권 → 메뉴·상품과 가격 → 오픈 준비 일정 → 인력·운영 → 월 손익과 손익분기 → 초기 마케팅" },
      { id: "expansion", name: "확장·신사업", when: "기존 사업의 2호점·신규 라인", structure: "현재 성과(입력에 있을 때) → 확장 근거 → 실행 계획 → 투자·재무 → 리스크" },
    ],
  },
  logo: {
    objective: "이 브랜드의 성격을 한눈에 전하고, 작은 크기·단색에서도 알아볼 수 있는 서로 다른 로고 방향들",
    decide: [
      "브랜드 성격(형용사 3개)과 피해야 할 인상",
      "상징의 출처(이름의 뜻, 제품, 장소, 창업 이야기, 글자 자체)",
      "업종의 관습을 따를지 깰지",
      "한글·영문 표기, 파비콘·단색·작은 크기에서의 가독성",
    ],
    approaches: [
      { id: "wordmark", name: "워드마크", when: "이름 자체가 짧고 특색 있을 때", structure: "글자꼴과 자간·합자로 성격을 표현" },
      { id: "symbol", name: "상징 심볼", when: "이름의 뜻이나 제품에 강한 이미지가 있을 때", structure: "단순한 기하 심볼 + 조판된 이름" },
      { id: "monogram", name: "모노그램", when: "이름이 길거나 앱 아이콘·도장이 중요할 때", structure: "첫 글자 조합을 하나의 형태로" },
      { id: "emblem", name: "엠블럼", when: "전통·장인·지역성이 핵심일 때", structure: "배지·도장 형태 안에 이름과 상징" },
      { id: "mascot", name: "캐릭터", when: "친근함과 기억이 가장 중요할 때(아동·반려·동네 가게)", structure: "단순한 캐릭터 얼굴 + 이름" },
    ],
  },
  proposal: {
    objective: "받는 사람이 '예'라고 답하게 만드는 제안서",
    decide: ["받는 사람이 가장 먼저 확인할 것(가격, 효과, 위험, 일정)", "제안의 범위와 선택지"],
    approaches: [
      { id: "roi", name: "투자 대비 효과", when: "비용을 정당화해야 할 때", structure: "현재 손실·기회 → 제안 → 기대 효과(가정 명시) → 비용 → 일정" },
      { id: "tiered", name: "옵션 3단계", when: "예산이 불확실할 때", structure: "목표 → 기본·추천·프리미엄 옵션 비교 → 추천 이유 → 다음 단계" },
      { id: "risk-reversal", name: "위험 줄이기", when: "처음 거래라 신뢰가 부족할 때", structure: "걱정 → 보증·단계적 진행 → 작은 시작 → 확장" },
    ],
  },
  blog: {
    objective: "검색한 사람의 질문에 끝까지 답해 저장·공유되고 가게로 이어지는 글",
    decide: ["검색 의도(정보, 비교, 방문, 구매)", "글의 형식과 길이"],
    approaches: [
      { id: "guide", name: "완전 가이드", when: "정보형 검색", structure: "결론 요약 → 단계별 설명 → 팁 → FAQ" },
      { id: "comparison", name: "비교·선택", when: "무엇을 고를지 고민하는 검색", structure: "선택 기준 → 항목별 비교 → 상황별 추천" },
      { id: "story", name: "현장 이야기", when: "방문·경험형 검색", structure: "장면 → 경험 → 정보(위치·가격·시간) → 방문 팁" },
      { id: "list", name: "리스트", when: "빠르게 훑는 검색", structure: "번호가 붙은 항목 5~10개, 항목마다 이유" },
    ],
  },
  copy: {
    objective: "이 채널에서 이 고객의 손을 멈추게 하고 행동하게 하는 문구",
    decide: ["구매 동기(두려움, 욕망, 편의, 자부심)", "채널별 길이와 형식"],
    approaches: [
      { id: "pain", name: "불편 자극", when: "문제가 분명할 때", structure: "불편 → 해결 → 증거 → 행동" },
      { id: "desire", name: "욕망 그리기", when: "감성·라이프스타일 상품", structure: "원하는 장면 → 상품 → 행동" },
      { id: "offer", name: "제안 중심", when: "혜택·가격이 강할 때", structure: "혜택 → 조건 → 마감 → 행동" },
      { id: "proof", name: "증거 중심", when: "신뢰가 관건일 때", structure: "결과·후기(입력에 있을 때) → 이유 → 행동" },
    ],
  },
  strategy: {
    objective: "이 사업이 다음 90일 동안 무엇을 하고 무엇을 하지 않을지 정해 주는 전략",
    decide: ["지금 가장 큰 병목(인지, 전환, 재방문, 객단가, 운영)", "집중할 고객 세그먼트"],
    approaches: [
      { id: "bottleneck", name: "병목 하나 풀기", when: "문제가 한 곳에 몰려 있을 때", structure: "병목 진단 → 원인 → 집중 실행 3가지 → 지표" },
      { id: "segment", name: "고객 하나에 집중", when: "고객이 흩어져 있을 때", structure: "세그먼트 비교 → 선택 → 그 고객을 위한 오퍼·채널 → 지표" },
      { id: "positioning", name: "포지셔닝 재정의", when: "경쟁 속에서 차별점이 흐릴 때", structure: "경쟁 지도 → 빈자리 → 새 포지션 → 메시지와 실행" },
    ],
  },
  sangsepage: {
    objective: "스크롤하는 동안 구매 망설임을 하나씩 풀어 결제로 이어지는 상세페이지",
    decide: ["이 상품의 가장 큰 구매 망설임", "사진과 글의 비중"],
    approaches: [
      { id: "doubt-solver", name: "망설임 해소", when: "가격·품질 의심이 클 때", structure: "첫 인상 → 의심별 근거 → 비교 → 보증·배송 → 구매" },
      { id: "sensory", name: "감각 묘사", when: "맛·향·촉감이 핵심일 때", structure: "감각 장면 → 재료·공정 → 사용 장면 → 구매" },
      { id: "spec", name: "스펙 비교", when: "기능·성능 상품", structure: "핵심 수치(입력) → 기능별 설명 → 비교표 → 구매" },
    ],
  },
};

export function guideFor(toolId: string): AgentGuide {
  return AGENT_GUIDES[toolId] ?? GENERIC;
}
