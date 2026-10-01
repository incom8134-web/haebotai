import { ChartColumn } from "lucide-react";
import type { ToolManifest } from "../types";

// 시장 리서치 데스크: market research that separates facts from hypotheses.
export const marketDesk: ToolManifest = {
  id: "market-desk",
  category: "research",
  name_ko: "시장 리서치 데스크",
  name_en: "Market Research Desk",
  summary: "확인된 사실과 가설을 구분한 시장 조사 틀",
  icon: ChartColumn,
  inputs: [
    { kind: "textarea", id: "question", label: "알고 싶은 것", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "decision", label: "이 조사로 내릴 결정", max: 200 },
    { kind: "text", id: "market", label: "시장·업종", max: 200 },
    { kind: "text", id: "region", label: "지역", max: 80 },
    { kind: "textarea", id: "known_facts", label: "이미 알고 있는 사실·숫자 (선택)", rows: 3, max: 2000 },
    {
      kind: "select",
      id: "depth",
      label: "얼마나 깊게",
      options: [
        { value: "quick", label: "빠른 확인" },
        { value: "standard", label: "보통" },
        { value: "deep", label: "깊게" },
      ],
    },
  ],
  usesProfile: ["industry", "region"],
  acceptsChainFrom: ["market-gap", "idea-radar"],
  outputRenderer: "table",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 45,
  estimatedSeconds: 220,
};
