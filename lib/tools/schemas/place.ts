import { z } from "zod";

const outputSchema = z.object({
  business_name_suggestions: z.array(z.string()).length(3),
  description_optimized: z.string(),
  primary_keywords: z.array(z.string()),
  menu_recommendations: z.array(z.string()),
  photo_checklist: z.array(z.object({ shot: z.string(), why: z.string(), priority: z.number() })),
  review_response_templates: z.array(z.string()),
  weekly_ops_checklist: z.array(z.string()),
});

export default outputSchema;
