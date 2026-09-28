import { z } from "zod";
import { sourceSchema } from "../registry/shared";

const scoreSchema = z.object({
  market_size: z.number(),
  growth: z.number(),
  entry_barrier: z.number(),
  competition: z.number(),
  margin: z.number(),
  execution_difficulty: z.number(),
  capital_need: z.number(),
  personal_fit: z.number(),
});

const outputSchema = z.object({
  ideas: z.array(
    z.object({
      name: z.string(),
      scores: scoreSchema,
      composite: z.number(),
      price_gap: z.object({ band: z.string(), evidence: z.string() }),
      differentiation_angles: z.array(z.string()).length(3),
      sources: z.array(sourceSchema),
    }),
  ),
});

export default outputSchema;
