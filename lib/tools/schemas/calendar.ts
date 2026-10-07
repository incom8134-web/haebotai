import { z } from "zod";

// Task categories are fixed so the report can stack weekly hours by
// kind of work; phases draw the roadmap bars; north_star + checkpoints
// draw the target line the 13 weeks are aiming at.
const TASK_CATEGORIES = ["기획·준비", "콘텐츠·홍보", "영업·판매", "제작·운영", "학습", "점검·회고"] as const;

const outputSchema = z.object({
  goal: z.string(),
  north_star: z.object({ metric: z.string(), unit: z.string(), baseline: z.number(), target: z.number() }),
  phases: z.array(z.object({ name: z.string(), week_from: z.number(), week_to: z.number(), focus: z.string() })),
  checkpoints: z.array(z.object({ week: z.number(), target: z.number(), review: z.string() })),
  weeks: z
    .array(
      z.object({
        week_no: z.number(),
        milestone: z.string(),
        tasks: z.array(
          z.object({
            day: z.number(),
            title: z.string(),
            category: z.enum(TASK_CATEGORIES),
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
