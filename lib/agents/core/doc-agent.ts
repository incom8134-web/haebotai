import { CONTRACT_SCHEMA, CONTRACT_SYSTEM, contractBlock, contractPrompt, detectExplicit, mergeContract, MODE_LABELS, parseContract, type TaskContract, type TaskMode } from "./contract.ts";
import { analysisBlock, analysisGroups, analysisPrompt, ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, mergeAnalyses, parseAnalysis, type SourceAnalysis } from "./analysis.ts";
import { fallbackFacts, mergeSources, parseSynthesis, researchBlock, researchQuestions, searchPrompt, SYNTHESIS_SCHEMA, SYNTHESIS_SYSTEM, synthesisPrompt, type ResearchFinding, type ResearchResult } from "./research.ts";
import { allocate, checkPlan, derivePreservedPlan, parsePlan, PLAN_SCHEMA, PLAN_SYSTEM, planPrompt, totalBudget, type DocumentPlan } from "./plan.ts";
import { parseSection, SECTION_SCHEMA, sectionPrompt, WRITER_SYSTEM, writeBatches } from "./write.ts";
import { beautifyDocument, DESIGN_SCHEMA, DESIGN_SYSTEM, parseDesign, type DesignChoice } from "./beautify.ts";
import { verify, type Verification } from "./verify.ts";
import { lintDocument } from "./lint.ts";
import { policyBlock, policyFor } from "./policies.ts";
import { buildIndex, retrieve, passagesText, sourceContext } from "./retrieve.ts";
import { charsPerPage, fullText, outlineText, type SourceDoc } from "./source.ts";
import type { DocSection, LongDocument } from "./document.ts";
import type { ModelPort, Usage } from "./port.ts";

// The document agent: the orchestration for long-form documents
// (proposals, business plans) on the shared core. The request decides
// the workflow — a beautification never reaches a writer, a polish never
// reaches the planner, an inspiration never inherits the source outline,
// a requirements document drives the structure — and every workflow ends
// in review → verification → (targeted revision) → physical render check.
//
//   analyze → contract → [research] → [strategize] → outline → write ⟳
//   → assemble → review ⇄ revise → [illustrate] → render_check → finalize
//
// Pure orchestration over a ModelPort; persisted between stages by the
// runner (lib/agents/specs/document.ts wires it into the stage loop).

export interface DocCritique {
  score: number;
  issues: { sectionId: string; severity: "high" | "medium" | "low"; type: string; problem: string; fix: string }[];
  strengths: string[];
}

export interface DocWork {
  workflow: { mode: TaskMode | null; stages: string[]; reason: string };
  contract: TaskContract | null;
  analysis: SourceAnalysis | null;
  research: ResearchResult | null;
  plan: DocumentPlan | null;
  planIssues: string[];
  written: Record<string, DocSection>;
  failed: string[];
  doc: LongDocument | null;
  design: DesignChoice | null;
  critiques: DocCritique[];
  verification: Verification | null;
  revisions: number;
  expanded: boolean;
  renderedPages: number | null;
}

export function emptyWork(): DocWork {
  return { workflow: { mode: null, stages: [], reason: "" }, contract: null, analysis: null, research: null, plan: null, planIssues: [], written: {}, failed: [], doc: null, design: null, critiques: [], verification: null, revisions: 0, expanded: false, renderedPages: null };
}

export interface DocAgentCtx {
  toolId: string;
  toolName: string;
  work: DocWork;
  sources: SourceDoc[];
  port: ModelPort;
  /** Everything the member typed (form fields + free request), as one text. */
  requestText: string;
  referenceMode: string | null;
  intentText: string;
  /** The strategy's blueprint/rubric block, when a strategy was chosen. */
  strategyText: () => string;
  mustInclude: string[];
  brandColors: string[];
  year: number;
  /** False for one-call tools that only use the contract (no document workflow to explain). */
  documentWorkflow?: boolean;
  secondsLeft: () => number;
  emit: (label: { ko: string; en: string }, detail?: { ko: string; en: string }) => void;
  addUsage: (u: Usage) => void;
}

const MAX_REVISIONS = 2;
const PASS_SCORE = 80;

// ── Workflow selection ─────────────────────────────────────────────────

/** The stages for this contract, in order. Different requests, different workflows. */
export function workflowFor(c: TaskContract, hasSource: boolean): { stages: string[]; reason: string } {
  const research = c.research.need !== "none" && !["polish", "beautify"].includes(c.mode);
  const pre = hasSource ? ["analyze", "contract"] : ["contract"];
  const tail = ["assemble", "review", "revise", "illustrate", "render_check"];
  switch (c.mode) {
    case "beautify":
      return { stages: [...pre, "design", "assemble", "review", "render_check"], reason: "디자인만 바꾸는 작업: 원문을 그대로 두고 레이아웃·위계·표·강조만 설계합니다. 작성 단계가 없습니다." };
    case "polish":
      return { stages: [...pre, "outline", "write", ...tail.filter((s) => s !== "illustrate")], reason: "원문의 순서·구성·내용을 그대로 두고 섹션마다 문장만 다듬습니다. 계획은 원본 목차 그대로입니다." };
    case "rewrite":
      return { stages: [...pre, ...(research ? ["research"] : []), "outline", "write", ...tail], reason: "원본의 순서와 의미를 지키면서 섹션마다 전문적인 문장과 구성으로 다시 씁니다." };
    case "answer_requirements":
      return { stages: [...pre, ...(research ? ["research"] : []), "strategize", "outline", "write", ...tail], reason: "요구사항 문서의 항목과 순서가 구조를 정하고, 각 요구사항에 답하는 섹션을 씁니다." };
    case "inspire":
      return { stages: [...pre, ...(research ? ["research"] : []), "strategize", "outline", "write", ...tail], reason: "자료에서 개념만 가져오고, 구성과 문장은 새로 설계합니다." };
    case "transform":
    case "create_from_source":
      return { stages: [...pre, ...(research ? ["research"] : []), "strategize", "outline", "write", ...tail], reason: "자료를 근거로 새 문서를 설계하고, 섹션마다 관련 원문을 찾아 씁니다." };
    default:
      return { stages: [...pre, ...(research ? ["research"] : []), "strategize", "outline", "write", ...tail], reason: "요청에서 구조를 설계하고 섹션마다 씁니다." };
  }
}

/** The stage after `id` in this run's workflow. */
export function nextStage(work: DocWork, id: string, fallbackFirst: string[]): string {
  const stages = work.workflow.stages.length ? work.workflow.stages : fallbackFirst;
  const i = stages.indexOf(id);
  return i >= 0 && i + 1 < stages.length ? stages[i + 1] : "finalize";
}

// ── Shared helpers ─────────────────────────────────────────────────────

function contractText(ctx: DocAgentCtx): string {
  return ctx.work.contract ? contractBlock(ctx.work.contract) : "";
}

function policyText(ctx: DocAgentCtx): string {
  return policyBlock(policyFor(ctx.toolId, ctx.work.contract?.mode));
}

function cpp(ctx: DocAgentCtx): number {
  return charsPerPage(ctx.sources.map((d) => fullText(d)).join("").slice(0, 4000) || ctx.requestText);
}

const sourceIds = (ctx: DocAgentCtx) => new Set(ctx.sources.flatMap((d) => d.sections.map((s) => s.id)));

// ── Stages ─────────────────────────────────────────────────────────────

export async function analyzeStage(ctx: DocAgentCtx): Promise<void> {
  if (!ctx.sources.length) return;
  const total = ctx.sources.reduce((n, d) => n + fullText(d).length, 0);
  // Flash reads a 30-page document in one pass; only very long sources are split.
  const groups = analysisGroups(ctx.sources, total > 240_000 ? 150_000 : 260_000);
  const thin = ctx.sources.every((d) => d.stats.chars < 200);
  const parts = await Promise.all(
    groups.map(async (g, i) => {
      const r = await ctx.port.json({
        task: "analysis",
        tier: "fast",
        system: ANALYSIS_SYSTEM,
        prompt: analysisPrompt({ docs: ctx.sources, groupText: g.text, part: groups.length > 1 ? { index: i, total: groups.length } : undefined }),
        schema: ANALYSIS_SCHEMA,
        maxOutputTokens: 24_000,
        thinking: "low",
        timeoutMs: 110_000,
        attachSources: thin,
      });
      ctx.addUsage(r.usage);
      return parseAnalysis(r.data, sourceIds(ctx));
    }),
  );
  ctx.work.analysis = mergeAnalyses(parts.filter((p): p is SourceAnalysis => !!p));
  const a = ctx.work.analysis;
  const pages = ctx.sources.reduce((n, d) => n + (d.pages ?? 0), 0);
  ctx.emit(
    { ko: `자료 분석: 섹션 ${a?.sections.length ?? 0}/${ctx.sources.reduce((n, d) => n + d.sections.length, 0)}개`, en: `Analyzed ${a?.sections.length ?? 0} sections` },
    { ko: `${pages ? `${pages}쪽 · ` : ""}사실·수치 ${a?.facts.length ?? 0}개, 요구사항 ${a?.requirements.length ?? 0}개`, en: `${a?.facts.length ?? 0} facts, ${a?.requirements.length ?? 0} requirements` },
  );
}

export async function contractStage(ctx: DocAgentCtx): Promise<void> {
  const hasSource = ctx.sources.length > 0;
  const deck = ctx.toolId === "presentation";
  const explicit = detectExplicit(ctx.requestText, { referenceMode: ctx.referenceMode, hasSource, deck });
  let model: TaskContract | null = null;
  try {
    const r = await ctx.port.json({
      task: "contract",
      tier: "fast",
      system: CONTRACT_SYSTEM,
      prompt: contractPrompt({ toolName: ctx.toolName, requestText: ctx.requestText, sourceOutline: ctx.sources.map((d) => outlineText(d, 60)).join("\n"), intentText: ctx.intentText }),
      schema: CONTRACT_SCHEMA,
      maxOutputTokens: 4096,
      thinking: "low",
      timeoutMs: 40_000,
    });
    ctx.addUsage(r.usage);
    model = parseContract(r.data);
  } catch {
    // The explicit rules still make a contract.
  }
  const pages = ctx.sources.reduce((n, d) => n + (d.pages ?? 0), 0) || null;
  const c = mergeContract(model, explicit, { hasSource, sourcePages: pages ?? undefined, deck });
  ctx.work.contract = c;
  ctx.work.workflow = { mode: c.mode, ...workflowFor(c, hasSource) };
  ctx.emit(
    { ko: `작업 계약: ${MODE_LABELS[c.mode].ko}`, en: `Contract: ${MODE_LABELS[c.mode].en}` },
    ctx.documentWorkflow === false
      ? { ko: c.explicit.slice(0, 3).map((e) => `"${e}"`).join(", ") || c.rationale || c.deliverable, en: c.rationale || c.deliverable }
      : { ko: ctx.work.workflow.reason, en: ctx.work.workflow.reason },
  );
}

export async function researchStage(ctx: DocAgentCtx): Promise<void> {
  const c = ctx.work.contract!;
  const questions = researchQuestions(c.research.questions, { subject: c.deliverable || ctx.toolName, kind: c.deliverable, year: ctx.year });
  if (!questions.length) return;
  const context = [c.deliverable, c.audience, ctx.work.analysis?.summary ?? ""].filter(Boolean).join("\n");
  const settled = await Promise.allSettled(questions.map((q) => ctx.port.search(searchPrompt(q, context), context)));
  const findings: ResearchFinding[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      ctx.addUsage(s.value.usage);
      findings.push({ question: questions[i], findings: s.value.findings, sources: s.value.sources });
    }
  });
  const sources = mergeSources(findings);
  let result: ResearchResult = { questions, facts: fallbackFacts(findings, sources), conflicts: [], sources, unanswered: questions.filter((q) => !findings.some((f) => f.question === q)) };
  if (findings.length) {
    try {
      const r = await ctx.port.json({
        task: "synthesis",
        tier: "fast",
        system: SYNTHESIS_SYSTEM,
        prompt: synthesisPrompt(findings, sources, ctx.work.analysis?.facts.map((f) => f.text) ?? []),
        schema: SYNTHESIS_SCHEMA,
        maxOutputTokens: 8192,
        thinking: "low",
        timeoutMs: 60_000,
      });
      ctx.addUsage(r.usage);
      const parsed = parseSynthesis(r.data, questions, sources.length);
      if (parsed.facts.length) result = { questions, sources, ...parsed };
    } catch {
      // Keep the raw findings.
    }
  }
  ctx.work.research = result;
  ctx.emit(
    { ko: `조사: 질문 ${questions.length}개 · 출처 ${sources.length}개`, en: `Research: ${questions.length} questions, ${sources.length} sources` },
    { ko: `검증된 사실 ${result.facts.length}개${result.conflicts.length ? ` · 자료와 충돌 ${result.conflicts.length}건` : ""}`, en: `${result.facts.length} facts${result.conflicts.length ? `, ${result.conflicts.length} conflicts` : ""}` },
  );
}

export async function outlineStage(ctx: DocAgentCtx): Promise<void> {
  const c = ctx.work.contract!;
  if (c.mode === "polish" || c.mode === "rewrite" || (c.preserve.order && c.preserve.structure && ctx.sources.length)) {
    ctx.work.plan = derivePreservedPlan(ctx.sources, c, ctx.work.analysis);
  } else {
    const r = await ctx.port.json({
      task: "plan",
      tier: "smart",
      system: PLAN_SYSTEM,
      prompt: planPrompt({
        contractText: contractText(ctx),
        intentText: ctx.intentText,
        strategyText: ctx.strategyText(),
        sourceOutline: ctx.sources.map((d) => outlineText(d)).join("\n"),
        analysisText: ctx.work.analysis ? analysisBlock(ctx.work.analysis) : "",
        researchQuestions: ctx.work.research?.questions ?? [],
        researchText: ctx.work.research ? researchBlock(ctx.work.research, { max: 20 }) : "",
        totalChars: totalBudget(c, cpp(ctx)),
        policy: policyText(ctx),
        brandColors: ctx.brandColors,
      }),
      schema: PLAN_SCHEMA,
      maxOutputTokens: 16_000,
      thinking: "medium",
      timeoutMs: 120_000,
    });
    ctx.addUsage(r.usage);
    const plan = parsePlan(r.data, { sourceIds: sourceIds(ctx), requirementIds: new Set(ctx.work.analysis?.requirements.map((q) => q.id) ?? []), questions: ctx.work.research?.questions ?? [] });
    if (!plan) throw new Error("문서 구조를 설계하지 못했습니다");
    // Requirements no section answers go to the closest section by wording.
    ctx.work.plan = allocate(plan, totalBudget(c, cpp(ctx)));
  }
  ctx.work.planIssues = checkPlan(ctx.work.plan, c, ctx.work.analysis);
  const p = ctx.work.plan;
  ctx.emit(
    { ko: `설계: ${p.sections.length}개 섹션${p.derived ? " (원본 목차 그대로)" : ""}`, en: `Plan: ${p.sections.length} sections${p.derived ? " (source outline)" : ""}` },
    { ko: `시각 자료 ${p.sections.filter((s) => s.visual.kind !== "none").length}곳${ctx.work.planIssues.length ? ` · 확인할 점 ${ctx.work.planIssues.length}개` : ""}`, en: `${p.sections.filter((s) => s.visual.kind !== "none").length} visuals` },
  );
}

/** Writes (or rewrites) the given plan sections in parallel; returns how many came back. */
async function writeSections(ctx: DocAgentCtx, ids: string[], fixes: Record<string, string[]> = {}): Promise<number> {
  const plan = ctx.work.plan!;
  const c = ctx.work.contract!;
  const index = ctx.sources.length ? buildIndex(ctx.sources) : null;
  const byId = new Map(ctx.sources.flatMap((d) => d.sections).map((s) => [s.id, s]));
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const i = plan.sections.findIndex((s) => s.id === id);
      const s = plan.sections[i];
      const original = s.from ? byId.get(s.from) ?? null : null;
      // The source the writer sees: the section it reworks, or the passages this section needs.
      let sourceText = "";
      let complete = false;
      if (original) sourceText = passagesText(retrieve(index!, "", 60_000, [original.id]));
      else if (index && c.mode !== "create") {
        const query = [s.title, s.purpose, ...s.mustCover].join(" ");
        const ctxText = sourceContext(ctx.sources, index, query, 24_000, s.sourceRefs);
        sourceText = ctxText.text;
        complete = ctxText.complete;
      }
      const before = plan.sections.slice(0, i).map((p) => ({ title: p.title, summary: ctx.work.written[p.id]?.summary || p.purpose }));
      const prompt = sectionPrompt({
        contract: c,
        contractText: contractText(ctx),
        policy: policyText(ctx),
        plan,
        section: s,
        index: i,
        before,
        sourceText,
        sourceComplete: complete,
        original,
        analysisText: ctx.work.analysis ? analysisBlock(ctx.work.analysis, { sectionIds: s.sourceRefs, maxFacts: 25 }) : "",
        researchText: ctx.work.research && !original ? researchBlock(ctx.work.research, { questions: s.research.length ? s.research : undefined, max: s.research.length ? 15 : 8 }) : "",
        intentText: ctx.intentText,
        fixes: fixes[id],
        previous: fixes[id] ? ctx.work.written[id] : null,
      });
      const call = async (tier: "smart" | "fast") => {
        const r = await ctx.port.json({ task: "section", tier, system: WRITER_SYSTEM, prompt, schema: SECTION_SCHEMA, maxOutputTokens: Math.min(32_000, 4000 + s.targetChars * 3), thinking: "low", timeoutMs: 150_000 });
        ctx.addUsage(r.usage);
        const parsed = parseSection(r.data, s, original ? (c.mode === "polish" ? "polished" : "rewritten") : "new");
        if (!parsed) throw new Error("섹션 응답을 해석하지 못했습니다");
        // A preserved title stays the source's.
        if (original && c.preserve.sectionTitles && original.title) parsed.title = original.title;
        return parsed;
      };
      return call("smart").catch(() => call("fast"));
    }),
  );
  let ok = 0;
  results.forEach((r, k) => {
    const id = ids[k];
    if (r.status === "fulfilled") {
      ctx.work.written[id] = r.value;
      ctx.work.failed = ctx.work.failed.filter((f) => f !== id);
      ok++;
    } else if (!ctx.work.written[id] && !ctx.work.failed.includes(id)) ctx.work.failed.push(id);
  });
  return ok;
}

/** Writes batches while time allows; returns true when every section is written (or given up on). */
export async function writeStage(ctx: DocAgentCtx, batchSeconds = 160): Promise<boolean> {
  const plan = ctx.work.plan!;
  for (;;) {
    const done = new Set([...Object.keys(ctx.work.written), ...ctx.work.failed]);
    const [batch] = writeBatches(plan, done, 4);
    if (!batch) break;
    if (ctx.secondsLeft() < batchSeconds) return false;
    await writeSections(ctx, batch.map((s) => s.id));
    const n = Object.keys(ctx.work.written).length;
    ctx.emit({ ko: `작성: ${n}/${plan.sections.length} 섹션`, en: `Written ${n}/${plan.sections.length}` });
  }
  return true;
}

export async function designStage(ctx: DocAgentCtx): Promise<void> {
  let design: DesignChoice = parseDesign({}, ctx.sources);
  try {
    const r = await ctx.port.json({
      task: "design",
      tier: "fast",
      system: DESIGN_SYSTEM,
      prompt: [policyText(ctx), contractText(ctx), ctx.work.analysis ? `[문서 관찰]\n${ctx.work.analysis.designNotes.join("\n")}\n문서 종류: ${ctx.work.analysis.docType}` : "", ctx.brandColors.length ? `[브랜드 컬러] ${ctx.brandColors.join(", ")}` : "", "[원문 전체]", ctx.sources.map((d) => fullText(d)).join("\n\n").slice(0, 400_000)].filter(Boolean).join("\n\n"),
      schema: DESIGN_SCHEMA,
      maxOutputTokens: 8192,
      thinking: "low",
      timeoutMs: 90_000,
    });
    ctx.addUsage(r.usage);
    design = parseDesign(r.data, ctx.sources);
  } catch {
    // Default design; the text is the point.
  }
  ctx.work.design = design;
  ctx.emit({ ko: `디자인: ${design.design.tone}`, en: `Design: ${design.design.tone}` }, { ko: `강조 ${design.highlights.length}곳 · 핵심 수치 ${design.kpis.length}개 (모두 원문 그대로)`, en: `${design.highlights.length} highlights, ${design.kpis.length} figures (verbatim)` });
}

export function assembleStage(ctx: DocAgentCtx): void {
  const c = ctx.work.contract!;
  if (c.mode === "beautify") {
    ctx.work.doc = beautifyDocument(ctx.sources, ctx.work.design ?? parseDesign({}, ctx.sources));
    return;
  }
  const plan = ctx.work.plan!;
  const sections: DocSection[] = plan.sections.map(
    (p) =>
      ctx.work.written[p.id] ?? {
        id: p.id,
        title: p.title,
        level: p.level,
        blocks: [{ type: "callout", label: "작성 실패", text: "이 섹션은 생성하지 못했습니다. 이 부분만 다시 만들기로 채워 주세요.", tone: "warn" }],
        sourceRefs: p.sourceRefs,
        status: "new",
      },
  );
  ctx.work.doc = { title: plan.title, subtitle: plan.subtitle, docType: plan.docType, design: ctx.work.design?.design ?? plan.design, sections };
}

const DOC_CRITIC_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    issues: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          section: { type: "string", description: "섹션 id (p3 등)" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          type: { type: "string", enum: ["instruction", "source", "fact", "generic", "repetition", "structure", "missing", "visual", "length", "tone"] },
          problem: { type: "string" },
          fix: { type: "string" },
        },
        required: ["section", "severity", "type", "problem", "fix"],
      },
    },
    strengths: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: ["score", "issues", "strengths"],
} as const;

const DOC_CRITIC_SYSTEM = [
  "당신은 이 문서를 받아 볼 독자의 입장에서 냉정하게 검토하는 시니어 에디터입니다. 고쳐 쓰지 말고, 섹션별로 무엇이 왜 부족한지와 고칠 방법만 적습니다.",
  "점검 순서: 1) 작업 계약과 사용자의 명시적 지시를 지켰는가 2) 올린 자료를 실제로 썼는가, 빠뜨린 중요한 내용은 없는가 3) 근거 없는 사실·수치가 있는가 4) 구체적인가, 어느 회사에나 통하는 문장인가 5) 반복·상투적 표현 6) 시각 자료가 목적에 맞는가 7) 섹션 사이의 흐름.",
  "[자동 점검 결과]는 측정값입니다. 그 결과와 같은 문제는 다시 적지 않아도 됩니다.",
].join("\n");

export async function reviewStage(ctx: DocAgentCtx): Promise<"pass" | "revise"> {
  const c = ctx.work.contract!;
  const doc = ctx.work.doc!;
  const lint = c.mode === "beautify" ? null : lintDocument(doc);
  const v = verify({ contract: c, doc, plan: ctx.work.plan ?? derivePreservedPlan(ctx.sources, c, ctx.work.analysis), sources: ctx.sources, analysis: ctx.work.analysis, research: ctx.work.research, inputText: ctx.requestText, mustInclude: ctx.mustInclude, lint, charsPerPage: cpp(ctx), renderedPages: ctx.work.renderedPages });
  ctx.work.verification = v;
  const failed = v.checks.filter((x) => !x.pass && x.severity !== "info");
  // Beautification is checked, never critiqued into a rewrite.
  if (c.mode === "beautify") {
    ctx.emit({ ko: `검증: ${v.checks.filter((x) => x.pass).length}/${v.checks.length} 통과`, en: `Verified ${v.checks.filter((x) => x.pass).length}/${v.checks.length}` });
    return "pass";
  }
  let critique: DocCritique | null = null;
  try {
    const r = await ctx.port.json({
      task: "critic",
      tier: "fast",
      system: DOC_CRITIC_SYSTEM,
      prompt: [
        contractText(ctx),
        policyText(ctx),
        ctx.intentText,
        ctx.work.analysis ? analysisBlock(ctx.work.analysis, { maxFacts: 40 }) : "",
        ctx.work.research ? researchBlock(ctx.work.research, { max: 15 }) : "",
        `[자동 점검 결과]\n${v.checks.map((x) => `- ${x.pass ? "통과" : "실패"} ${x.label}: 목표 ${x.target} / 실제 ${x.actual}`).join("\n")}`,
        lint?.findings.length ? `[상투성 점검]\n${lint.findings.slice(0, 10).map((f) => `- ${f.where}: ${f.detail}`).join("\n")}` : "",
        "[검토할 문서]",
        JSON.stringify(doc.sections.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks }))).slice(0, 300_000),
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: DOC_CRITIC_SCHEMA,
      maxOutputTokens: 8192,
      thinking: "medium",
      timeoutMs: 100_000,
    });
    ctx.addUsage(r.usage);
    const raw = (r.data ?? {}) as { score?: number; issues?: { section?: string; severity?: string; type?: string; problem?: string; fix?: string }[]; strengths?: string[] };
    const ids = new Set(doc.sections.map((s) => s.id));
    critique = {
      score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
      issues: (raw.issues ?? [])
        .map((i) => ({ sectionId: String(i.section ?? "").trim(), severity: ((["high", "medium", "low"] as const).includes(i.severity as "high") ? i.severity : "medium") as DocCritique["issues"][number]["severity"], type: String(i.type ?? "other"), problem: String(i.problem ?? "").slice(0, 400), fix: String(i.fix ?? "").slice(0, 400) }))
        .filter((i) => i.problem && ids.has(i.sectionId)),
      strengths: (raw.strengths ?? []).map(String).slice(0, 4),
    };
    ctx.work.critiques.push(critique!);
  } catch {
    // The checks alone still decide.
  }
  const high = critique?.issues.filter((i) => i.severity === "high").length ?? 0;
  ctx.emit(
    { ko: `검토 ${ctx.work.revisions + 1}차${critique ? `: ${critique.score}점` : ""} · 검증 ${v.checks.filter((x) => x.pass).length}/${v.checks.length}`, en: `Review ${ctx.work.revisions + 1}${critique ? `: ${critique.score}` : ""} · ${v.checks.filter((x) => x.pass).length}/${v.checks.length} checks` },
    failed.length || high ? { ko: `고칠 점: ${[...failed.map((x) => x.label), ...(high ? [`중요 지적 ${high}개`] : [])].join(", ")}`, en: `${failed.length + high} issues` } : { ko: "기준 충족", en: "Meets the bar" },
  );
  const ok = v.pass && !high && (!critique || critique.score >= PASS_SCORE);
  return ok || ctx.work.revisions >= MAX_REVISIONS ? "pass" : "revise";
}

/** Targets for a revision: the verifier's sections plus the critic's high/medium issues, at most six sections. */
export function revisionTargets(work: DocWork): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [id, why] of Object.entries(work.verification?.targets ?? {})) (out[id] ??= []).push(...why);
  const last = work.critiques[work.critiques.length - 1];
  for (const i of last?.issues ?? []) if (i.severity !== "low") (out[i.sectionId] ??= []).push(`${i.problem} → ${i.fix}`);
  for (const id of work.failed) (out[id] ??= []).push("이 섹션을 처음부터 작성하세요");
  const ranked = Object.entries(out).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  return Object.fromEntries(ranked);
}

export async function reviseStage(ctx: DocAgentCtx): Promise<void> {
  const targets = revisionTargets(ctx.work);
  const ids = Object.keys(targets).filter((id) => ctx.work.plan?.sections.some((s) => s.id === id));
  ctx.work.revisions++;
  if (!ids.length) return;
  await writeSections(ctx, ids, targets);
  assembleStage(ctx);
  ctx.emit({ ko: `${ctx.work.revisions}차 개선: ${ids.length}개 섹션`, en: `Revision ${ctx.work.revisions}: ${ids.length} sections` }, { ko: "검토에서 지적된 섹션만 다시 썼어요", en: "Only the flagged sections were rewritten" });
}

export async function illustrateStage(ctx: DocAgentCtx, max = 3): Promise<void> {
  const doc = ctx.work.doc;
  if (!doc || !ctx.port.images || ctx.work.contract?.visuals.avoid.some((a) => /사진|이미지|image|photo/i.test(a))) return;
  const wanted = doc.sections.flatMap((s) => s.blocks.filter((b): b is Extract<typeof b, { type: "image" }> => b.type === "image" && !b.url)).slice(0, max);
  if (!wanted.length) return;
  const shots = await ctx.port.images(
    wanted.map((b, i) => ({ key: `img${i + 1}`, prompt: `${b.prompt}${b.caption ? ` — ${b.caption}` : ""}` })),
    [doc.title, doc.docType, ctx.work.contract?.audience ?? ""].filter(Boolean).join(" / "),
  );
  wanted.forEach((b, i) => {
    const shot = shots.get(`img${i + 1}`);
    if (shot) b.url = shot.url;
  });
  ctx.emit({ ko: `이미지 ${shots.size}장`, en: `${shots.size} images` });
}

/** Renders the document like the PDF export and checks the page count; once, a short document goes back for expansion. */
export async function renderCheckStage(ctx: DocAgentCtx, eyebrow: string): Promise<"done" | "revise"> {
  const doc = ctx.work.doc!;
  const c = ctx.work.contract!;
  const pages = ctx.port.render ? await ctx.port.render(doc, eyebrow).catch(() => null) : null;
  ctx.work.renderedPages = pages;
  ctx.work.verification = verify({ contract: c, doc, plan: ctx.work.plan ?? derivePreservedPlan(ctx.sources, c, ctx.work.analysis), sources: ctx.sources, analysis: ctx.work.analysis, research: ctx.work.research, inputText: ctx.requestText, mustInclude: ctx.mustInclude, lint: c.mode === "beautify" ? null : lintDocument(doc), charsPerPage: cpp(ctx), renderedPages: pages });
  const length = ctx.work.verification.checks.find((x) => x.id === "length");
  ctx.emit({ ko: pages ? `렌더링 확인: ${pages}쪽` : "렌더링 확인", en: pages ? `Rendered: ${pages} pages` : "Render check" }, length ? { ko: `분량 목표 ${length.target} · 실제 ${length.actual}`, en: `Target ${length.target}, actual ${length.actual}` } : undefined);
  if (length && !length.pass && !ctx.work.expanded && c.mode !== "beautify" && c.mode !== "polish") {
    ctx.work.expanded = true;
    ctx.work.revisions = Math.min(ctx.work.revisions, MAX_REVISIONS - 1);
    return "revise";
  }
  return "done";
}

// ── What the member sees ───────────────────────────────────────────────

export interface WorkReport {
  mode: TaskMode;
  /** The contract as the writers read it (follow-up edits keep honoring it). */
  contractText: string;
  modeLabel: string;
  workflow: string[];
  reason: string;
  contract: { preserve: string[]; prohibit: string[]; length: string; research: string; explicit: string[] };
  source?: { name: string; pages?: number; sections: number; analyzed: number; facts: number; requirements: number }[];
  research?: { questions: string[]; facts: number; sources: number; conflicts: { source: string; research: string }[]; unanswered: string[] };
  checks: { label: string; target: string; actual: string; pass: boolean; severity: string }[];
  assumptions: string[];
  changes: { title: string; status: string; from?: string }[];
  renderedPages: number | null;
}

export function workReport(ctx: Pick<DocAgentCtx, "sources">, work: DocWork): WorkReport | null {
  const c = work.contract;
  if (!c) return null;
  const byId = new Map(ctx.sources.flatMap((d) => d.sections).map((s) => [s.id, s.title]));
  return {
    mode: c.mode,
    contractText: contractBlock(c),
    modeLabel: MODE_LABELS[c.mode].ko,
    workflow: work.workflow.stages,
    reason: work.workflow.reason,
    contract: {
      preserve: Object.entries(c.preserve).filter(([, v]) => v).map(([k]) => k),
      prohibit: c.prohibit,
      length: c.length.target ? `${c.length.target} ${c.length.unit}` : "",
      research: c.research.need,
      explicit: c.explicit,
    },
    source: ctx.sources.length ? ctx.sources.map((d) => ({ name: d.name, pages: d.pages, sections: d.sections.length, analyzed: work.analysis?.sections.filter((s) => d.sections.some((x) => x.id === s.id)).length ?? 0, facts: work.analysis?.facts.length ?? 0, requirements: work.analysis?.requirements.length ?? 0 })) : undefined,
    research: work.research ? { questions: work.research.questions, facts: work.research.facts.length, sources: work.research.sources.length, conflicts: work.research.conflicts.map((x) => ({ source: x.source, research: x.research })), unanswered: work.research.unanswered } : undefined,
    checks: (work.verification?.checks ?? []).map((x) => ({ label: x.label, target: x.target, actual: x.actual, pass: x.pass, severity: x.severity })),
    assumptions: Object.values(work.written).flatMap((s) => (s.claims ?? []).filter((cl) => cl.basis === "assumption").map((cl) => cl.text)).slice(0, 20),
    changes: (work.doc?.sections ?? []).map((s) => ({ title: s.title, status: s.status, from: s.sourceRefs[0] ? byId.get(s.sourceRefs[0]) : undefined })),
    renderedPages: work.renderedPages,
  };
}
