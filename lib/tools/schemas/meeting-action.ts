import { z } from "zod";

// 회의→실행 보드: meeting notes turned into what was decided, who does what
// by when, and what is still open. Owners and dates come only from the
// notes — anything not stated stays "[미정]" rather than being invented.

const outputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  decisions: z.array(z.object({ decision: z.string(), rationale: z.string(), owner: z.string() })).max(12),
  actions: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string(),
        due: z.string(),
        due_note: z.string(),
        priority: z.enum(["high", "medium", "low"]),
        done_when: z.string(),
        from_note: z.string(),
      }),
    )
    .max(16),
  open_questions: z.array(z.object({ question: z.string(), who_answers: z.string() })).max(10),
  risks: z.array(z.string()),
  next_agenda: z.array(z.string()),
  follow_up_message: z.string(),
});

export default outputSchema;
