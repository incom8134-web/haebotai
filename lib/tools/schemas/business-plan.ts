import { z } from "zod";
import { sourceSchema } from "../registry/shared";

// Built for the charts a reviewer expects in a real 사업계획서: market
// circles (TAM/SAM/SOM in won), a positioning map, SWOT, revenue mix,
// a 3-year P&L and first-year monthly revenue curve, where the money
// goes, milestones and a risk matrix. Money is plain numbers in won so
// the report can chart and total it; words go in the text fields.
const marketSize = z.object({ value_krw: z.number(), basis: z.string() });

const outputSchema = z.object({
  title: z.string(),
  one_liner: z.string(),
  sections: z.object({
    summary: z.string(),
    problem: z.string(),
    solution: z.string(),
    product: z.string(),
    business_model: z.string(),
    team: z.string(),
  }),
  market_analysis: z.object({
    tam: marketSize,
    sam: marketSize,
    som: marketSize,
    size: z.string(),
    growth: z.string(),
    cagr_pct: z.number(),
    trends: z.array(z.string()),
    sources: z.array(sourceSchema),
  }),
  competitor_matrix: z.array(z.array(z.string())),
  positioning: z.object({
    x_axis: z.string(),
    y_axis: z.string(),
    players: z.array(z.object({ name: z.string(), x: z.number(), y: z.number(), is_us: z.boolean() })),
  }),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  revenue_streams: z.array(z.object({ name: z.string(), share_pct: z.number(), pricing: z.string() })),
  financials: z.object({
    yearly: z
      .array(z.object({ year: z.string(), revenue_krw: z.number(), cost_krw: z.number(), customers: z.number() }))
      .length(3),
    monthly_revenue_krw: z.array(z.number()).length(12),
    assumptions: z.array(z.string()),
    breakeven_month: z.number(),
  }),
  funding: z.object({
    total_krw: z.number(),
    uses: z.array(z.object({ item: z.string(), amount_krw: z.number() })),
  }),
  milestones: z.array(z.object({ period: z.string(), goal: z.string(), kpi: z.string() })),
  risks: z.array(z.object({ risk: z.string(), likelihood: z.number().min(1).max(5), impact: z.number().min(1).max(5), mitigation: z.string() })),
});

export default outputSchema;
