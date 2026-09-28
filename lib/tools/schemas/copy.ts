import { z } from "zod";

const outputSchema = z.object({
  core_message: z.string(),
  angles: z.array(
    z.object({
      motivation: z.string(),
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
    }),
  ),
  channel_versions: z.array(z.object({ channel: z.string(), copy: z.string(), note: z.string() })),
  words_to_avoid: z.array(z.string()),
});

export default outputSchema;
