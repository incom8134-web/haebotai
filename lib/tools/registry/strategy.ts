import { Compass } from "lucide-react";
import type { ToolManifest } from "../types";

// From the aimarketingstudio prototype's "Brand Strategy AI": turn
// business context into positioning and campaign territories. Uses web
// search so competitive claims carry sources.

export const strategy: ToolManifest = {
  id: "strategy",
  category: "campaign",
  name_ko: "캠페인 플래너",
  name_en: "Campaign Planner",
  summary: "시장·고객·경쟁자를 분석해 포지셔닝, 상품·가격 제안, 캠페인 방향 3가지, 30/60/90일 실행 계획과 성과 지표까지 만듭니다.",
  icon: Compass,
  inputs: [
    { kind: "textarea", id: "context", label: "사업·제품 설명", rows: 4, required: true, max: 1500 },
    { kind: "chips", id: "competitors", label: "경쟁 브랜드", max: 5 },
    { kind: "text", id: "goal", label: "이번 목표" },
    { kind: "textarea", id: "customer_voice", label: "고객이 실제로 한 말", rows: 2, max: 600 },
  ],
  usesProfile: ["brand_name", "industry", "business_stage", "target_customer", "region", "tone", "budget_band"],
  acceptsChainFrom: ["trend", "money"],
  outputRenderer: "document",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 65,
  estimatedSeconds: 290,
};
