import "server-only";
import { planWorkflow } from "../calls";
import { defaultPlan, flowFor } from "../plan";
import { buildPlan, plannable, planLabel, validatePlan } from "../planner";
import { contractStageFor, sourceStage, strategizeStage, understandStage } from "../specs/common";
import type { DocWork } from "../core/doc-agent";
import { strategyNote } from "./strategy-notes";
import type { Capability } from "./types";

// Capabilities every agentic plan starts with: understand the request and
// choose how to solve it.

export const understandRequest: Capability = {
  id: "understand_request",
  label: { ko: "요청 이해", en: "Understanding the request" },
  maxSeconds: () => 30,
  async run(ctx, flow) {
    return (await understandStage(flow.next).run(ctx)).next;
  },
};

/** The uploaded sources, read whole (lib/agents/core/source.ts); nothing to do without them. */
export const analyzeSource: Capability = {
  id: "analyze_source",
  label: { ko: "자료 분석", en: "Analyzing sources" },
  maxSeconds: () => 120,
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    return (await sourceStage(flow.next).run(ctx)).next;
  },
};

/** The task contract: what to keep, what not to do, length, research questions (lib/agents/core/contract.ts). */
export const taskContract: Capability = {
  id: "task_contract",
  label: { ko: "작업 계약", en: "Task contract" },
  maxSeconds: () => 45,
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    return (await contractStageFor(flow.next).run(ctx)).next;
  },
};

export const chooseStrategy: Capability = {
  id: "choose_strategy",
  label: { ko: "전략 선택", en: "Choosing a strategy" },
  maxSeconds: () => 100,
  // Without a strategy the agent still works from the request.
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    return (await strategizeStage(flow.next, strategyNote).run(ctx)).next;
  },
};

/**
 * The planner: reshapes the rest of this run's plan for the request (which
 * research, how many revision rounds, what the critic checks hardest).
 * Any failure keeps the default plan and moves on.
 */
export function planWorkflowCapability(known: () => Set<string>): Capability {
  return {
    id: "plan_workflow",
    label: { ko: "작업 계획", en: "Planning the work" },
    maxSeconds: () => 35,
    skipTo: (flow) => flow.next,
    async run(ctx, flow, step) {
      const { state } = ctx;
      if (!plannable(state.toolId, state.provider)) return flow.next;
      const r = await planWorkflow({ manifest: ctx.manifest, intent: state.intent, answers: state.answers, strategy: state.strategy, signal: ctx.signal });
      ctx.addUsage(r.usage);
      if (!r.choice) return flow.next;
      // The task contract's required research is never planned away.
      const contract = (state.work.core as DocWork | undefined)?.contract;
      if (contract?.research.need === "required" && ctx.manifest.grounding.webSearch && !r.choice.research.includes("research_topic")) {
        r.choice.research = ["research_topic", ...r.choice.research].slice(0, 3);
      }
      const plan = buildPlan(state.plan ?? defaultPlan(state.toolId, state.provider), r.choice);
      const errors = validatePlan(plan, known());
      const next = flowFor(plan, step.id);
      if (errors.length || !next) {
        console.warn(`planner: invalid plan for ${state.toolId}, keeping the default:`, errors.join("; "));
        return flow.next;
      }
      state.plan = plan;
      ctx.emit({
        kind: "note",
        stage: step.id,
        status: "done",
        label: { ko: `작업 계획: ${planLabel(plan)}`, en: `Plan: ${planLabel(plan, "en")}` },
        ...(plan.reason ? { detail: { ko: plan.reason, en: plan.reason } } : {}),
      });
      return next.next;
    },
  };
}
