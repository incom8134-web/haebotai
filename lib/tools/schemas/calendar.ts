import { z } from "zod";

const outputSchema = z.object({
  weeks: z
    .array(
      z.object({
        week_no: z.number(),
        milestone: z.string(),
        tasks: z.array(
          z.object({
            day: z.number(),
            title: z.string(),
            est_minutes: z.number(),
            done_criteria: z.string(),
            depends_on: z.string().optional(),
          }),
        ),
      }),
    )
    .length(13),
});

export default outputSchema;
