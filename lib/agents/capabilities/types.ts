import type { Flow, PlanStep } from "../plan.ts";
import type { Bi, StageContext } from "../types.ts";

// A capability (docs/ai-architecture-v2.md §4.3): one typed unit of work a
// plan can use. It reads and writes the run's working data (state.work),
// and returns the id of the step to run next, relative to its plan.

export interface Capability {
  id: string;
  label: Bi;
  /** Roughly how long it may take for this tool; the runner hands off first if it can't fit. */
  maxSeconds(toolId: string): number;
  /** Optional capabilities are skipped (not failed) on error; the run continues at the returned step. */
  skipTo?(flow: Flow): string;
  run(ctx: StageContext, flow: Flow, step: PlanStep): Promise<string>;
}
