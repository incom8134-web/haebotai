import { z } from "zod";
import { sourceSchema } from "../registry/shared.ts";

// 경쟁사 렌즈: competitors side by side — a matrix of the criteria customers
// actually choose on (scored 1–5 per company), a positioning map on two
// buyer-relevant axes with us placed in the open space, and the openings
// that follow. Every competitor fact says where it came from.

const outputSchema = z.object({
  summary: z.string(),
  axes: z.object({ x: z.string(), y: z.string() }),
  us: z.object({ x: z.number().min(0).max(10), y: z.number().min(0).max(10), position: z.string() }),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        positioning: z.string(),
        price: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        x: z.number().min(0).max(10),
        y: z.number().min(0).max(10),
        origin: z.enum(["search", "user", "hypothesis"]),
      }),
    )
    .min(2)
    .max(6),
  matrix: z.array(z.object({ criterion: z.string(), scores: z.array(z.object({ name: z.string(), score: z.number(), note: z.string() })) })),
  opportunities: z.array(z.object({ title: z.string(), gap: z.string(), move: z.string(), risk: z.string() })),
  sources: z.array(sourceSchema),
});

export default outputSchema;
