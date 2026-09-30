import { Network } from "lucide-react";
import type { ToolManifest } from "../types";

// 수익 구조 지도: every way one idea can earn, and the mix to start with.
export const revenueMapper: ToolManifest = {
  id: "revenue-mapper",
  category: "discover",
  name_ko: "수익 구조 지도",
  name_en: "Revenue Mapper",
  summary: "하나의 아이디어에서 나올 수 있는 수익 흐름과 가격 모델을 한 장의 지도로",
  icon: Network,
  inputs: [
    { kind: "textarea", id: "idea", label: "사업 아이디어", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "customers", label: "주요 고객", max: 200 },
    { kind: "textarea", id: "assets", label: "이미 가진 것 (콘텐츠, 공간, 장비, 고객 명단 등)", rows: 2, max: 600 },
    {
      kind: "multiselect",
      id: "preferred_models",
      label: "관심 있는 방식 (선택)",
      options: [
        { value: "one_time", label: "단건 판매" },
        { value: "subscription", label: "구독·정기" },
        { value: "service", label: "서비스 패키지" },
        { value: "usage", label: "사용량 과금" },
        { value: "commission", label: "수수료·중개" },
        { value: "licensing", label: "라이선스" },
        { value: "advertising", label: "광고·협찬" },
      ],
      max: 7,
    },
    { kind: "number", id: "target_price", label: "생각하는 대표 가격", unit: "원", min: 0 },
    { kind: "number", id: "unit_cost", label: "한 건당 원가 (알면)", unit: "원", min: 0 },
    { kind: "number", id: "monthly_goal", label: "월 매출 목표", unit: "원", min: 0 },
  ],
  usesProfile: ["brand_name", "industry", "target_customer"],
  acceptsChainFrom: ["idea-radar"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: true },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 35,
  estimatedSeconds: 170,
};
