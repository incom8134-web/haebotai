import { z } from "zod";

// monthly_volume and competition_score are numbers so the report can
// plot every keyword on a volume × competition map and pick out the
// low-competition, high-demand ones.
const keywordSchema = z.object({
  term: z.string(),
  volume_band: z.string(),
  monthly_volume: z.number(),
  competition: z.string(),
  competition_score: z.number(),
  intent: z.enum(["정보", "비교", "구매", "방문"]),
  best_use: z.string(),
  data_source: z.enum(["measured", "estimated"]),
});

const outputSchema = z.object({
  summary: z.string(),
  tiers: z.object({
    mega: z.array(keywordSchema),
    mid: z.array(keywordSchema),
    micro: z.array(keywordSchema),
  }),
  combinations: z.array(z.string()),
  content_gaps: z.array(z.object({ gap: z.string(), suggested_topic: z.string(), target_keyword: z.string(), priority: z.number().min(1).max(3) })),
  placement: z.array(z.object({ spot: z.string(), keywords: z.array(z.string()), example: z.string() })),
});

export default outputSchema;
