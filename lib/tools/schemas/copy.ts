import { z } from "zod";

const outputSchema = z.object({
  core_message: z.string(),
  angles: z.array(
    z.object({
      motivation: z.string(),
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
      // The B side of an A/B test: a different headline and body for the same angle.
      variant_b: z.object({ headline: z.string(), body: z.string(), test_note: z.string() }),
    }),
  ),
  channel_versions: z.array(z.object({ channel: z.string(), copy: z.string(), note: z.string() })),
  words_to_avoid: z.array(z.string()),
});

export default outputSchema;
