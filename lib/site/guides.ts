import type { Bilingual } from "@/lib/tools/content";

// Workflows: multi-tool chains that use "Continue with…" end to end — the
// thing a 39-separate-apps catalog can't offer.
export const WORKFLOWS: { id: string; title: Bilingual; body: Bilingual; goal: "content" | "sales" | "brand" | "direction"; tools: string[] }[] = [
  { id: "find-direction", goal: "direction", title: { ko: "무엇으로 돈을 벌지 정하기", en: "Decide what to make money from" }, body: { ko: "내 경력에서 방향 3가지를 찾고, 근거로 점수를 매긴 뒤, 1위를 13주 계획으로 바꿉니다.", en: "Find three directions from your experience, score them with evidence, and turn the winner into a 13-week plan." }, tools: ["money", "trend", "calendar"] },
  { id: "local-content", goal: "content", title: { ko: "동네 손님이 검색으로 찾아오게", en: "Get found by local searchers" }, body: { ko: "지역 키워드를 찾고, 그 키워드로 블로그를 쓰고, 플레이스 정보를 맞춥니다.", en: "Find local keywords, write a blog post around them, and align your place listing." }, tools: ["keyword", "blog", "place"] },
  { id: "launch-product", goal: "sales", title: { ko: "제품 하나 온라인에 올리기", en: "Put a product online" }, body: { ko: "제품 이미지를 만들고, 상세페이지를 완성하고, 납품 제안서까지 씁니다.", en: "Create product images, finish the detail page, and write a supply proposal." }, tools: ["image", "sangsepage", "proposal"] },
  { id: "build-brand", goal: "brand", title: { ko: "브랜드 기본기 갖추기", en: "Build brand basics" }, body: { ko: "로고를 만들고, 모델 컷을 찍고, 홈페이지를 배포합니다.", en: "Make a logo, shoot model images, and deploy a homepage." }, tools: ["logo", "brand-model", "homepage"] },
  { id: "campaign", goal: "content", title: { ko: "캠페인 한 번에 준비", en: "Prepare a whole campaign" }, body: { ko: "포지셔닝을 정하고, 채널별 카피를 쓰고, 내부 공유용 발표자료를 만듭니다.", en: "Set positioning, write channel copy, and build a deck to share internally." }, tools: ["strategy", "copy", "presentation"] },
  { id: "funding", goal: "direction", title: { ko: "지원사업·투자 준비", en: "Prepare for grants or investment" }, body: { ko: "아이디어를 검증하고, 사업계획서를 쓰고, 맞는 지원사업을 찾습니다.", en: "Validate the idea, draft the business plan, and find matching programs." }, tools: ["trend", "business-plan", "grant"] },
];

export const GOALS: { id: "content" | "sales" | "brand" | "direction"; title: Bilingual; body: Bilingual; category: string }[] = [
  { id: "content", title: { ko: "콘텐츠 만들기", en: "Create content" }, body: { ko: "블로그 · 키워드 · 플레이스", en: "Blog · Keywords · Place" }, category: "content" },
  { id: "sales", title: { ko: "제품 판매 준비", en: "Get ready to sell" }, body: { ko: "상세페이지 · 홈페이지 · 제안서", en: "Detail page · Website · Proposal" }, category: "sales" },
  { id: "brand", title: { ko: "브랜드 만들기", en: "Build a brand" }, body: { ko: "로고 · 이미지 · 모델 컷", en: "Logo · Images · Model shots" }, category: "design" },
  { id: "direction", title: { ko: "사업 방향 찾기", en: "Find a direction" }, body: { ko: "수익화 · 트렌드 · 캘린더", en: "Monetization · Trends · Calendar" }, category: "ideas" },
];
