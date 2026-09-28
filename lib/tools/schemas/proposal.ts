import { z } from "zod";

const outputSchema = z.object({
  cover: z.string(),
  executive_summary: z.string(),
  problem: z.string(),
  solution: z.string(),
  execution_plan: z.array(z.string()),
  timeline: z.array(z.object({ phase: z.string(), weeks: z.number(), deliverable: z.string() })),
  pricing_table: z.array(z.object({ item: z.string(), amount_krw: z.number() })),
  company_intro: z.string(),
});

export default outputSchema;
