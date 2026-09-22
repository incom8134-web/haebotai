import { LayoutTemplate } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.11 — rendered at 860px 네이버 스마트스토어
// 규격 through satori + resvg (lib/tools/render/sangsepage.ts).
// GUARD (T7 prompt): no efficacy, medical, or superlative claims not
// present in the user's own input — 표시광고법 territory.

const outputSchema = z.object({
  pain_points: z.array(z.string()),
  usps: z.array(z.string()).length(3),
  sections: z
    .array(
      z.object({
        order: z.number(),
        type: z.string(),
        headline: z.string(),
        body: z.string(),
        image_instruction: z.string(),
      }),
    )
    .min(8)
    .max(10),
  rendered_images: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).length(5),
  shipping_template: z.string(),
});

export const sangsepage: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "sangsepage",
  category: "sales",
  name_ko: "해봇 상세페이지",
  name_en: "Product Detail Page",
  summary: "제품 사진과 특징으로 스마트스토어 상세페이지를 만듭니다.",
  icon: LayoutTemplate,
  inputs: [
    { kind: "text", id: "product_name", label: "제품명", required: true },
    { kind: "chips", id: "features", label: "핵심 특징", max: 5 },
    { kind: "number", id: "price", label: "가격", unit: "원", min: 0 },
    { kind: "text", id: "target_customer", label: "타겟 고객" },
    {
      kind: "select",
      id: "page_mood",
      label: "페이지 분위기",
      options: [
        { value: "clean", label: "깔끔한 정보형" },
        { value: "warm", label: "따뜻한 감성형" },
        { value: "premium", label: "프리미엄" },
      ],
    },
    { kind: "image", id: "product_photos", label: "제품 사진", maxFiles: 5 },
    { kind: "text", id: "competitor", label: "경쟁 제품" },
  ],
  usesProfile: [],
  acceptsChainFrom: ["keyword", "image"],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 50,
  estimatedSeconds: 60,
};
