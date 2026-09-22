import { MapPin } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.7
// HARD GUARD (enforce in the T5 system prompt, not here): this tool must
// never generate fake reviews, write reviews in a customer's voice, or
// advise on review manipulation. Reply templates (business replying to a
// real review) are fine and are the only "review" output this tool makes.

const outputSchema = z.object({
  business_name_suggestions: z.array(z.string()).length(3),
  description_optimized: z.string(),
  primary_keywords: z.array(z.string()),
  menu_recommendations: z.array(z.string()),
  photo_checklist: z.array(z.object({ shot: z.string(), why: z.string(), priority: z.number() })),
  review_response_templates: z.array(z.string()),
  weekly_ops_checklist: z.array(z.string()),
});

export const place: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "place",
  category: "content",
  name_ko: "해봇 플레이스 최적화",
  name_en: "Place Optimization",
  summary: "플레이스 정보와 운영 체크리스트를 최적화합니다.",
  icon: MapPin,
  inputs: [
    { kind: "text", id: "business_name", label: "상호", required: true },
    { kind: "text", id: "region", label: "지역", required: true },
    { kind: "textarea", id: "current_info", label: "현재 플레이스 정보", rows: 3 },
    { kind: "chips", id: "competitors", label: "경쟁업체", max: 3 },
  ],
  usesProfile: ["industry"],
  acceptsChainFrom: ["keyword"],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 15,
  estimatedSeconds: 20,
};
