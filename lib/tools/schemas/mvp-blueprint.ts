import { z } from "zod";

// MVP 설계도: the smallest real first version — must/should/later features
// with effort, the user journey from discovery to paying and returning,
// the tools to build it with (no-code first when that's enough), stages
// with exit criteria, a launch checklist and the one hypothesis it tests.
const outputSchema = z.object({
  product_one_liner: z.string(),
  target_user: z.string(),
  core_job: z.string(),
  features: z
    .array(z.object({ name: z.string(), description: z.string(), priority: z.enum(["must", "should", "later"]), effort: z.enum(["S", "M", "L"]), reason: z.string() }))
    .min(5)
    .max(12),
  journey: z
    .array(z.object({ moment: z.enum(["discover", "try", "value", "pay", "return"]), user_action: z.string(), product_response: z.string() }))
    .min(4)
    .max(8),
  stack: z.array(z.object({ layer: z.string(), choice: z.string(), why: z.string(), alternative: z.string(), cost_note: z.string() })).min(3).max(8),
  stages: z.array(z.object({ name: z.string(), weeks: z.number(), goal: z.string(), deliverables: z.array(z.string()), exit_criteria: z.string() })).min(3).max(5),
  launch_checklist: z.array(z.object({ item: z.string(), category: z.enum(["product", "legal", "payment", "marketing", "support"]) })).min(6).max(16),
  validation: z.object({ hypothesis: z.string(), metric: z.string(), target: z.string(), method: z.string() }),
  out_of_scope: z.array(z.string()),
});

export default outputSchema;
