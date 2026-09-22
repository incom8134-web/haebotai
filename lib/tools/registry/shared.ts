import { z } from "zod";

// Reused by every tool with `grounding.requireSources: true`
// (HAEBOT_A_TOOLS_SPEC.md §3.4, the 출처 panel).
export const sourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  domain: z.string().optional(),
});

export type Source = z.infer<typeof sourceSchema>;
