import "server-only";
import { geminiAdapter, searchGrounding } from "@/lib/ai/gemini";
import { buildContext } from "@/lib/tools/generate-prompt";
import { finishStructured } from "@/lib/tools/generate";
import type { Source } from "@/lib/tools/registry/shared";
import type { TokenUsage } from "@/lib/ai/types";
import { pickBest } from "../critic";
import { guideFor } from "../library";
import { contractResearch, contractStageFor, directives, runCritic, sourceStage, strategizeStage, understandStage } from "./common";
import type { AgentRunState, AgentSpec, Critique, Stage, StageContext } from "../types";

// The writing agent for every structured tool (plans, decks, copy, blogs,
// strategy, proposals, reports): understand → strategy → research →
// draft → critique ⇄ revise (bounded, best version kept) → polish
// (photos, rendering, computed numbers) → done. The draft and every
// revision are one structured call against the tool's schema, told the
// strategy's blueprint and rubric; the critic is a separate call that
// never rewrites.

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

export function genericSpec(toolId: string): AgentSpec {
  const stages: Record<string, Stage> = {
    understand: understandStage("analyze"),
    // Shared core layers (lib/agents/core): the whole uploaded source, then the task contract.
    analyze: sourceStage("contract"),
    contract: contractStageFor("strategize"),
    strategize: strategizeStage("research", (ctx) =>
      ctx.manifest.id === "presentation"
        ? `[덱 조건] 슬라이드 수: ${String(ctx.input.slide_count ?? "도구 기본")}. 설계도의 각 부분은 슬라이드 한 장(또는 몇 장)이며, 장마다 주장 하나와 그 근거의 형식(사진, 차트, 표, 큰 숫자, 비교, 절차)을 notes에 적으세요.`
        : ctx.manifest.id === "business-plan"
          ? "[계획서 조건] 설계도의 각 부분은 계획서의 장(chapter)입니다. 이 심사자에게 필요 없는 분석(시장 규모 원, SWOT, 포지셔닝 맵 등)은 omit에 적으세요. 재무는 항상 포함하되 숫자는 서버가 가정으로 계산합니다."
          : undefined,
    ),
    research: {
      id: "research",
      label: { ko: "자료 조사", en: "Researching" },
      maxSeconds: 110,
      optional: { skipTo: "draft" },
      async run(ctx) {
        // The contract's research questions first; the tool's own search otherwise.
        if (await contractResearch(ctx)) return { next: "draft" };
        if (!ctx.manifest.grounding.webSearch) return { next: "draft" };
        const context = buildContext(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile);
        const r = await searchGrounding(ctx.manifest, context, ctx.signal);
        ctx.addUsage(r.usage);
        ctx.state.work.research = { findings: r.findings, sources: r.sources };
        ctx.emit({ kind: "note", stage: "research", status: "done", label: { ko: `출처 ${r.sources.length}개 확인`, en: `${r.sources.length} sources` } });
        return { next: "draft" };
      },
    },
    draft: {
      id: "draft",
      label: { ko: "초안 작성", en: "Drafting" },
      maxSeconds: writeSeconds(toolId),
      async run(ctx) {
        const r = await write(ctx, {});
        ctx.addUsage(r.usage);
        ctx.state.sources = r.sources;
        versions(ctx.state).push({ output: r.output, score: null });
        return { next: "critique" };
      },
    },
    critique: {
      id: "critique",
      label: { ko: "검토", en: "Reviewing" },
      maxSeconds: 80,
      optional: { skipTo: "polish" },
      async run(ctx) {
        const list = versions(ctx.state);
        const latest = list[list.length - 1];
        const c = await runCritic(ctx, JSON.stringify(latest.output), list.length - 1);
        if (!c) return { next: "polish" };
        latest.score = c.score;
        const revisions = list.length - 1;
        return { next: c.verdict === "pass" || revisions >= maxRevisions(ctx.state, ctx.input) ? "polish" : "revise" };
      },
    },
    revise: {
      id: "revise",
      label: { ko: "개선", en: "Revising" },
      maxSeconds: writeSeconds(toolId),
      // A failed revision leaves the best earlier version.
      optional: { skipTo: "polish" },
      async run(ctx) {
        const list = versions(ctx.state);
        const latest = list[list.length - 1];
        const critiques = (ctx.state.work.critiques as Critique[] | undefined) ?? [];
        const critique = critiques[critiques.length - 1];
        const r = await write(ctx, { _revision: { draft: JSON.stringify(latest.output), critique } });
        ctx.addUsage(r.usage);
        list.push({ output: r.output, score: null });
        ctx.emit({
          kind: "revision",
          stage: "revise",
          status: "done",
          label: { ko: `${list.length - 1}차 개선본`, en: `Revision ${list.length - 1}` },
          detail: { ko: `검토 의견 ${critique?.issues.length ?? 0}개 반영`, en: `Addressed ${critique?.issues.length ?? 0} notes` },
        });
        return { next: "critique" };
      },
    },
    polish: {
      id: "polish",
      label: { ko: "마무리", en: "Finishing" },
      maxSeconds: polishSeconds(toolId),
      async run(ctx) {
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
        return { next: "finalize" };
      },
    },
  };
  return {
    id: toolId,
    objective: guideFor(toolId).objective,
    firstStage: "understand",
    stages,
    finalize: (state) => ({ output: withBrief(state, state.work.final), sources: state.sources }),
  };
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
