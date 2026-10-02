import { z } from "zod";
import type { Intent } from "./types.ts";

// What the run page may send about the agent: the understanding the member
// saw (from /api/tools/[toolId]/intent), their answers to its questions,
// and "make it with a different strategy". All of it only steers this
// member's own run, but it is still bounded and shaped here — anything
// malformed is dropped and the run works it out itself.

const s = (max: number) => z.string().trim().max(max);

const intentSchema = z.object({
  subject: s(80),
  usesProfile: z.boolean(),
  kind: s(160),
  audience: z.array(s(120)).max(4),
  goal: s(160),
  positioning: s(200),
  tone: z.object({ words: s(120).min(1), formality: z.enum(["formal", "neutral", "casual"]), energy: z.enum(["calm", "balanced", "energetic"]) }),
  mustInclude: z.array(s(160)).max(10),
  avoid: z.array(s(120)).max(6),
  unknowns: z.array(z.object({ item: s(120), critical: z.boolean(), assumption: s(200) })).max(6),
  summary: s(160),
  memo: s(1200).optional(),
});

const requestSchema = z.object({
  intent: intentSchema.nullish(),
  answers: z.array(z.object({ question: s(160).min(1), answer: s(200).min(1) })).max(3).optional(),
  strategyOverride: s(80).nullish(),
});

export function parseAgentRequest(body: unknown): { intent: Intent | null; answers: { question: string; answer: string }[]; strategyOverride: string | null } {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).agent : undefined;
  const parsed = requestSchema.safeParse(raw ?? {});
  if (!parsed.success) return { intent: null, answers: [], strategyOverride: null };
  return { intent: parsed.data.intent ?? null, answers: parsed.data.answers ?? [], strategyOverride: parsed.data.strategyOverride || null };
}
