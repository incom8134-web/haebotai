import { z } from "zod";
import { sourceSchema } from "../registry/shared";

// 시장 빈틈 탐지기: customer needs × existing solutions, with how well each
// solution covers each need — the empty cells are the gaps. Every need and
// gap says where it came from (search, the member's input, or hypothesis).
const origin = z.enum(["search", "user", "hypothesis"]);

const outputSchema = z.object({
  market_summary: z.string(),
  needs: z
    .array(z.object({ id: z.string(), need: z.string(), who: z.string(), intensity: z.number().min(1).max(5), evidence: z.string(), origin }))
    .min(4)
    .max(8),
  solutions: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["direct", "indirect", "diy", "nothing"]),
        note: z.string(),
        coverage: z.array(z.object({ need_id: z.string(), level: z.number().min(0).max(2) })),
      }),
    )
    .min(2)
    .max(6),
  gaps: z
    .array(
      z.object({
        title: z.string(),
        need_ids: z.array(z.string()),
        why_unserved: z.string(),
        opportunity: z.string(),
        differentiation: z.string(),
        confidence: z.enum(["high", "medium", "low"]),
        origin,
      }),
    )
    .min(2)
    .max(5),
  validation_questions: z.array(z.object({ question: z.string(), ask_whom: z.string(), signal: z.string() })).min(3).max(6),
  sources: z.array(sourceSchema),
});

export default outputSchema;
