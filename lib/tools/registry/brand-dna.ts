import { Dna } from "lucide-react";
import type { ToolManifest } from "../types";

// 브랜드 DNA 스튜디오 (docs/redesign-plan.md §3): the brand's rules on one
// board — personality, voice, palette, type — for every later output.
export const brandDna: ToolManifest = {
  id: "brand-dna",
  category: "brand",
  name_ko: "브랜드 DNA 스튜디오",
  name_en: "Brand DNA Studio",
  summary: "성격·목소리·색·약속까지, 모든 결과물이 따를 브랜드의 기준",
  icon: Dna,
  inputs: [
    { kind: "text", id: "brand_name", label: "브랜드 이름", required: true, max: 60 },
    { kind: "textarea", id: "offering", label: "무엇을 누구에게 파나요", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "target_customer", label: "가장 중요한 고객", max: 200 },
    {
      kind: "select",
      id: "personality",
      label: "브랜드의 성격",
      options: [
        { value: "warm", label: "다정한 이웃" },
        { value: "expert", label: "믿음직한 전문가" },
        { value: "bold", label: "대담한 도전자" },
        { value: "playful", label: "유쾌한 친구" },
        { value: "premium", label: "품격 있는 장인" },
        { value: "natural", label: "담백한 자연주의" },
      ],
    },
    {
      kind: "multiselect",
      id: "styles",
      label: "끌리는 시각 스타일 (최대 3개)",
      options: [
        { value: "minimal", label: "미니멀" },
        { value: "warm", label: "따뜻한 손맛" },
        { value: "bold", label: "강렬한 대비" },
        { value: "classic", label: "클래식" },
        { value: "modern", label: "모던 테크" },
        { value: "organic", label: "오가닉" },
        { value: "luxe", label: "럭셔리" },
        { value: "retro", label: "레트로" },
      ],
      max: 3,
    },
    { kind: "chips", id: "values", label: "지키고 싶은 가치", max: 5 },
    { kind: "chips", id: "competitors", label: "비교되는 브랜드 (선택)", max: 5 },
    { kind: "chips", id: "existing_colors", label: "이미 쓰는 색 (선택, 예: #1F4E79)", max: 4 },
    { kind: "text", id: "avoid", label: "절대 되고 싶지 않은 모습", max: 200 },
  ],
  usesProfile: ["brand_name", "industry", "target_customer", "tone", "brand_colors"],
  acceptsChainFrom: ["idea-radar", "offer-architect"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 35,
  estimatedSeconds: 170,
};
