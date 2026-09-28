import { z } from "zod";

const outputSchema = z.object({
  models: z
    .array(
      z.object({
        rank: z.number(),
        name: z.string(),
        fit_reason: z.string(),
        fit_cites: z.array(z.string()),
        first_30_days: z.array(z.object({ day: z.number(), title: z.string() })),
        startup_cost_krw: z.number(),
        breakeven_months: z.number(),
        difficulty: z.number().min(1).max(5),
        skill_gaps: z.array(z.string()),
      }),
    )
    .length(3),
});

export default outputSchema;
