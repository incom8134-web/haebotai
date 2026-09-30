import { Presentation } from "lucide-react";
import type { ToolManifest } from "../types";

// From the aimarketingstudio prototype's "Presentation AI": narrative
// first — a storyline, then slides that each earn their place, with
// speaker notes. Exported as a structured outline (see run-result).

export const presentation: ToolManifest = {
  id: "presentation",
  category: "brand",
  name_ko: "피치 비주얼 디렉터",
  name_en: "Pitch Visual Director",
  summary: "브리프를 이야기 흐름이 있는 발표자료 구성과 발표 메모로 만듭니다.",
  icon: Presentation,
  inputs: [
    { kind: "textarea", id: "brief", label: "발표 주제와 목적", rows: 4, required: true, max: 1200 },
    { kind: "text", id: "audience", label: "듣는 사람" },
    {
      kind: "select",
      id: "slide_count",
      label: "슬라이드 수",
      options: [
        { value: "6", label: "6장" },
        { value: "8", label: "8장" },
        { value: "10", label: "10장" },
        { value: "12", label: "12장" },
        { value: "15", label: "15장" },
        { value: "20", label: "20장" },
      ],
    },
    {
      kind: "select",
      id: "purpose",
      label: "목적",
      options: [
        { value: "pitch", label: "제안·피칭" },
        { value: "report", label: "성과 보고" },
        { value: "launch", label: "런칭 전략" },
        { value: "education", label: "교육·설명" },
      ],
    },
    {
      kind: "select",
      id: "design_tone",
      label: "디자인 톤",
      options: [
        { value: "trust", label: "단정하고 신뢰감 있게" },
        { value: "bold", label: "강렬하고 임팩트 있게" },
      ],
    },
    { kind: "textarea", id: "reference", label: "꼭 넣을 자료·수치", rows: 4, max: 3000 },
  ],
  usesProfile: ["brand_name", "tone", "industry"],
  acceptsChainFrom: ["strategy", "trend", "business-plan"],
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: false, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 110,
  estimatedSeconds: 300,
};
