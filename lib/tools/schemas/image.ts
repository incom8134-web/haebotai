import { z } from "zod";

const outputSchema = z.object({
  // name/purpose come from the shot planner (a photo director's plan per
  // cut); older runs don't have them.
  images: z
    .array(z.object({ name: z.string().optional(), purpose: z.string().optional(), asset_id: z.string(), url: z.string(), seed: z.string() }))
    .length(4),
  refined_prompt: z.string(),
  negative_prompt: z.string(),
});

export default outputSchema;
