import { z } from "zod";

const outputSchema = z.object({
  matches: z.array(
    z.object({
      program_name: z.string(),
      agency: z.string(),
      deadline: z.string(),
      funding_scale: z.string(),
      max_amount_krw: z.number(),
      deadline_date: z.string(),
      eligibility: z.array(z.object({ requirement: z.string(), user_meets: z.boolean(), note: z.string() })),
      document_checklist: z.array(z.string()),
      difficulty: z.number().min(1).max(5),
      source_url: z.string(),
    }),
  ),
  unmatched_reasons: z.array(z.string()),
});

export default outputSchema;
