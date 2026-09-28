import { z } from "zod";

const imageRef = z.object({ url: z.string(), asset_id: z.string() });

const outputSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string(),
        concept_rationale: z.string(),
        symbol: z.string(),
        color_spec: z.object({ hex: z.array(z.string()) }),
        type_spec: z.object({ family: z.string(), weight: z.string(), tracking: z.string() }),
        usage_notes: z.string(),
        image: imageRef,
        symbol_image: imageRef,
      }),
    )
    .length(4),
  mockups: z.array(z.string()),
});

export default outputSchema;
