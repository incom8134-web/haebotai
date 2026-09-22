import { UserRound } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.10
// HARD GUARDS: refuse to generate a likeness of any real, identifiable
// person, named or uploaded; refuse uploads that are primarily a real
// person's face. Enforced two ways in lib/tools/generate.ts:
// containsRealPersonFace() is a dedicated vision pre-check that runs
// before any paid image generation and refuses the run outright, plus
// the GUARDS system-prompt instruction on the generation call itself as
// defense in depth. `disclosure` below is already structurally enforced
// via z.literal — no generation path can omit it.

const outputSchema = z.object({
  shots: z.array(z.object({ asset_id: z.string(), url: z.string() })).length(4),
  model_seed: z.string(),
  disclosure: z.literal("AI 생성 이미지"),
});

export const brandModel: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "brand-model",
  category: "design",
  name_ko: "해봇 브랜드 모델",
  name_en: "Brand Model",
  summary: "제품을 보여줄 일관된 AI 모델 컷을 생성합니다.",
  icon: UserRound,
  inputs: [
    { kind: "image", id: "product_photo", label: "제품 사진", maxFiles: 1 },
    {
      kind: "select",
      id: "model_profile",
      label: "모델 성별·연령대",
      options: [
        { value: "f20", label: "여성 20대" },
        { value: "f30", label: "여성 30대" },
        { value: "m20", label: "남성 20대" },
        { value: "m30", label: "남성 30대" },
        { value: "any", label: "성별무관" },
      ],
    },
    {
      kind: "select",
      id: "mood",
      label: "분위기",
      options: [
        { value: "minimal", label: "미니멀" },
        { value: "casual", label: "캐주얼" },
        { value: "luxury", label: "럭셔리" },
        { value: "natural", label: "내추럴" },
      ],
    },
    {
      kind: "select",
      id: "setting",
      label: "배경/상황",
      options: [
        { value: "studio", label: "스튜디오" },
        { value: "outdoor", label: "야외" },
        { value: "cafe", label: "카페" },
        { value: "store", label: "매장" },
      ],
    },
    {
      kind: "select",
      id: "ratio",
      label: "비율",
      options: [
        { value: "1:1", label: "1:1" },
        { value: "4:5", label: "4:5" },
        { value: "9:16", label: "9:16" },
      ],
    },
  ],
  usesProfile: [],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "images",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-flash-image",
  estimatedCredits: 45,
  estimatedSeconds: 30,
};
