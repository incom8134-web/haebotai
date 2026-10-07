import { z } from "zod";

// 업무 매뉴얼 빌더: a repeated job written as a procedure anyone can follow —
// roles, ordered steps (tasks, decisions with what to do on "no", checks),
// the quality standard per step, exceptions with who to escalate to, and
// how to tell the procedure is working. Only three lists carry size
// bounds: Gemini rejected the schema with all five bounded (its limit is
// on the schema's overall complexity — see scripts/check-gemini-schemas.mts).

const SOP_STEP_TYPES = ["task", "decision", "check", "handoff"] as const;

const outputSchema = z.object({
  summary: z.string(),
  purpose: z.string(),
  scope: z.object({ starts_when: z.string(), ends_when: z.string(), not_covered: z.array(z.string()) }),
  roles: z.array(z.object({ role: z.string(), responsibility: z.string() })).min(1).max(6),
  steps: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        role: z.string(),
        type: z.enum(SOP_STEP_TYPES),
        action: z.string(),
        tools: z.string(),
        output: z.string(),
        minutes: z.number(),
        if_no: z.string(),
      }),
    )
    .min(4)
    .max(16),
  quality_checks: z.array(z.object({ step_id: z.string(), check: z.string(), standard: z.string() })).min(3).max(12),
  exceptions: z.array(z.object({ situation: z.string(), response: z.string(), escalate_to: z.string() })),
  kpis: z.array(z.object({ metric: z.string(), target: z.string(), how: z.string() })),
  training_tips: z.array(z.string()),
});

export default outputSchema;
