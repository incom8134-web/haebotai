import { Lightbulb } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.1

export const money: ToolManifest = {
  id: "money",
  category: "discover",
  name_ko: "수익화 방향 찾기 (이전 버전)",
  name_en: "Monetization finder (legacy)",
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
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: true, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 32,
  estimatedSeconds: 190,
};
