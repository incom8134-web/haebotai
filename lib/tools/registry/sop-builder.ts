import { ListChecks } from "lucide-react";
import type { ToolManifest } from "../types";

// 업무 매뉴얼 빌더: repeated work as a procedure anyone can follow.
export const sopBuilder: ToolManifest = {
  id: "sop-builder",
  category: "operate",
  name_ko: "업무 매뉴얼 빌더",
  name_en: "SOP Builder",
  summary: "반복 업무를 누가 해도 같은 결과가 나오는 절차서로",
  icon: ListChecks,
  inputs: [
    { kind: "textarea", id: "process", label: "어떤 일을 어떻게 하고 있나요", rows: 5, required: true, max: 4000 },
    { kind: "text", id: "standard", label: "잘 됐다고 할 기준", max: 300 },
    { kind: "chips", id: "roles", label: "참여하는 사람·역할", max: 6 },
    {
      kind: "select",
      id: "frequency",
      label: "얼마나 자주 하나요",
      options: [
        { value: "per_order", label: "주문·요청마다" },
        { value: "daily", label: "매일" },
        { value: "weekly", label: "매주" },
        { value: "monthly", label: "매월" },
      ],
    },
    { kind: "chips", id: "tools", label: "쓰는 도구 (예: 스마트스토어, 카카오톡)", max: 6 },
    { kind: "textarea", id: "problems", label: "자주 생기는 실수·문제", rows: 3, max: 1500 },
    {
      kind: "select",
      id: "detail",
      label: "얼마나 자세히",
      options: [
        { value: "simple", label: "한 장 요약" },
        { value: "standard", label: "보통" },
        { value: "detailed", label: "신입 교육용으로 자세히" },
      ],
    },
  ],
  usesProfile: ["brand_name", "industry"],
  acceptsChainFrom: ["meeting-action"],
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 30,
  estimatedSeconds: 150,
};
