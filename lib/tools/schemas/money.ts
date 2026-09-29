import { z } from "zod";

// Each model carries its own numbers — a 12-month revenue estimate, the
// monthly running cost, unit economics and what the start-up money buys —
// so the report can compare the three side by side and draw when each
// one pays back.
const outputSchema = z.object({
  summary: z.string(),
  models: z
    .array(
      z.object({
        rank: z.number(),
        name: z.string(),
        tagline: z.string(),
        fit_reason: z.string(),
        fit_cites: z.array(z.string()),
        first_30_days: z.array(z.object({ day: z.number(), title: z.string() })),
        startup_cost_krw: z.number(),
        cost_breakdown: z.array(z.object({ item: z.string(), amount_krw: z.number() })),
        monthly_cost_krw: z.number(),
        monthly_revenue_krw: z.array(z.number()).length(12),
        unit_economics: z.object({ price_krw: z.number(), unit_cost_krw: z.number(), monthly_units_target: z.number() }),
        weekly_hours: z.number(),
        breakeven_months: z.number(),
        difficulty: z.number().min(1).max(5),
        skill_gaps: z.array(z.string()),
      }),
    )
    .length(3),
});

export default outputSchema;
