import { z } from "zod";
import { sourceSchema } from "../registry/shared.ts";

// 시장 리서치 데스크: a research framework, not an essay — the questions
// the decision depends on, the assumptions behind it (and whether each is
// verified), evidence blocks per question labelled by where they came
// from (web search, the member's input, or hypothesis), a sizing with its
// method, and what to check next.

const origin = z.enum(["search", "user", "hypothesis"]);

const outputSchema = z.object({
  summary: z.string(),
  decision: z.string(),
  questions: z.array(z.object({ id: z.string(), question: z.string(), why: z.string() })).min(3).max(6),
  assumptions: z.array(z.object({ assumption: z.string(), status: z.enum(["verified", "partly", "unverified"]), risk_if_wrong: z.string() })),
  evidence: z.array(
    z.object({
      question_id: z.string(),
      finding: z.string(),
      figure: z.string(),
      origin,
      confidence: z.enum(["high", "medium", "low"]),
      source_title: z.string(),
    }),
  ),
  market_size: z.object({ estimate: z.string(), method: z.string(), origin }),
  implications: z.array(z.string()),
  next_checks: z.array(z.object({ check: z.string(), how: z.string(), cost: z.string() })),
  sources: z.array(sourceSchema),
});

export default outputSchema;
