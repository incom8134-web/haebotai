import "server-only";
import { geminiAdapter, searchGrounding } from "@/lib/ai/gemini";
import { buildContext } from "@/lib/tools/generate-prompt";
import { finishStructured } from "@/lib/tools/generate";
import type { Source } from "@/lib/tools/registry/shared";
import type { TokenUsage } from "@/lib/ai/types";
import { pickBest } from "../critic";
import { RESEARCH } from "../planner";
import { skeletonOf, skeletonSignature } from "../skeleton";
import { directives, runCritic } from "../specs/common";
import type { AgentRunState, Critique, StageContext } from "../types";
import type { Capability } from "./types";

// The writing capabilities for structured tools (plans, decks, copy,
// blogs, strategy, proposals, reports): research, draft, critique ⇄
// revise (bounded, best version kept) and polish (photos, rendering,
// computed numbers). The draft and every revision are one structured
// call against the tool's schema, told the strategy's blueprint and
// rubric; the critic is a separate call that never rewrites.

interface Version {
  output: unknown;
  score: number | null;
}

/** Revisions after the first draft. Long decks get one (each pass is long). */
function maxRevisions(state: AgentRunState, input: Record<string, unknown>): number {
  if (state.toolId === "presentation" && (parseInt(String(input.slide_count ?? ""), 10) || 0) >= 15) return 1;
  return 2;
}

/** Seconds a draft or revision may take. */
function writeSeconds(toolId: string): number {
  return toolId === "presentation" ? 180 : toolId === "business-plan" || toolId === "strategy" ? 150 : 120;
}

/** Seconds the polish step may take (photos and rendering). */
function polishSeconds(toolId: string): number {
  if (toolId === "presentation") return 150;
  if (toolId === "blog" || toolId === "copy" || toolId === "strategy") return 120;
  if (toolId === "sangsepage") return 110;
  return 20;
}

async function write(ctx: StageContext, extra: Record<string, unknown>): Promise<{ output: unknown; sources: Source[]; usage: TokenUsage }> {
  const research = ctx.state.work.research as { findings: string; sources: Source[] } | undefined;
  const input = { ...directives(ctx.state, ctx.input), ...(research ? { _research: research } : {}), _noEditor: true, ...extra };
  let result: { output: unknown; sources: Source[]; usage: TokenUsage } | undefined;
  for await (const event of geminiAdapter.generateStructured(ctx.manifest, input, ctx.state.profile, ctx.signal)) {
    if (event.type === "done") result = event.result;
  }
  if (!result) throw new Error("모델 응답을 받지 못했습니다");
  return result;
}

const versions = (state: AgentRunState) => ((state.work.versions as Version[] | undefined) ??= []);

export const researchTopic: Capability = {
  id: "research_topic",
  label: { ko: "자료 조사", en: "Researching" },
  maxSeconds: () => 60,
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    if (!ctx.manifest.grounding.webSearch) return flow.next;
    const context = buildContext(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile);
    const r = await searchGrounding(ctx.manifest, context, ctx.signal);
    ctx.addUsage(r.usage);
    addResearch(ctx, RESEARCH.research_topic.name, r.findings, r.sources);
    ctx.emit({ kind: "note", stage: flow.step.id, status: "done", label: { ko: `출처 ${r.sources.length}개 확인`, en: `${r.sources.length} sources` } });
    return flow.next;
  },
};

/** Merges a research step's findings into the run's research (every draft and revision reads it). */
function addResearch(ctx: StageContext, title: string, findings: string, sources: Source[]) {
  const prev = ctx.state.work.research as { findings: string; sources: Source[] } | undefined;
  const seen = new Set((prev?.sources ?? []).map((s) => s.url));
  ctx.state.work.research = {
    findings: [prev?.findings ?? "", findings ? `[${title}]\n${findings}` : ""].filter(Boolean).join("\n\n"),
    sources: [...(prev?.sources ?? []), ...sources.filter((s) => !seen.has(s.url))],
  };
}

/** A focused research step the planner can add (competition, the customers' own language). */
function focusedResearch(id: "analyze_competitors" | "research_audience", label: { ko: string; en: string }): Capability {
  return {
    id,
    label,
    maxSeconds: () => 60,
    skipTo: (flow) => flow.next,
    async run(ctx, flow) {
      if (!ctx.manifest.grounding.webSearch) return flow.next;
      const context = buildContext(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile);
      const r = await searchGrounding(ctx.manifest, context, ctx.signal, RESEARCH[id].focus);
      ctx.addUsage(r.usage);
      addResearch(ctx, RESEARCH[id].name, r.findings, r.sources);
      ctx.emit({ kind: "note", stage: flow.step.id, status: "done", label: { ko: `${RESEARCH[id].name}: 출처 ${r.sources.length}개`, en: `${label.en}: ${r.sources.length} sources` } });
      return flow.next;
    },
  };
}

export const analyzeCompetitors = focusedResearch("analyze_competitors", { ko: "경쟁·대안 분석", en: "Analyzing competitors" });
export const researchAudience = focusedResearch("research_audience", { ko: "고객 언어 조사", en: "Researching customers' language" });

export const writeDraft: Capability = {
  id: "write_draft",
  label: { ko: "초안 작성", en: "Drafting" },
  maxSeconds: writeSeconds,
  async run(ctx, flow) {
    const r = await write(ctx, {});
    ctx.addUsage(r.usage);
    ctx.state.sources = r.sources;
    versions(ctx.state).push({ output: r.output, score: null });
    return flow.next;
  },
};

export const critiqueOutput: Capability = {
  id: "critique_output",
  label: { ko: "검토", en: "Reviewing" },
  maxSeconds: () => 80,
  skipTo: (flow) => flow.after("revise_output"),
  async run(ctx, flow, step) {
    const list = versions(ctx.state);
    const latest = list[list.length - 1];
    const exit = flow.after("revise_output");
    const focus = Array.isArray(step.args?.focus) ? (step.args.focus as string[]) : undefined;
    const c = await runCritic(ctx, JSON.stringify(latest.output), list.length - 1, { focus, shape: skeletonSignature(skeletonOf(latest.output)) });
    if (!c) return exit;
    latest.score = c.score;
    const revisions = list.length - 1;
    const revise = flow.find("revise_output");
    // The planner's revision budget, never above the tool's own cap.
    const budget = Math.min(Number(step.args?.maxRevisions ?? 2), maxRevisions(ctx.state, ctx.input));
    return c.verdict === "pass" || !revise || revisions >= budget ? exit : revise;
  },
};

export const reviseOutput: Capability = {
  id: "revise_output",
  label: { ko: "개선", en: "Revising" },
  maxSeconds: writeSeconds,
  // A failed revision leaves the best earlier version.
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    const list = versions(ctx.state);
    const latest = list[list.length - 1];
    const critiques = (ctx.state.work.critiques as Critique[] | undefined) ?? [];
    const critique = critiques[critiques.length - 1];
    const r = await write(ctx, { _revision: { draft: JSON.stringify(latest.output), critique } });
    ctx.addUsage(r.usage);
    list.push({ output: r.output, score: null });
    ctx.emit({
      kind: "revision",
      stage: flow.step.id,
      status: "done",
      label: { ko: `${list.length - 1}차 개선본`, en: `Revision ${list.length - 1}` },
      detail: { ko: `검토 의견 ${critique?.issues.length ?? 0}개 반영`, en: `Addressed ${critique?.issues.length ?? 0} notes` },
    });
    return flow.find("critique_output") ?? flow.next;
  },
};

export const finishOutput: Capability = {
  id: "finish_output",
  label: { ko: "마무리", en: "Finishing" },
  maxSeconds: polishSeconds,
  async run(ctx, flow) {
    const list = versions(ctx.state);
    // An unscored last revision is trusted over the draft it fixed.
    const best = pickBest(list.map((v, i) => ({ value: v.output, score: v.score ?? (i === list.length - 1 && i > 0 ? Math.max(...list.map((x) => x.score ?? 0)) : null) })));
    const post = await finishStructured(
      ctx.manifest,
      best,
      directives(ctx.state, ctx.input),
      ctx.state.profile,
      ctx.signal,
      ctx.storage,
      ctx.state.provider,
      Math.max(0, (ctx.secondsLeft() - 10) * 1000),
    );
    ctx.addUsage(post.usage);
    ctx.state.work.final = post.output;
    // The finished run keeps only what it shows; drafts go.
    ctx.state.work.versions = list.map((v) => ({ output: null, score: v.score }));
    return flow.next;
  },
};
