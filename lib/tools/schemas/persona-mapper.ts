import { z } from "zod";

// 고객 페르소나 지도: one or two customers on a page — who they are, in
// their own words, what they want and what stops them, what makes them
// buy — and their journey from first hearing of you to recommending you,
// with how they feel at each stage. data_basis says what came from the
// member's data and what is assumed.

const JOURNEY_STAGES = ["aware", "consider", "decide", "use", "advocate"] as const;

const outputSchema = z.object({
  summary: z.string(),
  personas: z
    .array(
      z.object({
        name: z.string(),
        age_range: z.string(),
        situation: z.string(),
        quote: z.string(),
        goals: z.array(z.string()),
        frustrations: z.array(z.string()),
        triggers: z.array(z.string()),
        objections: z.array(z.string()),
        channels: z.array(z.string()),
        decision_factors: z.array(z.object({ factor: z.string(), weight: z.number() })),
      }),
    )
    .min(1)
    .max(2),
  journey: z.array(
    z.object({
      stage: z.enum(JOURNEY_STAGES),
      doing: z.string(),
      thinking: z.string(),
      feeling: z.number(),
      touchpoints: z.array(z.string()),
      opportunity: z.string(),
    }),
  ),
  messaging: z.array(z.object({ stage: z.enum(JOURNEY_STAGES), message: z.string() })),
  data_basis: z.string(),
});

export default outputSchema;
