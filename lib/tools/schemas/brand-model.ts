import { z } from "zod";

const outputSchema = z.object({
  shots: z.array(z.object({ asset_id: z.string(), url: z.string() })).length(4),
  model_seed: z.string(),
  disclosure: z.literal("AI 생성 이미지"),
});

export default outputSchema;
