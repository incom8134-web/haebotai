// Plans (docs/ai-architecture-v2.md §4.3). A run's workflow is data: an
// ordered list of steps, each naming a capability (lib/agents/capabilities)
// — a typed unit of work like "research the topic", "write a draft",
// "critique", "draw the logo". The orchestrator (runner.ts) executes the
// plan step by step; a capability decides where to go next relative to
// the plan (the following step, or back to a named capability for a
// critique ⇄ revise loop), so the same capability works in any plan.
//
// Every tool has a default plan that reproduces its v1 workflow exactly
// (same step ids, so runs in flight across a deploy carry on). The planner
// (phase 2) may replace it per request within the tool's allowed
// capabilities and budget; an invalid plan falls back to the default.
//
// Pure (tested): no model calls, no server imports.

export interface PlanStep {
  /** Unique within the plan; the run state's `stage` points at it. */
  id: string;
  capability: string;
  /** Capability-specific settings chosen by the planner (e.g. a critic lens). */
  args?: Record<string, unknown>;
}

export interface Plan {
  v: 1;
  /** "default": the tool's standard workflow; "planner": chosen for this request. */
  source: "default" | "planner";
  steps: PlanStep[];
  /** How the final output is stored: with the request brief and direction, or as produced. */
  finalize: "brief" | "raw";
  /** The planner's one-line reason, shown to the member. */
  reason?: string;
}

export const FINALIZE = "finalize";

/** Where a step sits in its plan: what comes next, and where named capabilities are. */
export interface Flow {
  step: PlanStep;
  /** The following step's id, or "finalize". */
  next: string;
  /** The first step (anywhere in the plan) using this capability, or null. */
  find(capability: string): string | null;
  /** The step after the last step using this capability (the exit of a loop); `next` when absent. */
  after(capability: string): string;
}

export function flowFor(plan: Plan, stepId: string): Flow | null {
  const index = plan.steps.findIndex((s) => s.id === stepId);
  if (index < 0) return null;
  const idAt = (i: number) => (i < plan.steps.length ? plan.steps[i].id : FINALIZE);
  const next = idAt(index + 1);
  return {
    step: plan.steps[index],
    next,
    find: (capability) => plan.steps.find((s) => s.capability === capability)?.id ?? null,
    after: (capability) => {
      let last = -1;
      plan.steps.forEach((s, i) => {
        if (s.capability === capability) last = i;
      });
      return last < 0 ? next : idAt(last + 1);
    },
  };
}

const step = (id: string, capability: string, args?: Record<string, unknown>): PlanStep => (args ? { id, capability, args } : { id, capability });

/** Tools whose one-shot pipeline stays a single step (nothing to plan). */
export const ONE_SHOT_TOOLS = new Set(["grant"]);

/** Whether a run on this tool and engine goes through the agent layers (intent, strategy, critic). */
export function agenticFor(toolId: string, provider: string): boolean {
  return provider === "google" && !ONE_SHOT_TOOLS.has(toolId);
}

/**
 * The tool's standard workflow — the v1 agent specs, step ids included,
 * plus the planning step for the writing tools. Members' own Claude keys and the grant lookup keep the
 * one-shot pipeline as one step.
 */
export function defaultPlan(toolId: string, provider: string): Plan {
  if (!agenticFor(toolId, provider)) return { v: 1, source: "default", finalize: "raw", steps: [step("generate", "one_shot")] };
  const head = [step("understand", "understand_request"), step("strategize", "choose_strategy")];
  if (toolId === "homepage") {
    return {
      v: 1,
      source: "default",
      finalize: "brief",
      steps: [...head, step("plan", "site_art_direction"), step("build", "build_site"), step("critique", "critique_site"), step("revise", "revise_site"), step("assemble", "assemble_site")],
    };
  }
  if (toolId === "logo") {
    return {
      v: 1,
      source: "default",
      finalize: "brief",
      steps: [...head, step("concepts", "plan_logo"), step("critique", "critique_logo_plans"), step("draw", "draw_logo")],
    };
  }
  if (toolId === "image" || toolId === "brand-model") {
    return { v: 1, source: "default", finalize: "brief", steps: [...head, step("render", "render_photos")] };
  }
  return {
    v: 1,
    source: "default",
    finalize: "brief",
    // "planning" (v2 phase 2) may reshape the steps after it for this request.
    steps: [...head, step("planning", "plan_workflow"), step("research", "research_topic"), step("draft", "write_draft"), step("critique", "critique_output"), step("revise", "revise_output"), step("polish", "finish_output")],
  };
}

/** The capabilities a plan uses, in order, without repeats (for the strategy card and telemetry). */
export function planCapabilities(plan: Plan): string[] {
  return [...new Set(plan.steps.map((s) => s.capability))];
}
