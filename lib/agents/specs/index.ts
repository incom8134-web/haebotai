import "server-only";
import type { ProviderId } from "@/lib/ai/types";
import type { ToolManifest } from "@/lib/tools/types";
import { CAPABILITIES } from "../capabilities";
import { agenticFor, defaultPlan, flowFor, type Plan } from "../plan";
import { guideFor } from "../library";
import type { AgentRunState, AgentSpec, Stage } from "../types";

// Which workflow runs: the run's own plan when one was made for it
// (lib/agents/plan.ts), else the tool's default plan — the v1 workflow,
// step for step. Every tool on Gemini (the platform engine and members'
// own Gemini keys) gets its agent; other engines keep the one-shot
// pipeline as a single step until their adapters expose the same calls.

export function planFor(manifest: ToolManifest, provider: ProviderId, state?: Pick<AgentRunState, "plan"> | null): Plan {
  return state?.plan ?? defaultPlan(manifest.id, provider);
}

/** The runner's view of a plan: one stage per step, each running its capability. */
export function specFromPlan(toolId: string, plan: Plan): AgentSpec {
  const stages: Record<string, Stage> = {};
  for (const step of plan.steps) {
    const cap = CAPABILITIES[step.capability];
    if (!cap) continue; // validated plans never get here; the runner fails the run on a missing stage
    const flow = flowFor(plan, step.id)!;
    stages[step.id] = {
      id: step.id,
      label: cap.label,
      maxSeconds: cap.maxSeconds(toolId),
      ...(cap.skipTo ? { optional: { skipTo: cap.skipTo(flow) } } : {}),
      run: async (ctx) => ({ next: await cap.run(ctx, flow, step) }),
    };
  }
  return {
    id: toolId,
    objective: plan.finalize === "brief" ? guideFor(toolId).objective : "",
    firstStage: plan.steps[0]?.id ?? "finalize",
    stages,
    finalize: (state) => ({ output: plan.finalize === "brief" ? withBrief(state, state.work.final) : state.work.final, sources: state.sources }),
  };
}

export function agentFor(manifest: ToolManifest, provider: ProviderId, state?: Pick<AgentRunState, "plan"> | null): AgentSpec {
  return specFromPlan(manifest.id, planFor(manifest, provider, state));
}

/** Whether a run on this tool/engine goes through the agent layers (intent questions, strategy, critic). */
export function isAgentic(manifest: ToolManifest, provider: ProviderId): boolean {
  return agenticFor(manifest.id, provider);
}

/** Adds what the result page and exports read: who it was for, the tone and the chosen direction. */
export function withBrief(state: AgentRunState, output: unknown): unknown {
  if (!output || typeof output !== "object" || Array.isArray(output)) return output;
  const direction = state.work.direction as { id: string; name: string } | null | undefined;
  return {
    ...(output as Record<string, unknown>),
    ...(state.intent ? { request_brief: { subject: state.intent.subject, uses_profile: state.intent.usesProfile, tone: state.intent.tone.words } } : {}),
    ...(direction ? { creative_direction: { id: direction.id, name: direction.name, reason: state.strategy?.rationale ?? "" } } : {}),
  };
}
