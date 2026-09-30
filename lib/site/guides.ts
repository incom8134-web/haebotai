import type { Bilingual } from "@/lib/tools/content";

// Workflows: chains of tools that hand results forward ("이어서 만들기").
// Tool entries are public slugs (lib/tools/catalog.ts); the first tool of
// every workflow must be runnable today, later steps may still be coming.
export const WORKFLOWS: { id: string; title: Bilingual; body: Bilingual; goal: "start" | "brand" | "sell" | "grow"; tools: string[] }[] = [
  {
    id: "idea-to-plan",
    goal: "start",
    title: { ko: "아이디어를 실행 계획으로", en: "From an idea to a working plan" },
    body: { ko: "내 경험에 맞는 아이디어를 고르고, 근거 있는 흐름을 확인한 뒤, 주 단위 실행 계획으로 바꿉니다.", en: "Pick an idea that fits you, check the signals behind it, and turn it into a week-by-week plan." },
    tools: ["idea-radar", "trend-radar", "ops-planner"],
  },
  {
    id: "brand-to-site",
    goal: "brand",
    title: { ko: "브랜드부터 웹사이트까지", en: "Brand to website" },
    body: { ko: "로고 방향을 그려 보고, 그 느낌 그대로 인터랙티브 사이트를 만들고, 검색으로 찾아오게 원고를 씁니다.", en: "Draw logo directions, build an interactive site in the same spirit, and write articles people find through search." },
    tools: ["logo-lab", "web-builder", "seo-composer"],
  },
  {
    id: "launch-product",
    goal: "sell",
    title: { ko: "제품 하나를 팔리게", en: "Get one product selling" },
    body: { ko: "망설임을 푸는 상세페이지를 만들고, 구매 동기별 광고를 뽑고, 바이어에게 보낼 제안서까지 씁니다.", en: "Build a product page that answers doubts, generate ads per buying motive, and write the proposal for buyers." },
    tools: ["sales-page", "ad-factory", "proposal-forge"],
  },
  {
    id: "campaign",
    goal: "grow",
    title: { ko: "캠페인을 한 흐름으로", en: "One connected campaign" },
    body: { ko: "포지셔닝과 채널 계획을 세우고, 채널별 광고를 만들고, 내부 공유용 덱으로 정리합니다.", en: "Set positioning and a channel plan, produce ads per channel, and wrap it in a deck to share." },
    tools: ["campaign-planner", "ad-factory", "pitch-director"],
  },
  {
    id: "funding",
    goal: "start",
    title: { ko: "투자·대출·지원사업 준비", en: "Prepare for funding" },
    body: { ko: "심사자에 맞춘 사업계획서와 계산되는 재무표를 만들고, 같은 이야기를 발표 덱으로 옮깁니다.", en: "Write a plan structured for its reviewer with computed financials, then carry the story into a pitch deck." },
    tools: ["doc-studio", "pitch-director"],
  },
];

export const GOALS: { id: "start" | "brand" | "sell" | "grow"; title: Bilingual; body: Bilingual; category: string }[] = [
  { id: "start", title: { ko: "사업 방향 잡기", en: "Find a direction" }, body: { ko: "아이디어 · 수익 구조 · MVP", en: "Ideas · Revenue · MVP" }, category: "discover" },
  { id: "brand", title: { ko: "브랜드와 웹사이트", en: "Brand and website" }, body: { ko: "브랜드 DNA · 로고 · 웹", en: "Brand DNA · Logo · Web" }, category: "brand" },
  { id: "sell", title: { ko: "판매 준비", en: "Get ready to sell" }, body: { ko: "세일즈 페이지 · 광고 · 제안서", en: "Sales page · Ads · Proposal" }, category: "brand" },
  { id: "grow", title: { ko: "마케팅 돌리기", en: "Run marketing" }, body: { ko: "캠페인 · 훅 · SEO 원고", en: "Campaign · Hooks · SEO" }, category: "campaign" },
];
