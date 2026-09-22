import type { CategoryId } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §5.1 — category labels for the sidebar/palette.
export const CATEGORY_LABELS: Record<CategoryId, { ko: string; en: string }> = {
  ideas: { ko: "아이디어·수익화", en: "Ideas & Monetization" },
  content: { ko: "홍보·콘텐츠", en: "Promotion & Content" },
  design: { ko: "디자인·브랜딩", en: "Design & Branding" },
  sales: { ko: "판매·웹 제작", en: "Sales & Web" },
  docs: { ko: "문서·사업 운영", en: "Docs & Operations" },
};
