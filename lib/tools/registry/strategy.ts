import { Compass } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";
import { sourceSchema } from "./shared";

// From the aimarketingstudio prototype's "Brand Strategy AI": turn
// business context into positioning and campaign territories. Uses web
// search so competitive claims carry sources.

// Deliberately wide: a strategy a shop owner can act on needs the
// market read, who exactly the customers are, where each competitor
// sits, what to sell at what price, and a dated plan with targets — not
// just a positioning line and three slogans.
const outputSchema = z.object({
  summary: z.string(),
  market_insights: z.array(z.object({ insight: z.string(), implication: z.string(), sources: z.array(sourceSchema) })),
  segments: z.array(
    z.object({ name: z.string(), situation: z.string(), need: z.string(), current_alternative: z.string(), message: z.string() }),
  ),
  competitor_map: z.array(
    z.object({ name: z.string(), position: z.string(), strength: z.string(), weakness: z.string(), our_angle: z.string() }),
  ),
  core_tension: z.string(),
  positioning_statement: z.string(),
  promise: z.string(),
  reasons_to_believe: z.array(z.string()),
  offers: z.array(z.object({ name: z.string(), what: z.string(), price_idea: z.string(), why_it_works: z.string() })),
  territories: z.array(
    z.object({ name: z.string(), idea: z.string(), example_line: z.string(), channels: z.array(z.string()), first_content: z.string() }),
  ),
  recommended_territory: z.string(),
  action_plan: z.array(z.object({ phase: z.string(), goal: z.string(), tasks: z.array(z.string()) })),
  kpis: z.array(z.object({ metric: z.string(), target: z.string(), how_to_measure: z.string() })),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
});

export const strategy: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "strategy",
  category: "ideas",
  name_ko: "해봇 브랜드 전략",
  name_en: "Brand Strategy",
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
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.8-flash",
  estimatedCredits: 30,
  estimatedSeconds: 60,
};
