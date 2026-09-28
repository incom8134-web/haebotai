import { z } from "zod";

const keywordSchema = z.object({
  term: z.string(),
  volume_band: z.string(),
  competition: z.string(),
  best_use: z.string(),
  data_source: z.enum(["measured", "estimated"]),
});

const outputSchema = z.object({
  tiers: z.object({
    mega: z.array(keywordSchema),
    mid: z.array(keywordSchema),
    micro: z.array(keywordSchema),
  }),
  combinations: z.array(z.string()),
  content_gaps: z.array(z.object({ gap: z.string(), suggested_topic: z.string() })),
});

export default outputSchema;
