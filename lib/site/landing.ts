import type { Bilingual } from "@/lib/tools/content";

// Copy and data for the public homepage (docs/redesign-plan.md §5). Tool
// references are catalog slugs; components resolve names and promises
// from the catalog so the homepage never drifts from the product.

const b = (ko: string, en: string): Bilingual => ({ ko, en });

/** IDEA → BUILD → BRAND → SELL → OPERATE → GROW: every public tool, once. */
export const FLOW: {
  id: string;
  label: string;
  title: Bilingual;
  body: Bilingual;
  tools: string[];
}[] = [
  {
    id: "idea",
    label: "IDEA",
    title: b("무엇을 할지", "What to do"),
    body: b(
      "내 경험과 시장의 빈틈에서 해볼 만한 사업을 찾아요.",
      "Find a business worth trying in your experience and the market's gaps.",
    ),
    tools: ["idea-radar", "market-gap", "market-desk", "trend-radar"],
  },
  {
    id: "build",
    label: "BUILD",
    title: b("어떻게 벌지", "How it earns"),
    body: b(
      "고객·경쟁·수익 구조를 정하고 팔 수 있는 제안으로 다듬어요.",
      "Settle the customer, competition and revenue model, and shape an offer people buy.",
    ),
    tools: [
      "persona-mapper",
      "competitor-lens",
      "revenue-mapper",
      "offer-architect",
      "mvp-blueprint",
    ],
  },
  {
    id: "brand",
    label: "BRAND",
    title: b("어떻게 보일지", "How it looks"),
    body: b(
      "성격·색·서체·말투를 한 장에 정하고 로고와 사이트로 이어가요.",
      "Personality, colour, type and voice on one board, carried into a logo and site.",
    ),
    tools: ["brand-dna", "logo-lab", "web-builder"],
  },
  {
    id: "sell",
    label: "SELL",
    title: b("어떻게 팔지", "How it sells"),
    body: b(
      "상세페이지, 광고, 제안서, 발표자료를 같은 메시지로 만들어요.",
      "Sales page, ads, proposal and pitch deck, all with the same message.",
    ),
    tools: ["sales-page", "ad-factory", "proposal-forge", "pitch-director"],
  },
  {
    id: "operate",
    label: "OPERATE",
    title: b("어떻게 돌릴지", "How it runs"),
    body: b(
      "문서, 업무 매뉴얼, 회의 결정, 운영 계획을 바로 쓰는 형태로.",
      "Documents, SOPs, meeting decisions and operating plans you can use today.",
    ),
    tools: ["doc-studio", "sop-builder", "meeting-action", "ops-planner"],
  },
  {
    id: "grow",
    label: "GROW",
    title: b("어떻게 키울지", "How it grows"),
    body: b(
      "캠페인과 콘텐츠를 돌리고 고객의 목소리로 다음 수를 정해요.",
      "Run campaigns and content, and let customer feedback set the next move.",
    ),
    tools: [
      "campaign-planner",
      "hook-lab",
      "seo-composer",
      "content-transformer",
      "insight-miner",
    ],
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
    tools: ["idea-radar", "revenue-mapper", "mvp-blueprint"],
  },
  {
    id: "shop",
    who: b("동네 가게·온라인 셀러", "Local shop or online seller"),
    pain: b(
      "상세페이지와 SNS를 혼자 다 챙기기엔 시간이 없어요.",
      "No time to handle the product page and social media alone.",
    ),
    tools: ["offer-architect", "sales-page", "hook-lab"],
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
      "제안서와 회의 정리, 업무 매뉴얼에 하루가 다 가요.",
      "Proposals, meeting notes and SOPs eat the whole day.",
    ),
    tools: ["proposal-forge", "meeting-action", "sop-builder"],
  },
];

/**
 * A real 오퍼 설계소 run (live test, 2026-09-30): the form as entered and
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
