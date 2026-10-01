import { UserRound } from "lucide-react";
import type { ToolManifest } from "../types";

// 고객 페르소나 지도: one customer's goals, doubts, triggers and journey.
export const personaMapper: ToolManifest = {
  id: "persona-mapper",
  category: "research",
  name_ko: "고객 페르소나 지도",
  name_en: "Customer Persona Mapper",
  summary: "고객 한 사람의 목표·망설임·구매 계기와 여정을 한 장에",
  icon: UserRound,
  inputs: [
    { kind: "textarea", id: "business", label: "무엇을 파나요", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "customer_hint", label: "생각하는 주요 고객", max: 200 },
    { kind: "textarea", id: "customer_data", label: "고객 리뷰·인터뷰·문의 (선택 — 있으면 근거가 됩니다)", rows: 5, max: 8000 },
    {
      kind: "select",
      id: "count",
      label: "페르소나 수",
      options: [
        { value: "1", label: "1명 (깊게)" },
        { value: "2", label: "2명 (비교)" },
      ],
    },
  ],
  usesProfile: ["brand_name", "industry", "target_customer"],
  acceptsChainFrom: ["insight-miner"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 35,
  estimatedSeconds: 170,
};
