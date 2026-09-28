import { z } from "zod";
import { sourceSchema } from "../registry/shared";

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

export default outputSchema;
