import { z } from "zod";
import { sourceSchema } from "../registry/shared";

// A 사업계획서 is built for the reviewer who reads it (bank, investor,
// grant committee, partner), so its structure is not fixed: `chapters`
// are the plan's own chapters in the order its strategy chose, and each
// analysis block (market circles, competition, revenue mix, financials,
// funding, roadmap, risks) is included only when that reviewer needs it —
// a chapter can place one right after itself (`data`). Money is plain
// numbers in won so the report can chart and total it.
//
// The financials are computed, not written: the model proposes
// `financial_assumptions`, and lib/tools/financial-model.ts turns them
// (with the member's own figures, which win) into the 3-year P&L,
// first-year monthly curve and breakeven month.
const marketSize = z.object({ value_krw: z.number(), basis: z.string() });

const DATA_BLOCKS = ["", "market", "competition", "revenue", "financials", "funding", "roadmap", "risks"] as const;

const outputSchema = z.object({
  title: z.string(),
  one_liner: z.string(),
  plan_type: z.string().optional(),
  chapters: z
    .array(
      z.object({
        title: z.string(),
        purpose: z.string(),
        body: z.string(),
        points: z.array(z.string()).optional(),
        table: z.object({ header: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
        data: z.enum(DATA_BLOCKS).optional(),
      }),
    )
    .optional(),
  financial_assumptions: z
    .object({
      unit_price_krw: z.number(),
      monthly_volume_start: z.number(),
      monthly_growth_pct: z.number(),
      yearly_growth_pct: z.number(),
      variable_cost_pct: z.number(),
      fixed_cost_monthly_krw: z.number(),
      initial_investment_krw: z.number(),
      notes: z.array(z.string()),
    })
    .optional(),
  sections: z
    .object({
    summary: z.string(),
    problem: z.string(),
    solution: z.string(),
    product: z.string(),
    business_model: z.string(),
    team: z.string(),
  })
    .partial()
    .optional(),
  market_analysis: z
    .object({
    tam: marketSize,
    sam: marketSize,
    som: marketSize,
    size: z.string(),
    growth: z.string(),
    cagr_pct: z.number(),
    trends: z.array(z.string()),
    sources: z.array(sourceSchema),
  })
    .optional(),
  competitor_matrix: z.array(z.array(z.string())).optional(),
  positioning: z
    .object({
    x_axis: z.string(),
    y_axis: z.string(),
    players: z.array(z.object({ name: z.string(), x: z.number(), y: z.number(), is_us: z.boolean() })),
  })
    .optional(),
  swot: z
    .object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  })
    .optional(),
  revenue_streams: z.array(z.object({ name: z.string(), share_pct: z.number(), pricing: z.string() })).optional(),
  // Filled by lib/tools/financial-model.ts when financial_assumptions are
  // usable; a model-written projection is kept only as a fallback.
  financials: z
    .object({
      yearly: z
        .array(z.object({ year: z.string(), revenue_krw: z.number(), cost_krw: z.number(), customers: z.number() }))
        .length(3),
      monthly_revenue_krw: z.array(z.number()).length(12),
      assumptions: z.array(z.string()),
      breakeven_month: z.number(),
      payback_month: z.number().optional(),
      computed: z.boolean().optional(),
    })
    .optional(),
  funding: z
    .object({
      total_krw: z.number(),
      uses: z.array(z.object({ item: z.string(), amount_krw: z.number() })),
    })
    .optional(),
  milestones: z.array(z.object({ period: z.string(), goal: z.string(), kpi: z.string() })).optional(),
  risks: z.array(z.object({ risk: z.string(), likelihood: z.number().min(1).max(5), impact: z.number().min(1).max(5), mitigation: z.string() })).optional(),
});

export default outputSchema;
