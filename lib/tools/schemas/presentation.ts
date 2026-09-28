import { z } from "zod";

const outputSchema = z.object({
  title: z.string(),
  storyline: z.string(),
  slides: z.array(
    z.object({
      headline: z.string(),
      points: z.array(z.string()),
      visual: z.string(),
      speaker_notes: z.string(),
    }),
  ),
  closing_ask: z.string(),
});

export default outputSchema;
