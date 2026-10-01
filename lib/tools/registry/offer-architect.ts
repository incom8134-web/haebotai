import { Blocks } from "lucide-react";
import type { ToolManifest } from "../types";

// 오퍼 설계소: a product or service turned into an offer, block by block.
export const offerArchitect: ToolManifest = {
  id: "offer-architect",
  category: "discover",
  name_ko: "오퍼 설계소",
  name_en: "Offer Architect",
  summary: "제품·서비스를 고객이 바로 이해하고 사고 싶어지는 제안으로",
  icon: Blocks,
  inputs: [
    { kind: "textarea", id: "product", label: "제품·서비스", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "target_customer", label: "누구에게 파나요", required: true, max: 200 },
    { kind: "textarea", id: "problem", label: "고객이 겪는 문제", rows: 2, max: 600 },
    { kind: "text", id: "outcome", label: "고객이 얻는 결과", max: 200 },
    { kind: "number", id: "price_min", label: "가격대 (최저)", unit: "원", min: 0 },
    { kind: "number", id: "price_max", label: "가격대 (최고)", unit: "원", min: 0 },
    { kind: "textarea", id: "differentiation", label: "다른 곳과 다른 점", rows: 2, max: 600 },
    { kind: "chips", id: "proof", label: "보여줄 수 있는 근거 (후기 수, 경력, 인증 등)", max: 6 },
    {
      kind: "select",
      id: "channel",
      label: "주로 파는 곳",
      options: [
        { value: "smartstore", label: "스마트스토어·오픈마켓" },
        { value: "website", label: "자사몰·랜딩페이지" },
        { value: "sns", label: "인스타그램·SNS" },
        { value: "offline", label: "매장·대면" },
        { value: "b2b", label: "영업·제안(B2B)" },
      ],
    },
  ],
  usesProfile: ["brand_name", "industry", "tone"],
  acceptsChainFrom: ["competitor-lens", "idea-radar", "revenue-mapper"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 35,
  estimatedSeconds: 170,
};
