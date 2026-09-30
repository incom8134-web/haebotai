import { TrendingUp } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.2 — the tool where we most visibly beat them.
// Every numeric claim carries a source URL or an estimated flag.

export const trend: ToolManifest = {
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
  outputRenderer: "cards",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 65,
  estimatedSeconds: 230,
};
