import { Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.8 (3.1) — the refined prompt is shown to the
// user, not just the images; that's part of the trust surface too.

const outputSchema = z.object({
  images: z.array(z.object({ asset_id: z.string(), url: z.string(), seed: z.string() })).length(4),
  refined_prompt: z.string(),
  negative_prompt: z.string(),
});

export const image: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "image",
  category: "design",
  name_ko: "해봇 이미지 생성",
  name_en: "Image Generator",
  summary: "제품 이미지를 용도별 프리셋으로 4컷 생성합니다.",
  icon: ImageIcon,
  inputs: [
    { kind: "text", id: "description", label: "설명", required: true },
    {
      kind: "select",
      id: "preset",
      label: "용도 프리셋",
      options: [
        { value: "studio", label: "제품 스튜디오컷" },
        { value: "packaging", label: "패키징" },
        { value: "3d_render", label: "3D 렌더" },
        { value: "landing_ui", label: "랜딩 UI" },
        { value: "ad_banner", label: "광고 배너" },
        { value: "background", label: "배경" },
      ],
    },
    {
      kind: "select",
      id: "ratio",
      label: "비율",
      options: [
        { value: "1:1", label: "1:1" },
        { value: "4:5", label: "4:5" },
        { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" },
      ],
    },
    { kind: "image", id: "reference", label: "참조 이미지" },
  ],
  usesProfile: ["brand_colors"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "images",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-flash-image",
  estimatedCredits: 35,
  estimatedSeconds: 20,
};
