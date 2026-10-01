import { ScanEye } from "lucide-react";
import type { ToolManifest } from "../types";

// 경쟁사 렌즈: competitors side by side and where we can stand apart.
export const competitorLens: ToolManifest = {
  id: "competitor-lens",
  category: "research",
  name_ko: "경쟁사 렌즈",
  name_en: "Competitor Lens",
  summary: "경쟁사를 나란히 놓고 우리가 설 자리를 찾는 비교",
  icon: ScanEye,
  inputs: [
    { kind: "textarea", id: "business", label: "우리 사업", rows: 3, required: true, max: 1200 },
    { kind: "chips", id: "competitors", label: "비교할 경쟁사 (선택 — 없으면 찾아 드려요)", max: 6 },
    { kind: "chips", id: "criteria", label: "비교 기준 (선택, 예: 가격, 배송, 후기)", max: 8 },
    { kind: "text", id: "region", label: "지역·시장", max: 80 },
  ],
  usesProfile: ["brand_name", "industry", "region"],
  acceptsChainFrom: ["market-gap", "brand-dna"],
  outputRenderer: "table",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 45,
  estimatedSeconds: 220,
};
