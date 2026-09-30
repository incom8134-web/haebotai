import { z } from "zod";

// 오퍼 설계소: the offer as blocks — promise, who it's for, what's in it and
// why each part matters, three packages, bonuses, an honest guarantee and
// urgency, objection answers, the CTA and two lengths of sales message.
const outputSchema = z.object({
  offer_name: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  positioning_line: z.string(),
  target: z.object({ who: z.string(), situation: z.string(), desired_outcome: z.string() }),
  core_promise: z.string(),
  value_stack: z.array(z.object({ item: z.string(), what_it_does: z.string(), why_it_matters: z.string() })).min(3).max(7),
  packages: z
    .array(z.object({ tier: z.enum(["entry", "core", "premium"]), name: z.string(), price_krw: z.number(), includes: z.array(z.string()), best_for: z.string() }))
    .length(3),
  bonuses: z.array(z.object({ name: z.string(), why: z.string() })).max(4),
  guarantee: z.object({ type: z.string(), terms: z.string(), caution: z.string() }),
  urgency: z.object({ mechanism: z.string(), honest_note: z.string() }),
  objections: z.array(z.object({ objection: z.string(), answer: z.string() })).min(3).max(6),
  cta: z.object({ button: z.string(), microcopy: z.string() }),
  sales_message: z.object({ short: z.string(), long: z.string() }),
});

export default outputSchema;
