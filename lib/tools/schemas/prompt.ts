import { z } from "zod";

const outputSchema = z.object({
  system_prompt: z.string(),
  user_template: z.string(),
  variables: z.array(z.object({ name: z.string(), description: z.string(), example: z.string() })),
  sample_runs: z.array(z.object({ input: z.string(), expected_output: z.string() })).length(3),
  failure_modes: z.array(z.object({ mode: z.string(), mitigation: z.string() })),
});

export default outputSchema;
