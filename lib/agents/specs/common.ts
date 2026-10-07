import "server-only";
import { critique, recentFingerprints, strategize, understand } from "../calls";
import { intentToBrief } from "../intent";
import { fingerprintOf, samenessNote, shapeNote, type Fingerprint } from "../diversity";
import { rejectedDefault } from "../strategy";
import type { AgentRunState, Critique, Stage, StageContext } from "../types";
import type { Direction } from "@/lib/tools/directions";
import { referenceOf } from "@/lib/tools/generate-prompt";
import { requestText } from "../calls";
import { analyzeStage as coreAnalyze, contractStage as coreContract, emptyWork, researchStage as coreResearch, type DocAgentCtx, type DocWork } from "../core/doc-agent";
import { analysisBlock } from "../core/analysis";
import { researchBlock } from "../core/research";
import { buildIndex, retrieve, passagesText } from "../core/retrieve";
import { fullText, outlineText } from "../core/source";
import { verifyStructured } from "../core/verify-structured";
import { geminiPort } from "./port";

// Stages every agent shares: understand the request, choose a strategy,
// and the critic. Agent-specific stages (draft, build, revise, render)
// live in the agent's own spec.

/** The directives every generation call gets on top of the form values. */
export function directives(state: AgentRunState, input: Record<string, unknown>): Record<string, unknown> {
  const direction = (state.work.direction as Direction | null | undefined) ?? null;
  const out: Record<string, unknown> = { ...input };
  if (state.intent) {
    out._brief = intentToBrief(state.intent, direction, state.strategy?.rationale ?? "");
    out._intent = { intent: state.intent, answers: state.answers };
  }
  if (state.strategy) out._strategy = state.strategy;
  const core = state.work.core as DocWork | undefined;
  if (core?.contract) out._contract = core.contract;
  if (typeof state.work.sourceView === "string") out._sourceView = state.work.sourceView;
  return out;
}

/** The agent core's context for a structured tool's run (contract, sources, research). */
function coreContext(ctx: StageContext): DocAgentCtx {
  const { state } = ctx;
  const values = Object.fromEntries(Object.entries(ctx.input).filter(([k]) => !k.startsWith("_")));
  return {
    toolId: ctx.manifest.id,
    toolName: ctx.manifest.name_ko,
    work: ((state.work.core as DocWork | undefined) ??= emptyWork()),
    sources: referenceOf(ctx.input)?.sources ?? [],
    port: geminiPort(ctx),
    requestText: requestText(ctx.manifest, values),
    referenceMode: referenceOf(ctx.input)?.mode.id ?? null,
    intentText: state.intent ? intentBlockFor(state) : "",
    strategyText: () => "",
    mustInclude: state.intent?.mustInclude ?? [],
    brandColors: state.profile?.brand_colors ?? [],
    year: new Date().getFullYear(),
    documentWorkflow: false,
    secondsLeft: ctx.secondsLeft,
    emit: (label, detail) => ctx.emit({ kind: "note", stage: state.stage, status: "done", label, detail }),
    addUsage: (u) => ctx.addUsage({ inputTokens: u.inputTokens ?? 0, outputTokens: u.outputTokens ?? 0 }),
  };
}

function intentBlockFor(state: AgentRunState): string {
  return state.intent ? `[이해한 요청] ${state.intent.summary}` : "";
}

/** Characters of source the one-call tools read whole; past this they get the map plus the relevant passages. */
const WHOLE_SOURCE = 70_000;

/**
 * Uploaded documents, read whole: the analysis (structure, facts,
 * requirements) and — for a long source — the view the writer gets
 * instead of the first 80,000 characters: outline + analysis + the
 * passages the request is about.
 */
export const sourceStage = (next: string): Stage => ({
  id: "analyze",
  label: { ko: "자료 분석", en: "Analyzing sources" },
  maxSeconds: 120,
  optional: { skipTo: next },
  async run(ctx) {
    const core = coreContext(ctx);
    if (!core.sources.length) return { next };
    await coreAnalyze(core);
    const total = core.sources.reduce((n, d) => n + fullText(d).length, 0);
    if (total > WHOLE_SOURCE) {
      const query = [ctx.state.intent?.summary, ctx.state.intent?.goal, ...(ctx.state.intent?.mustInclude ?? []), core.requestText.slice(0, 2000)].filter(Boolean).join(" ");
      const passages = passagesText(retrieve(buildIndex(core.sources), query, 45_000));
      ctx.state.work.sourceView = [
        "[자료 구조 — 전체]",
        ...core.sources.map((d) => outlineText(d)),
        core.work.analysis ? analysisBlock(core.work.analysis) : "",
        "[이 요청과 관련된 원문 부분]",
        passages,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    return { next };
  },
});

/** The task contract for a structured tool: what to keep, what not to do, length, research. */
export const contractStageFor = (next: string): Stage => ({
  id: "contract",
  label: { ko: "작업 계약", en: "Task contract" },
  maxSeconds: 45,
  optional: { skipTo: next },
  async run(ctx) {
    await coreContract(coreContext(ctx));
    return { next };
  },
});

/** Question-driven research when the contract asks for it; findings in the shape the writers read. */
export async function contractResearch(ctx: StageContext): Promise<boolean> {
  const core = coreContext(ctx);
  const c = core.work.contract;
  if (!c || c.research.need === "none" || !c.research.questions.length) return false;
  await coreResearch(core);
  const r = core.work.research;
  if (!r) return false;
  ctx.state.work.research = { findings: researchBlock(r, { max: 30 }), sources: r.sources };
  return true;
}

export const understandStage = (next: string): Stage => ({
  id: "understand",
  label: { ko: "요청 이해", en: "Understanding the request" },
  maxSeconds: 30,
  async run(ctx) {
    const { state } = ctx;
    if (!state.intent) {
      const r = await understand(ctx.manifest, ctx.input, state.profile, state.answers, ctx.signal);
      ctx.addUsage(r.usage);
      state.intent = r.intent;
    }
    // A request about another business: the saved profile stays out of every later step.
    if (state.intent && !state.intent.usesProfile) state.profile = null;
    if (state.intent) {
      ctx.emit({ kind: "intent", stage: "understand", status: "done", label: { ko: "이해한 요청", en: "Understood" }, detail: { ko: state.intent.summary, en: state.intent.summary } });
    }
    return { next };
  },
});

export const strategizeStage = (next: string, extra?: (ctx: StageContext) => string | undefined): Stage => ({
  id: "strategize",
  label: { ko: "전략 선택", en: "Choosing a strategy" },
  maxSeconds: 100,
  // Without a strategy the agent still works from the request (like before).
  optional: { skipTo: next },
  async run(ctx) {
    const { state } = ctx;
    const recent = await recentFingerprints(ctx.storage.supabase, state.userId, state.toolId).catch(() => [] as Fingerprint[]);
    state.work.recent = recent;
    const r = await strategize({
      manifest: ctx.manifest,
      input: ctx.input,
      intent: state.intent,
      answers: state.answers,
      recent,
      override: state.strategyOverride,
      signal: ctx.signal,
      extra: extra?.(ctx),
    });
    ctx.addUsage(r.usage);
    if (!r.strategy) throw new Error("전략을 정하지 못했습니다");
    state.strategy = r.strategy;
    state.work.direction = r.direction;
    ctx.emit({
      kind: "strategy",
      stage: "strategize",
      status: "done",
      label: { ko: `전략: ${r.strategy.chosen}`, en: `Strategy: ${r.strategy.chosen}` },
      detail: { ko: `${r.strategy.considered.length}가지 접근을 비교했어요`, en: `Compared ${r.strategy.considered.length} approaches` },
    });
    return { next };
  },
});

/**
 * Runs the critic on a draft; records the critique and the event. `focus`
 * is what the planner asked the critic to check hardest; `shape` the
 * draft's skeleton signature, compared with the member's recent results
 * (the template detector's memory).
 */
export async function runCritic(ctx: StageContext, draft: string, round: number, opts: { focus?: string[]; shape?: string[] } = {}): Promise<Critique | null> {
  const { state } = ctx;
  const fp = fingerprintOf(state.strategy, (state.work.direction as Direction | null | undefined)?.id);
  const recent = (state.work.recent as Fingerprint[] | undefined) ?? [];
  const sameness = [round === 0 ? samenessNote(fp, recent) : null, shapeNote(opts.shape, recent)].filter(Boolean).join("\n") || null;
  const r = await critique({
    manifest: ctx.manifest,
    input: ctx.input,
    profile: state.profile,
    research: (state.work.research as { findings?: string } | undefined)?.findings,
    intent: state.intent,
    answers: state.answers,
    strategy: state.strategy,
    draft,
    sameness,
    focus: opts.focus,
    avoidDefault: rejectedDefault(state.strategy),
    signal: ctx.signal,
  });
  ctx.addUsage(r.usage);
  if (!r.critique) return null;
  const c = r.critique;
  // Measured contract checks join the critic's reading as high-severity issues.
  const core = state.work.core as DocWork | undefined;
  if (core?.contract) {
    const ref = referenceOf(ctx.input);
    const research = state.work.research as { findings?: string } | undefined;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(draft);
    } catch {
      parsed = null;
    }
    const measured = verifyStructured({
      toolId: ctx.manifest.id,
      contract: core.contract,
      output: parsed,
      mustInclude: state.intent?.mustInclude ?? [],
      knownText: [ref?.text ?? "", research?.findings ?? ""].join("\n"),
      sourceSlideCount: ref?.slideCount,
    });
    for (const m of measured) c.issues.unshift({ severity: m.severity, type: "missing", where: m.where, problem: m.problem, fix: m.fix });
    if (measured.some((m) => m.severity === "high")) c.verdict = "revise";
  }
  const list = (state.work.critiques as Critique[] | undefined) ?? [];
  list.push(c);
  state.work.critiques = list;
  const high = c.issues.filter((i) => i.severity === "high").length;
  ctx.emit({
    kind: "critique",
    stage: "critique",
    status: "done",
    label: { ko: `검토 ${round + 1}차: ${c.score}점`, en: `Review ${round + 1}: ${c.score}/100` },
    detail: c.verdict === "pass"
      ? { ko: "기준을 충족했어요", en: "Meets the bar" }
      : { ko: `고칠 점 ${c.issues.length}개${high ? ` (중요 ${high}개)` : ""}`, en: `${c.issues.length} issues${high ? ` (${high} major)` : ""}` },
  });
  return c;
}
