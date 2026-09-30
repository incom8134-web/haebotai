import { Telescope } from "lucide-react";
import type { ToolManifest } from "../types";

// 시장 빈틈 탐지기: needs × existing solutions, researched on the web.
export const marketGap: ToolManifest = {
  id: "market-gap",
  category: "discover",
  name_ko: "시장 빈틈 탐지기",
  name_en: "Market Gap Finder",
  summary: "고객의 불편과 기존 해결책 사이의 빈자리를 지도로",
  icon: Telescope,
  inputs: [
    { kind: "text", id: "market", label: "살펴볼 시장·분야", required: true, max: 200 },
    { kind: "text", id: "customer", label: "고객", max: 200 },
    { kind: "textarea", id: "known_problems", label: "알고 있는 고객 불편 (선택)", rows: 3, max: 1200 },
    { kind: "chips", id: "competitors", label: "알고 있는 경쟁·대안 (선택)", max: 6 },
    { kind: "text", id: "region", label: "지역·시장 범위", max: 80 },
    {
      kind: "select",
      id: "angle",
      label: "어떤 빈틈을 먼저 볼까요",
      options: [
        { value: "underserved", label: "아무도 제대로 안 챙기는 고객" },
        { value: "price", label: "너무 비싸거나 너무 싼 곳 사이" },
        { value: "experience", label: "불편한 경험" },
        { value: "any", label: "상관없음" },
      ],
    },
  ],
  usesProfile: ["industry", "region"],
  acceptsChainFrom: ["idea-radar"],
  outputRenderer: "table",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 45,
  estimatedSeconds: 220,
};
