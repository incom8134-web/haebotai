import { z } from "zod";

// 아이디어 레이더: 4–6 business concepts built from the member's own skills,
// resources and constraints, each scored on the same five axes so they can
// be compared side by side, with the one cheap test that would prove or
// kill it first. Scores are the model's judgement (labelled as such).
const score = z.number().min(1).max(10);

const outputSchema = z.object({
  summary: z.string(),
  lens: z.string(),
  ideas: z
    .array(
      z.object({
        name: z.string(),
        one_liner: z.string(),
        archetype: z.enum(["service", "product", "content", "platform", "local", "b2b"]),
        customer: z.object({ who: z.string(), situation: z.string() }),
        problem: z.string(),
        value_proposition: z.string(),
        why_you: z.string(),
        revenue: z.object({ model: z.string(), price_hint: z.string(), potential_note: z.string() }),
        mvp: z.string(),
        resources: z.array(z.string()),
        first_validation: z.object({ action: z.string(), success_signal: z.string(), days: z.number() }),
        scores: z.object({ fit: score, demand: score, speed: score, capital: score, edge: score }),
        risks: z.array(z.string()),
      }),
    )
    .min(4)
    .max(6),
  recommendation: z.object({ pick: z.string(), reason: z.string(), runner_up: z.string() }),
});

export default outputSchema;
