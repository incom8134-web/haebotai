import { Briefcase } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";
import { sourceSchema } from "./shared";

// HAEBOT_A_TOOLS_SPEC.md §5.2 — requireSources on every market figure.
// Export to .docx + .xlsx (live formulas) lands with the xlsx skill
// pattern, not here.

const outputSchema = z.object({
  sections: z.object({
    summary: z.string(),
    team: z.string(),
    product: z.string(),
  }),
  market_analysis: z.object({
    size: z.string(),
    growth: z.string(),
    sources: z.array(sourceSchema),
  }),
  competitor_matrix: z.array(z.array(z.string())),
  financials: z.object({
    pl_3yr: z.array(z.array(z.number())),
    assumptions: z.array(z.string()),
    breakeven_month: z.number(),
  }),
});

export const businessPlan: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "business-plan",
  category: "docs",
  name_ko: "해봇 사업계획서",
  name_en: "Business Plan",
  summary: "투자·정부지원용 사업계획서와 재무 가정을 작성합니다.",
  icon: Briefcase,
  inputs: [
    { kind: "textarea", id: "item", label: "아이템", rows: 3, required: true },
    {
      kind: "select",
      id: "purpose",
      label: "목적",
      options: [
        { value: "investment", label: "투자유치" },
        { value: "government", label: "정부지원" },
        { value: "internal", label: "내부검토" },
        { value: "loan", label: "대출" },
      ],
    },
    { kind: "text", id: "market", label: "시장" },
    { kind: "textarea", id: "team", label: "팀 구성", rows: 2 },
    { kind: "number", id: "unit_price", label: "단가", unit: "원", min: 0 },
    { kind: "number", id: "monthly_sales_target", label: "월 판매량 목표", unit: "개", min: 0 },
    { kind: "number", id: "fixed_cost", label: "고정비", unit: "원", min: 0 },
    { kind: "number", id: "variable_cost_rate", label: "변동비율", unit: "%", min: 0, max: 100 },
  ],
  usesProfile: ["brand_name", "industry"],
  acceptsChainFrom: ["trend"],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: true, webSearch: true, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 60,
  estimatedSeconds: 75,
};
