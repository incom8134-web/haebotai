import { Radar } from "lucide-react";
import type { ToolManifest } from "../types";

// 아이디어 레이더 (docs/redesign-plan.md §3): business concepts from what the
// member already has — skills, money, time, place — scored on the same axes.
export const ideaRadar: ToolManifest = {
  id: "idea-radar",
  category: "discover",
  name_ko: "아이디어 레이더",
  name_en: "Idea Radar",
  summary: "내 경험·자원·시간에 맞는 사업 아이디어를 점수와 함께 비교",
  icon: Radar,
  inputs: [
    { kind: "textarea", id: "skills", label: "할 줄 아는 것·경력", rows: 3, required: true, max: 1200 },
    { kind: "chips", id: "interests", label: "관심 있는 분야", max: 6 },
    { kind: "text", id: "target_customer", label: "도와주고 싶은 고객 (선택)", max: 200 },
    {
      kind: "multiselect",
      id: "business_types",
      label: "원하는 사업 형태",
      options: [
        { value: "service", label: "서비스·대행" },
        { value: "product", label: "제품 판매" },
        { value: "content", label: "콘텐츠·교육" },
        { value: "platform", label: "앱·플랫폼" },
        { value: "local", label: "오프라인 매장" },
        { value: "b2b", label: "기업 대상(B2B)" },
      ],
      max: 6,
    },
    {
      kind: "select",
      id: "channel",
      label: "온라인 / 오프라인",
      options: [
        { value: "online", label: "온라인" },
        { value: "offline", label: "오프라인" },
        { value: "hybrid", label: "둘 다" },
      ],
    },
    {
      kind: "select",
      id: "budget",
      label: "쓸 수 있는 초기 자금",
      options: [
        { value: "0", label: "0원" },
        { value: "3m", label: "~300만원" },
        { value: "10m", label: "~1,000만원" },
        { value: "30m", label: "~3,000만원" },
        { value: "30m+", label: "3,000만원+" },
      ],
    },
    { kind: "number", id: "weekly_hours", label: "주당 쓸 수 있는 시간", unit: "시간", min: 1, max: 80 },
    { kind: "text", id: "location", label: "지역 (오프라인일 때)", max: 80 },
    {
      kind: "select",
      id: "risk",
      label: "위험 감수",
      options: [
        { value: "low", label: "잃지 않는 게 먼저" },
        { value: "mid", label: "적당히" },
        { value: "high", label: "크게 걸어도 됨" },
      ],
    },
    { kind: "text", id: "avoid", label: "피하고 싶은 일", max: 200 },
  ],
  usesProfile: ["industry", "business_stage", "region"],
  acceptsChainFrom: ["market-gap"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: true, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 40,
  estimatedSeconds: 200,
};
