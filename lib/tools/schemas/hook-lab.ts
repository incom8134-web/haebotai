import { z } from "zod";

// 훅 연구소: opening hooks for short-form content, grouped by hook family
// (question, contrarian, number, story, pain, curiosity, before/after,
// proof) — each with the on-screen text, what the first 3 seconds show,
// the line that follows, and a version per platform.

const HOOK_FAMILIES = ["question", "contrarian", "number", "story", "pain", "curiosity", "before_after", "proof"] as const;
const HOOK_PLATFORMS = ["reels", "shorts", "tiktok", "threads", "blog", "ad"] as const;

// Hooks are one flat list tagged with their family, capped at 16: Gemini's
// structured output rejected both the nested version (families → hooks →
// variants) and a flat list allowed up to 20 (400 "invalid argument").
const outputSchema = z.object({
  summary: z.string(),
  audience_insight: z.string(),
  families: z.array(z.object({ family: z.enum(HOOK_FAMILIES), why_it_works: z.string() })).min(4).max(6),
  hooks: z
    .array(
      z.object({
        family: z.enum(HOOK_FAMILIES),
        text: z.string(),
        on_screen: z.string(),
        first_scene: z.string(),
        follow_line: z.string(),
        strength: z.number().min(1).max(10),
        variants: z.array(z.object({ platform: z.enum(HOOK_PLATFORMS), text: z.string() })),
      }),
    )
    .min(8)
    .max(16),
  best: z.object({ text: z.string(), reason: z.string() }),
  avoid: z.array(z.string()),
});

export default outputSchema;
