import { TrendingUp } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";
import { sourceSchema } from "./shared";

// HAEBOT_A_TOOLS_SPEC.md §4.2 — the tool where we most visibly beat them.
// Every numeric claim carries a source URL or an estimated flag.

const scoreSchema = z.object({
  market_size: z.number(),
  growth: z.number(),
  entry_barrier: z.number(),
  competition: z.number(),
  margin: z.number(),
  execution_difficulty: z.number(),
  capital_need: z.number(),
  personal_fit: z.number(),
});

const outputSchema = z.object({
  ideas: z.array(
    z.object({
      name: z.string(),
      scores: scoreSchema,
      composite: z.number(),
      price_gap: z.object({ band: z.string(), evidence: z.string() }),
      differentiation_angles: z.array(z.string()).length(3),
      sources: z.array(sourceSchema),
    }),
  ),
});

export const trend: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "trend",
  category: "ideas",
  name_ko: "해봇 트렌드 분석",
  name_en: "Trend Analysis",
  summary: "후보 아이디어를 실시간 근거로 점수화합니다.",
  icon: TrendingUp,
  inputs: [
    { kind: "chips", id: "ideas", label: "후보 아이디어", max: 3 },
    { kind: "text", id: "target_market", label: "타겟 시장", required: true },
    {
      kind: "select",
      id: "budget",
      label: "예산 범위",
      options: [
        { value: "0", label: "0원" },
        { value: "1m", label: "~100만원" },
        { value: "5m", label: "~500만원" },
        { value: "5m+", label: "500만원+" },
      ],
    },
    {
      kind: "select",
      id: "entry_timing",
      label: "진입 시점",
      options: [
        { value: "now", label: "즉시" },
        { value: "3m", label: "3개월 이내" },
        { value: "1y", label: "1년 이내" },
      ],
    },
  ],
  usesProfile: ["industry"],
  acceptsChainFrom: ["money"],
  outputSchema,
  outputRenderer: "cards",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 40,
  estimatedSeconds: 45,
};
