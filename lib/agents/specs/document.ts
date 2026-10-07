import "server-only";
import { zodToJsonSchema } from "@/lib/ai/schema";
import { finishStructured } from "@/lib/tools/generate";
import { referenceOf, toolLabel } from "@/lib/tools/generate-prompt";
import { getOutputSchema } from "@/lib/tools/schemas";
import { buildExportDoc } from "@/lib/tools/export/document";
import type { Source } from "@/lib/tools/registry/shared";
import type { z } from "zod";
import { requestText, smartCall } from "../calls";
import { ThinkingLevel } from "@google/genai";
import { PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import { intentBlock } from "../intent";
import { strategyBlock } from "../strategy";
import { strategizeStage, understandStage } from "./common";
import { geminiPort } from "./port";
import {
  analyzeStage,
  assembleStage,
  contractStage,
  designStage,
  emptyWork,
  illustrateStage,
  nextStage,
  outlineStage,
  renderCheckStage,
  researchStage,
  reviewStage,
  reviseStage,
  workReport,
  writeStage,
  type DocAgentCtx,
  type DocWork,
} from "../core/doc-agent";
import { analysisBlock } from "../core/analysis";
import { contractBlock } from "../core/contract";
import { documentReport, type LongDocument } from "../core/document";
import type { SourceDoc } from "../core/source";
import type { AgentRunState, AgentSpec, Stage, StageContext } from "../types";

// The document agent in the run loop (lib/agents/core/doc-agent.ts has
// the logic): proposals and business plans. Each stage here adapts the
// runner's context to the core's, and the Gemini port gives the core its
// model calls, per-question web search, illustrations and a real PDF
// render for the page count. The workflow itself is chosen in the
// contract stage from what the member asked for.

const EYEBROW: Record<string, string> = { proposal: "제안서", "business-plan": "사업계획서" };

const work = (state: AgentRunState): DocWork => ((state.work.doc as DocWork | undefined) ??= emptyWork());

function sourcesOf(input: Record<string, unknown>): SourceDoc[] {
  return referenceOf(input)?.sources ?? [];
}

/** The tool's output: the document, plus the fields older views and chaining read. */
function documentOutput(toolId: string, doc: LongDocument, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const firstText = doc.sections.flatMap((s) => s.blocks).find((b) => b.type === "paragraph") as { text: string } | undefined;
  const summary = firstText?.text.split(/(?<=[.다요])\s/).slice(0, 3).join(" ") ?? "";
  if (toolId === "business-plan") {
    return {
      title: doc.title,
      one_liner: doc.subtitle || summary.slice(0, 160),
      plan_type: doc.docType,
      chapters: doc.sections
        .filter((s) => s.level <= 1)
        .map((s) => ({
          title: s.title,
          purpose: s.purpose ?? "",
          body: s.blocks.filter((b) => b.type === "paragraph").map((b) => (b as { text: string }).text).join("\n\n"),
          points: s.blocks.flatMap((b) => (b.type === "bullets" ? b.items : [])).slice(0, 12),
        })),
      ...extra,
      document: doc,
    };
  }
  return { cover: doc.title, executive_summary: summary, ...extra, document: doc };
}

function coreCtx(ctx: StageContext): DocAgentCtx {
  const { state } = ctx;
  const values = Object.fromEntries(Object.entries(ctx.input).filter(([k]) => !k.startsWith("_")));
  return {
    toolId: ctx.manifest.id,
    toolName: toolLabel(ctx.manifest),
    work: work(state),
    sources: sourcesOf(ctx.input),
    port: geminiPort(ctx, (doc, eyebrow) => buildExportDoc({ toolName: eyebrow, toolId: ctx.manifest.id, output: documentOutput(ctx.manifest.id, doc), sources: [] })),
    requestText: requestText(ctx.manifest, values),
    referenceMode: referenceOf(ctx.input)?.mode.id ?? null,
    intentText: state.intent ? intentBlock(state.intent, state.answers) : "",
    strategyText: () => (state.strategy ? strategyBlock(state.strategy) : ""),
    mustInclude: state.intent?.mustInclude ?? [],
    brandColors: state.profile?.brand_colors ?? [],
    year: new Date().getFullYear(),
    secondsLeft: ctx.secondsLeft,
    emit: (label, detail) => ctx.emit({ kind: "note", stage: state.stage, status: "done", label, detail }),
    addUsage: (u) => ctx.addUsage({ inputTokens: u.inputTokens ?? 0, outputTokens: u.outputTokens ?? 0 }),
  };
}

const FIRST = ["analyze", "contract"];

function stage(id: string, label: { ko: string; en: string }, maxSeconds: number, run: (ctx: StageContext, core: DocAgentCtx) => Promise<string>): Stage {
  return { id, label, maxSeconds, run: async (ctx) => ({ next: await run(ctx, coreCtx(ctx)) }) };
}

/** Business plans: the analysis blocks (financial assumptions, market, funding, roadmap, risks) for the written plan. */
async function planData(ctx: StageContext, core: DocAgentCtx): Promise<void> {
  const full = getOutputSchema("business-plan") as unknown as z.ZodObject<Record<string, z.ZodType>>;
  const subset = full.pick({ financial_assumptions: true, market_analysis: true, competitor_matrix: true, swot: true, revenue_streams: true, funding: true, milestones: true, risks: true } as never);
  const doc = core.work.doc!;
  const r = await smartCall({
    model: PRO_TEXT_MODEL,
    system: [
      "당신은 사업계획서의 숫자와 분석 블록을 만드는 재무·전략 분석가입니다. 이미 쓴 계획서 본문과 일치하는 분석만 만듭니다.",
      "재무는 가정(financial_assumptions)만 쓰세요 — 손익은 서버가 계산합니다. 사용자 자료·입력에 있는 숫자가 우선이고, 없으면 근거를 notes에 적은 보수적 가정을 쓰세요.",
      "이 계획서의 독자에게 필요 없는 블록은 비워 두세요. 사실을 지어내지 마세요.",
    ].join("\n"),
    prompt: [contractBlock(core.work.contract!), core.work.analysis ? analysisBlock(core.work.analysis, { maxFacts: 50 }) : "", core.requestText, "[계획서 본문]", JSON.stringify(doc.sections.map((s) => ({ title: s.title, blocks: s.blocks }))).slice(0, 120_000)].filter(Boolean).join("\n\n"),
    schema: zodToJsonSchema(subset),
    signal: ctx.signal,
    thinking: ThinkingLevel.LOW,
    timeoutMs: 100_000,
    maxOutputTokens: 16_000,
  });
  ctx.addUsage(r.usage);
  const data = (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, unknown>;
  const computed = await finishStructured(ctx.manifest, { ...documentOutput("business-plan", doc), ...data }, ctx.input, ctx.state.profile, ctx.signal, ctx.storage, ctx.state.provider, 0);
  ctx.addUsage(computed.usage);
  const out = computed.output as Record<string, unknown>;
  ctx.state.work.planData = Object.fromEntries(Object.entries(out).filter(([k]) => !["title", "one_liner", "plan_type", "chapters", "document", "cover", "executive_summary"].includes(k)));
}

export function documentSpec(toolId: string): AgentSpec {
  const eyebrow = EYEBROW[toolId] ?? "문서";
  const after = (w: DocWork, id: string) => nextStage(w, id, FIRST);
  const stages: Record<string, Stage> = {
    understand: understandStage("analyze"),
    analyze: stage("analyze", { ko: "자료 분석", en: "Analyzing sources" }, 120, async (ctx, core) => {
      await analyzeStage(core).catch((err) => console.warn("doc analyze skipped:", (err as Error).message));
      return "contract";
    }),
    contract: stage("contract", { ko: "작업 계약", en: "Task contract" }, 45, async (_ctx, core) => {
      await contractStage(core);
      const stages = core.work.workflow.stages;
      return stages[stages.indexOf("contract") + 1] ?? "finalize";
    }),
    research: stage("research", { ko: "자료 조사", en: "Researching" }, 110, async (_ctx, core) => {
      await researchStage(core).catch((err) => console.warn("doc research skipped:", (err as Error).message));
      return after(core.work, "research");
    }),
    strategize: {
      ...strategizeStage("outline"),
      optional: { skipTo: "outline" },
      run: async (ctx) => {
        await strategizeStage("outline").run(ctx);
        return { next: after(work(ctx.state), "strategize") };
      },
    },
    outline: stage("outline", { ko: "문서 설계", en: "Planning the document" }, 130, async (_ctx, core) => {
      await outlineStage(core);
      return after(core.work, "outline");
    }),
    write: stage("write", { ko: "섹션 작성", en: "Writing sections" }, 175, async (_ctx, core) => ((await writeStage(core)) ? after(core.work, "write") : "write")),
    design: stage("design", { ko: "디자인 설계", en: "Designing" }, 95, async (_ctx, core) => {
      await designStage(core);
      return after(core.work, "design");
    }),
    assemble: stage("assemble", { ko: "문서 조립", en: "Assembling" }, 10, async (_ctx, core) => {
      assembleStage(core);
      return after(core.work, "assemble");
    }),
    review: stage("review", { ko: "검토·검증", en: "Reviewing" }, 110, async (ctx, core) => {
      const verdict = await reviewStage(core);
      if (verdict === "revise") return "revise";
      const next = after(core.work, "revise") === "finalize" ? after(core.work, "review") : after(core.work, "revise");
      return toolId === "business-plan" && !ctx.state.work.planData && !["beautify", "polish"].includes(core.work.contract?.mode ?? "") ? "plan_data" : next;
    }),
    revise: stage("revise", { ko: "개선", en: "Revising" }, 175, async (_ctx, core) => {
      await reviseStage(core);
      return "review";
    }),
    plan_data: {
      id: "plan_data",
      label: { ko: "재무·분석 블록", en: "Financials" },
      maxSeconds: 120,
      optional: { skipTo: "render_check" },
      run: async (ctx) => {
        const core = coreCtx(ctx);
        await planData(ctx, core);
        return { next: core.work.workflow.stages.includes("illustrate") ? "illustrate" : "render_check" };
      },
    },
    illustrate: stage("illustrate", { ko: "이미지", en: "Illustrating" }, 120, async (_ctx, core) => {
      await illustrateStage(core).catch((err) => console.warn("doc illustrations skipped:", (err as Error).message));
      return "render_check";
    }),
    render_check: stage("render_check", { ko: "렌더링 확인", en: "Checking the rendered file" }, 60, async (_ctx, core) => ((await renderCheckStage(core, eyebrow)) === "revise" ? "revise" : "finalize")),
  };
  return {
    id: toolId,
    objective: "요청과 자료를 정확히 반영한, 독자에게 바로 쓸 수 있는 문서",
    firstStage: "understand",
    stages,
    finalize: (state) => {
      const w = work(state);
      const doc = w.doc;
      if (!doc) return { output: null, sources: [] };
      const sources = (w.research?.sources ?? []) as Source[];
      const extra = (state.work.planData as Record<string, unknown> | undefined) ?? {};
      const report = workReport({ sources: [] }, w);
      return { output: { ...documentOutput(toolId, doc, extra), ...(report ? { work_report: report } : {}) }, sources };
    },
  };
}

/** The report for a document output (used by the proposal and business-plan builders). */
export { documentReport };
