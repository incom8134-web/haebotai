import { Shapes } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// Four logo concepts. A text model plans them (idea, symbol, palette,
// type), the image model draws each symbol, and the brand name is
// typeset in Pretendard beside it (lib/tools/render/logo.ts) — image
// models misspell Hangul, and hand-written SVG from a text model came out
// crude. Earlier runs stored `svg` concepts; the renderer still shows them.
// Reject anything resembling an existing trademark (GUARDS in generate-prompt.ts).

const imageRef = z.object({ url: z.string(), asset_id: z.string() });

const outputSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string(),
        concept_rationale: z.string(),
        symbol: z.string(),
        color_spec: z.object({ hex: z.array(z.string()) }),
        type_spec: z.object({ family: z.string(), weight: z.string(), tracking: z.string() }),
        usage_notes: z.string(),
        image: imageRef,
        symbol_image: imageRef,
      }),
    )
    .length(4),
  mockups: z.array(z.string()),
});

export const logo: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "logo",
  category: "design",
  name_ko: "해봇 로고",
  name_en: "Logo Generator",
  summary: "브랜드명과 연상 키워드로 서로 다른 방향의 로고 콘셉트 4종(심볼 + 브랜드명 조합)을 디자인합니다.",
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
  usesProfile: ["brand_name", "industry", "target_customer", "tone", "brand_colors"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "images",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-flash-image",
  estimatedCredits: 40,
  estimatedSeconds: 40,
};
