import { Compass } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// From the aimarketingstudio prototype's "Brand Strategy AI": turn
// business context into positioning and campaign territories. Uses web
// search so competitive claims carry sources.

const outputSchema = z.object({
  audience: z.string(),
  competitive_frame: z.string(),
  core_tension: z.string(),
  promise: z.string(),
  reasons_to_believe: z.array(z.string()),
  territories: z.array(z.object({ name: z.string(), idea: z.string(), example_line: z.string() })),
  recommended_territory: z.string(),
  risks: z.array(z.string()),
});

export const strategy: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "strategy",
  category: "ideas",
  name_ko: "해봇 브랜드 전략",
  name_en: "Brand Strategy",
  summary: "사업 맥락을 포지셔닝과 캠페인 방향 3가지로 정리합니다.",
  icon: Compass,
  inputs: [
    { kind: "textarea", id: "context", label: "사업·제품 설명", rows: 4, required: true, max: 1500 },
    { kind: "chips", id: "competitors", label: "경쟁 브랜드", max: 5 },
    { kind: "text", id: "goal", label: "이번 목표" },
    { kind: "textarea", id: "customer_voice", label: "고객이 실제로 한 말", rows: 2, max: 600 },
  ],
  usesProfile: ["brand_name", "industry", "target_customer", "region"],
  acceptsChainFrom: ["trend", "money"],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 30,
  estimatedSeconds: 45,
};
