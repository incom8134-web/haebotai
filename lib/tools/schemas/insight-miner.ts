import { z } from "zod";

// 인사이트 마이너: what customers keep saying, from pasted reviews, survey
// answers or interviews — themes with how often they come up and their
// sentiment split, verbatim quotes (the result page checks each one
// against the pasted text), complaints, praise, requests, and what to do.

const outputSchema = z.object({
  summary: z.string(),
  items_read: z.number(),
  themes: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["complaint", "praise", "request", "question"]),
      description: z.string(),
      mentions: z.number(),
      positive: z.number(),
      negative: z.number(),
      neutral: z.number(),
      quotes: z.array(z.string()),
    }),
  ),
  opportunities: z.array(z.object({ title: z.string(), based_on: z.string(), action: z.string(), effort: z.enum(["S", "M", "L"]) })),
  caveats: z.array(z.string()),
});

export default outputSchema;
