import { Shapes } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.9 — output is real SVG (validated + sanitized
// server-side in the runner), not a raster model. Reject anything
// resembling an existing trademark.

const outputSchema = z.object({
  concepts: z
    .array(
      z.object({
        svg: z.string(),
        concept_rationale: z.string(),
        color_spec: z.object({ hex: z.array(z.string()) }),
        type_spec: z.object({ family: z.string(), weight: z.string(), tracking: z.string() }),
        usage_notes: z.string(),
      }),
    )
    .length(6),
  mockups: z.array(z.string()),
});

export const logo: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "logo",
  category: "design",
  name_ko: "해봇 로고",
  name_en: "Logo Generator",
  summary: "브랜드명과 연상 키워드로 SVG 로고 6종을 생성합니다.",
  icon: Shapes,
  inputs: [
    { kind: "text", id: "brand_name", label: "브랜드명", required: true },
    { kind: "chips", id: "keywords", label: "연상 키워드", max: 3 },
    {
      kind: "select",
      id: "style",
      label: "스타일",
      options: [
        { value: "wordmark", label: "워드마크" },
        { value: "symbol_wordmark", label: "심볼+워드마크" },
        { value: "initial", label: "이니셜" },
        { value: "emblem", label: "엠블럼" },
      ],
    },
    {
      kind: "select",
      id: "color_tendency",
      label: "컬러 성향",
      options: [
        { value: "mono", label: "모노톤" },
        { value: "vivid", label: "비비드" },
        { value: "pastel", label: "파스텔" },
        { value: "brand", label: "브랜드 컬러 반영" },
      ],
    },
  ],
  usesProfile: ["industry"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "images",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 30,
  estimatedSeconds: 25,
};
