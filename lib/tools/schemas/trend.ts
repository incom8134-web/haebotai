import { z } from "zod";
import { sourceSchema } from "../registry/shared.ts";

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

// Scores feed the leaderboard, radar and heatmap; demand_trend is an
// estimated interest index (0–100) per period for each idea's curve.
const outputSchema = z.object({
  summary: z.string(),
  recommended: z.string(),
  signals: z.array(z.object({ signal: z.string(), direction: z.enum(["up", "flat", "down"]), evidence: z.string() })),
  ideas: z.array(
    z.object({
      name: z.string(),
      one_liner: z.string(),
      scores: scoreSchema,
      composite: z.number(),
      demand_trend: z.array(z.object({ period: z.string(), index: z.number() })),
      target_customer: z.string(),
      entry_cost_krw: z.number(),
      price_gap: z.object({ band: z.string(), evidence: z.string() }),
      differentiation_angles: z.array(z.string()).length(3),
      verdict: z.string(),
      risks: z.array(z.string()),
      sources: z.array(sourceSchema),
    }),
  ),
});

export default outputSchema;
