import { Pickaxe } from "lucide-react";
import type { ToolManifest } from "../types";

// 인사이트 마이너: themes and real needs mined from reviews and interviews.
export const insightMiner: ToolManifest = {
  id: "insight-miner",
  category: "research",
  name_ko: "인사이트 마이너",
  name_en: "Insight Miner",
  summary: "리뷰·설문·인터뷰에서 반복되는 주제와 고객의 진짜 요구를 캐내기",
  icon: Pickaxe,
  inputs: [
    { kind: "textarea", id: "data", label: "리뷰·설문 답변·인터뷰 텍스트", rows: 10, required: true, max: 20000 },
    {
      kind: "select",
      id: "source_type",
      label: "어떤 자료인가요",
      options: [
        { value: "reviews", label: "구매 리뷰" },
        { value: "survey", label: "설문 답변" },
        { value: "interviews", label: "인터뷰" },
        { value: "cs", label: "고객 문의" },
      ],
    },
    { kind: "text", id: "product", label: "제품·서비스", max: 200 },
    { kind: "text", id: "question", label: "특히 알고 싶은 것 (선택)", max: 300 },
  ],
  usesProfile: ["brand_name", "industry"],
  acceptsChainFrom: [],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 30,
  estimatedSeconds: 150,
};
