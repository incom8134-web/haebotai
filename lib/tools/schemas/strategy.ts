import { z } from "zod";
import { sourceSchema } from "../registry/shared";

// Deliberately wide: a strategy a shop owner can act on needs the
// market read, who exactly the customers are, where each competitor
// sits, what to sell at what price, and a dated plan with targets — not
// just a positioning line and three slogans. The numbers (segment
// shares, 0–10 map coordinates, risk likelihood × impact) are what the
// report charts.
const outputSchema = z.object({
  summary: z.string(),
  market_insights: z.array(z.object({ insight: z.string(), implication: z.string(), sources: z.array(sourceSchema) })),
  segments: z.array(
    z.object({ name: z.string(), share_pct: z.number(), situation: z.string(), need: z.string(), current_alternative: z.string(), message: z.string() }),
  ),
  positioning_axes: z.object({ x_axis: z.string(), y_axis: z.string(), our_x: z.number(), our_y: z.number() }),
  competitor_map: z.array(
    z.object({ name: z.string(), x: z.number(), y: z.number(), position: z.string(), strength: z.string(), weakness: z.string(), our_angle: z.string() }),
  ),
  core_tension: z.string(),
  positioning_statement: z.string(),
  promise: z.string(),
  reasons_to_believe: z.array(z.string()),
  offers: z.array(z.object({ name: z.string(), what: z.string(), price_idea: z.string(), why_it_works: z.string() })),
  territories: z.array(
    z.object({ name: z.string(), idea: z.string(), example_line: z.string(), channels: z.array(z.string()), first_content: z.string() }),
  ),
  recommended_territory: z.string(),
  action_plan: z.array(z.object({ phase: z.string(), goal: z.string(), tasks: z.array(z.string()) })),
  kpis: z.array(z.object({ metric: z.string(), baseline: z.string(), target: z.string(), how_to_measure: z.string() })),
  risks: z.array(z.object({ risk: z.string(), likelihood: z.number().min(1).max(5), impact: z.number().min(1).max(5), mitigation: z.string() })),
});

export default outputSchema;
