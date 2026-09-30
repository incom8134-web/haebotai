import { fingerprintOf } from "./diversity.ts";
import type { AgentRunState, Critique } from "./types.ts";

// What a finished run shows about how it was made (output.agent): the
// understood request, the strategy with the alternatives it beat, the
// assumptions made instead of asking, the review rounds, and the steps.
// Also the fingerprint the next runs read for diversity.

export function runMeta(state: AgentRunState) {
  const critiques = (state.work.critiques as Critique[] | undefined) ?? [];
  const direction = state.work.direction as { id: string; name: string } | null | undefined;
  return {
    summary: state.intent?.summary ?? "",
    strategy: state.strategy
      ? {
          chosen: state.strategy.chosen,
          rationale: state.strategy.rationale,
          considered: state.strategy.considered,
          blueprint: state.strategy.blueprint.map((b) => b.part),
          direction: direction?.name ?? "",
        }
      : null,
    assumptions: (state.intent?.unknowns ?? []).filter((u) => u.assumption && !(u.critical && state.answers.length)).map((u) => `${u.item}: ${u.assumption}`),
    answers: state.answers,
    review: critiques.length ? { rounds: critiques.length, scores: critiques.map((c) => c.score), fixed: critiques.slice(0, -1).reduce((n, c) => n + c.issues.length, 0) } : null,
    steps: state.events.filter((e) => e.kind === "stage" && e.status === "done").map((e) => e.label),
    fingerprint: fingerprintOf(state.strategy, direction?.id),
  };
}
