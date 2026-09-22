import { Lightbulb } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.1

const outputSchema = z.object({
  models: z
    .array(
      z.object({
        rank: z.number(),
        name: z.string(),
        fit_reason: z.string(),
        fit_cites: z.array(z.string()),
        first_30_days: z.array(z.object({ day: z.number(), title: z.string() })),
        startup_cost_krw: z.number(),
        breakeven_months: z.number(),
        difficulty: z.number().min(1).max(5),
        skill_gaps: z.array(z.string()),
      }),
    )
    .length(3),
});

export const money: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "money",
  category: "ideas",
  name_ko: "해봇 수익화 발굴",
  name_en: "Monetization Finder",
  summary: "보유 기술과 상황에 맞는 수익화 방향 3가지를 찾습니다.",
  icon: Lightbulb,
  inputs: [
    { kind: "textarea", id: "skills", label: "보유 기술·경력", rows: 3, required: true },
    { kind: "number", id: "weekly_hours", label: "주당 가용시간", unit: "시간", min: 1, max: 80 },
    {
      kind: "select",
      id: "capital",
      label: "초기 자본",
      options: [
        { value: "0", label: "0원" },
        { value: "1m", label: "~100만원" },
        { value: "5m", label: "~500만원" },
        { value: "5m+", label: "500만원+" },
      ],
    },
    {
      kind: "select",
      id: "risk",
      label: "리스크 성향",
      options: [
        { value: "low", label: "안정 추구" },
        { value: "mid", label: "중간" },
        { value: "high", label: "공격적" },
      ],
    },
    { kind: "chips", id: "interests", label: "관심 분야", max: 5 },
    { kind: "text", id: "avoid", label: "피하고 싶은 일" },
  ],
  usesProfile: ["industry", "business_stage"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 15,
  estimatedSeconds: 20,
};
