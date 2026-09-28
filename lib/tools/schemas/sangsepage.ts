import { z } from "zod";

const outputSchema = z.object({
  pain_points: z.array(z.string()),
  usps: z.array(z.string()).length(3),
  sections: z
    .array(
      z.object({
        order: z.number(),
        type: z.string(),
        headline: z.string(),
        body: z.string(),
        image_instruction: z.string(),
      }),
    )
    .min(8)
    .max(10),
  rendered_images: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).length(5),
  shipping_template: z.string(),
});

export default outputSchema;
