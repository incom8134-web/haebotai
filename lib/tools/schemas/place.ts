import { z } from "zod";

// audit scores each part of the 플레이스 listing (0–100) for the score
// gauge and the area bars; the rest are ready-to-paste fixes.
const outputSchema = z.object({
  audit: z.array(z.object({ area: z.string(), score: z.number(), current: z.string(), fix: z.string() })),
  business_name_suggestions: z.array(z.string()).length(3),
  description_optimized: z.string(),
  primary_keywords: z.array(z.string()),
  menu_recommendations: z.array(z.string()),
  competitor_benchmark: z.array(z.object({ name: z.string(), what_works: z.string(), our_move: z.string() })),
  photo_checklist: z.array(z.object({ shot: z.string(), why: z.string(), priority: z.number() })),
  review_response_templates: z.array(z.object({ situation: z.string(), template: z.string() })),
  weekly_ops_checklist: z.array(z.object({ day: z.string(), task: z.string(), minutes: z.number() })),
});

export default outputSchema;
