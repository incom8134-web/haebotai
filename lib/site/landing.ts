import type { Bilingual } from "@/lib/tools/content";

// Copy and data for the public homepage (docs/redesign-plan.md §5). Tool
// references are catalog slugs; components resolve names and promises
// from the catalog so the homepage never drifts from the product.

const b = (ko: string, en: string): Bilingual => ({ ko, en });

/** The five numbered steps (the catalog's categories, in order): every public tool once. */
export const FLOW: {
  id: string;
  label: string;
  title: Bilingual;
  body: Bilingual;
  tools: string[];
  /** A photo of the stage (public/images); stages without one get a drawn backdrop. */
  image?: { src: string; alt: Bilingual };
}[] = [
  {
    id: "idea",
    label: "IDEA",
    title: b("아이디어 찾기", "Find an idea"),
    body: b(
      "내 경험에 맞는 사업 아이디어를 찾고, 무엇을 얼마에 팔지 정해요.",
      "Find a business idea that fits you, then decide what to sell and for how much.",
    ),
    tools: ["idea-radar", "offer-architect"],
    image: { src: "/images/stage-idea.webp", alt: b("밤늦은 책상 위, 동네 지도와 포스트잇에 가게 아이디어를 그려 둔 모습", "A desk late at night: a neighbourhood map and sticky notes sketching shop ideas") },
  },
  {
    id: "research",
    label: "LEARN",
    title: b("시장·손님 알아보기", "Know your market"),
    body: b(
      "시장 규모와 경쟁 가게, 우리 손님이 원하는 것을 먼저 알아봐요.",
      "Learn the market, the competition and what your customers want first.",
    ),
    tools: ["market-desk", "persona-mapper"],
    image: { src: "/images/stage-build.webp", alt: b("두 공동 창업자가 한옥 카페에서 계산기와 메모로 수익 구조를 맞춰 보는 모습", "Two co-founders in a hanok café working out the numbers with a calculator and notes") },
  },
  {
    id: "brand",
    label: "BRAND",
    title: b("브랜드 만들기", "Build your brand"),
    body: b(
      "브랜드를 정하고 로고·상세페이지·홈페이지까지 같은 얼굴로.",
      "Set the brand, then carry it into a logo, product page and website.",
    ),
    tools: ["brand-dna", "logo-lab", "sales-page", "web-builder"],
    image: { src: "/images/stage-brand.webp", alt: b("작업실에서 유자청 병을 스마트폰으로 제품 촬영하는 모습", "A maker photographing jars of yuzu preserve with a phone in a small studio") },
  },
  {
    id: "grow",
    label: "PROMOTE",
    title: b("홍보하기", "Promote"),
    body: b(
      "홍보 계획을 세우고 광고·블로그·SNS 글로 손님을 모아요.",
      "Plan the promotion, then bring customers in with ads, blogs and posts.",
    ),
    tools: ["campaign-planner", "ad-factory", "seo-composer", "content-transformer"],
    image: { src: "/images/stage-grow.webp", alt: b("저녁 카페에서 사장이 늘어나는 매출 그래프 옆에서 고객 반응을 휴대폰으로 확인하며 웃는 모습", "A café owner at dusk smiling at customer responses on her phone, beside a rising sales chart") },
  },
  {
    id: "operate",
    label: "OPERATE",
    title: b("문서·업무 정리", "Docs & daily work"),
    body: b(
      "사업계획서, 발표 자료, 할 일 계획, AI에게 시킬 프롬프트까지.",
      "Business plans, presentations, to-do plans and prompts for other AIs.",
    ),
    tools: ["doc-studio", "pitch-director", "ops-planner", "prompt-maker"],
    image: { src: "/images/stage-operate.webp", alt: b("저녁 꽃집에서 사장이 클립보드로 주간 일정을 정리하는 모습", "A florist going over the week's schedule on a clipboard at dusk") },
  },
];

export const STEPS: { title: Bilingual; body: Bilingual }[] = [
  {
    title: b("목표를 고르세요", "Pick a goal"),
    body: b(
      "사업 방향 잡기, 브랜드 만들기, 판매 준비, 마케팅 돌리기 중 하나. 맞는 도구 순서를 알려 드려요.",
      "Find a direction, build a brand, get ready to sell or run marketing — we suggest the tools, in order.",
    ),
  },
  {
    title: b("프로젝트를 만드세요", "Start a project"),
    body: b(
      "사업 이름과 한 줄 설명이면 충분해요. 이후 결과가 쌓이며 프로젝트가 스스로 채워져요.",
      "A name and one line are enough. The project fills itself in as results come in.",
    ),
  },
  {
    title: b("도구를 실행하세요", "Run a tool"),
    body: b(
      "필요하면 짧은 질문을 하고, 방향을 정해 초안을 쓴 뒤 스스로 검토해서 고쳐요.",
      "It asks a short question if it needs to, picks a direction, drafts, then reviews and fixes its own work.",
    ),
  },
  {
    title: b("마음에 안 드는 부분만 다시", "Redo only what's off"),
    body: b(
      "결과 전체가 아니라 한 부분만 다시 만들어요. 이전 버전은 그대로 남아요.",
      "Rewrite one part, not the whole result. The earlier version stays.",
    ),
  },
  {
    title: b("다음 도구로 이어가세요", "Carry on to the next tool"),
    body: b(
      "이름, 고객, 색, 메시지가 다음 도구 입력칸에 미리 채워져요.",
      "The name, customer, colours and message arrive pre-filled in the next tool.",
    ),
  },
];

export const PERSONAS: {
  id: string;
  who: Bilingual;
  pain: Bilingual;
  tools: string[];
}[] = [
  {
    id: "founder",
    who: b("처음 창업하는 1인 대표", "First-time solo founder"),
    pain: b(
      "아이디어는 많은데 무엇부터, 얼마에 팔지 모르겠어요.",
      "Plenty of ideas, no idea where to start or what to charge.",
    ),
    tools: ["idea-radar", "offer-architect", "doc-studio"],
  },
  {
    id: "shop",
    who: b("동네 가게·온라인 셀러", "Local shop or online seller"),
    pain: b(
      "상세페이지와 SNS를 혼자 다 챙기기엔 시간이 없어요.",
      "No time to handle the product page and social media alone.",
    ),
    tools: ["offer-architect", "sales-page", "ad-factory"],
  },
  {
    id: "marketer",
    who: b("혼자 일하는 마케터", "Marketer working solo"),
    pain: b(
      "캠페인 계획부터 채널별 원고까지 손이 모자라요.",
      "Too few hands for the plan and every channel's copy.",
    ),
    tools: ["campaign-planner", "content-transformer", "seo-composer"],
  },
  {
    id: "startup",
    who: b("투자·지원사업을 준비하는 팀", "Team preparing for funding"),
    pain: b(
      "시장 근거와 사업계획서, 발표자료를 한 번에 맞춰야 해요.",
      "Market evidence, business plan and deck all have to line up.",
    ),
    tools: ["market-desk", "doc-studio", "pitch-director"],
  },
  {
    id: "freelancer",
    who: b("프리랜서·강사·에이전시", "Freelancer, coach or agency"),
    pain: b(
      "제안서와 회의 정리, 업무 계획에 하루가 다 가요.",
      "Proposals, meeting notes and plans eat the whole day.",
    ),
    tools: ["doc-studio", "ops-planner", "prompt-maker"],
  },
];

/**
 * A real 팔 상품·가격 정하기 (offer-architect) run (live test, 2026-09-30): the form as entered and
 * an excerpt of what came back, unedited apart from shortening. The
 * English side is a translation. "[확인 필요: …]" markers are the tool's
 * own — it flags what it couldn't know instead of inventing it.
 */
export const BEFORE_AFTER = {
  tool: "offer-architect",
  before: [
    {
      label: b("제품·서비스", "Product"),
      value: b(
        "지역 양조장 막걸리·약주 4종 미니 병과 페어링 카드가 든 시음 키트",
        "A tasting kit: four mini bottles of local makgeolli and yakju with pairing cards",
      ),
    },
    {
      label: b("누구에게", "For whom"),
      value: b(
        "집들이·선물을 고르는 20~30대",
        "People in their 20s–30s choosing housewarming gifts",
      ),
    },
    {
      label: b("고객이 얻는 결과", "Outcome"),
      value: b(
        "처음 마셔 보는 사람도 취향을 찾는 경험",
        "Even first-timers find what they like",
      ),
    },
    {
      label: b("가격대", "Price range"),
      value: b("29,000원 ~ 69,000원", "₩29,000 – ₩69,000"),
    },
    {
      label: b("다른 점", "What's different"),
      value: b(
        "양조장 대표 인터뷰 카드와 안주 페어링",
        "Brewer interview cards and food pairings",
      ),
    },
  ],
  after: {
    offerName: b(
      "내 취향을 찾는 전통주 4종 미니 시음 키트",
      "Find-your-taste traditional liquor tasting kit, four minis",
    ),
    headline: b(
      "뻔한 와인 대신, 우리 집 홈파티가 특별해지는 4가지 취향 발견의 순간",
      "Skip the usual wine — four moments of discovery that make your house party",
    ),
    packages: [
      {
        name: b("취향 발견 베이직 키트", "Taste discovery basic kit"),
        price: 29000,
        bestFor: b(
          "가벼운 선물이나 혼자 입문 시음",
          "A light gift, or a first tasting on your own",
        ),
        note: b("[확인 필요: 용량]ml", "[needs checking: volume] ml"),
      },
      {
        name: b("홈파티 쉐어링 세트", "House-party sharing set"),
        price: 45000,
        bestFor: b(
          "3~4인 홈파티나 집들이",
          "A house party or housewarming for 3–4",
        ),
        note: null,
      },
      {
        name: b("프리미엄 선물 세트", "Premium gift set"),
        price: 69000,
        bestFor: b("기념일, 격식 있는 선물", "Anniversaries and formal gifts"),
        note: b(
          "[확인 필요: 시음용 전용 잔 2개]",
          "[needs checking: two tasting glasses]",
        ),
      },
    ],
    guarantee: b(
      "안심 배송 100% 책임 보증 — 파손·누수 시 24시간 안에 사진만 보내면 새 제품으로",
      "Safe-delivery guarantee — broken or leaking bottles replaced, just send a photo within 24 hours",
    ),
  },
};
