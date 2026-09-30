import { MapPin } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.7
// HARD GUARD (enforce in the T5 system prompt, not here): this tool must
// never generate fake reviews, write reviews in a customer's voice, or
// advise on review manipulation. Reply templates (business replying to a
// real review) are fine and are the only "review" output this tool makes.

export const place: ToolManifest = {
  id: "place",
  category: "campaign",
  name_ko: "플레이스 최적화 (종료)",
  name_en: "Place optimization (retired)",
  summary: "플레이스 정보와 운영 체크리스트를 최적화합니다.",
  icon: MapPin,
  inputs: [
    { kind: "text", id: "business_name", label: "상호", required: true },
    { kind: "text", id: "region", label: "지역", required: true },
    { kind: "textarea", id: "current_info", label: "현재 플레이스 정보", rows: 3 },
    { kind: "chips", id: "competitors", label: "경쟁업체", max: 3 },
  ],
  usesProfile: ["brand_name", "industry", "region", "target_customer", "tone"],
  acceptsChainFrom: ["keyword"],
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: true, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 32,
  estimatedSeconds: 170,
};
