import { z } from "zod";
import { sourceSchema } from "../registry/shared";

const outputSchema = z.object({
  titles: z.array(z.string()).length(5),
  meta_description: z.string(),
  body_markdown: z.string(),
  h2_outline: z.array(z.string()),
  image_slots: z.array(z.object({ after_section: z.string(), purpose: z.string(), prompt: z.string() })),
  hashtags: z.array(z.string()),
  char_count: z.number(),
  sources: z.array(sourceSchema),
});

export default outputSchema;
