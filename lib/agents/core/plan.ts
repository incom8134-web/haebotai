import type { TaskContract } from "./contract.ts";
import type { SourceAnalysis } from "./analysis.ts";
import type { SourceDoc } from "./source.ts";
import type { DesignSystem } from "./document.ts";

// The document plan: what each section must accomplish, which source
// sections it rests on, what it must cover, which research questions feed
// it, how long it is, and whether a visual earns its place there. The
// planner decides the structure from the request, the source and the
// audience — there is no universal outline. When the contract preserves
// order or structure, the plan is the source's own outline, one plan
// section per source section, built by code so it cannot drift.
//
// Pure logic (tested); the model call is in the document agent.

const VISUAL_KINDS = ["none", "table", "bar", "line", "donut", "timeline", "process", "kpis", "callout", "image", "comparison"] as const;
export type VisualKind = (typeof VISUAL_KINDS)[number];

export interface PlanSection {
  id: string;
  title: string;
  level: number;
  purpose: string;
  /** Source section ids this section rests on (retrieved for the writer). */
  sourceRefs: string[];
  /** Requirement ids (from the analysis) this section answers. */
  requirements: string[];
  mustCover: string[];
  /** Research questions whose facts this section uses. */
  research: string[];
  /** Relative weight (1–5) for the length budget. */
  weight: number;
  /** Characters of prose (no spaces) this section gets. */
  targetChars: number;
  visual: { kind: VisualKind; purpose: string; spec: string };
  /** Polish/rewrite/beautify: the one source section this section reworks. */
  from?: string;
}

export interface DocumentPlan {
  title: string;
  subtitle: string;
  docType: string;
  narrative: string;
  design: DesignSystem;
  sections: PlanSection[];
  /** How the plan was made: by the planner or derived from the source outline. */
  derived: boolean;
}

export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    doc_type: { type: "string" },
    narrative: { type: "string", description: "문서 전체가 독자를 어떤 순서로 설득하는지 두세 문장" },
    design_tone: { type: "string", enum: ["formal", "modern", "premium", "warm", "technical", "minimal"] },
    design_accent: { type: "string", description: "주조색 hex (#1F4E79 등). 브랜드 컬러가 있으면 그것" },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          level: { type: "integer", minimum: 1, maximum: 3 },
          purpose: { type: "string", description: "이 섹션이 독자에게 이뤄야 할 것 한 문장" },
          source_refs: { type: "array", items: { type: "string" }, description: "근거가 되는 올린 자료의 섹션 id ([s3] → s3)" },
          requirements: { type: "array", items: { type: "string" }, description: "답하는 요구사항 id (r1…)" },
          must_cover: { type: "array", items: { type: "string" }, maxItems: 6, description: "반드시 담을 내용 (구체적으로)" },
          research: { type: "array", items: { type: "string" }, description: "이 섹션이 쓰는 조사 질문 (조사 질문 목록의 문장 그대로)" },
          weight: { type: "integer", minimum: 1, maximum: 5, description: "분량 비중. 핵심 장일수록 크게" },
          visual_kind: { type: "string", enum: [...VISUAL_KINDS], description: "이 섹션에 시각 자료가 이해를 실제로 돕는다면 그 종류. 아니면 none. 빈자리 채우기용 시각 자료는 금지" },
          visual_purpose: { type: "string", description: "그 시각 자료가 전달할 것 (none이면 빈 문자열)" },
          visual_spec: { type: "string", description: "무엇을 어떤 축·항목으로 보여 줄지 (데이터 출처 포함)" },
        },
        required: ["title", "level", "purpose", "source_refs", "requirements", "must_cover", "research", "weight", "visual_kind", "visual_purpose", "visual_spec"],
      },
    },
  },
  required: ["title", "subtitle", "doc_type", "narrative", "design_tone", "design_accent", "sections"],
} as const;

export const PLAN_SYSTEM = [
  "당신은 이 문서의 구조를 설계하는 편집장입니다. 아직 본문을 쓰지 말고, 각 섹션이 무엇을 이뤄야 하고 어떤 근거를 쓰는지 설계합니다.",
  "구조는 정해진 템플릿이 아니라 이 요청·독자·자료에서 나와야 합니다. 기술 제안서와 정부 과제 계획서와 투자 제안서는 구조가 다릅니다.",
  "요구사항(공고·양식)이 있으면 그 항목과 순서를 빠짐없이 따르고, 각 요구사항을 어느 섹션이 답하는지 requirements에 적으세요.",
  "올린 자료가 영감용이면 그 목차를 따라 하지 말고 새 구조를 설계하세요. 사용자 자료가 프로젝트 자체라면 그 사실을 근거(source_refs)로 연결하세요.",
  "요청한 분량을 채우되, 내용 없는 섹션으로 늘리지 말고 근거·분석·실행 세부로 깊이를 만드세요.",
  "시각 자료는 이해를 실제로 돕는 곳에만 정하세요: 수치 비교는 차트, 단계는 공정도(process), 일정은 timeline, 여러 항목 비교는 표, 핵심 숫자는 kpis.",
].join("\n");

export function planPrompt(opts: {
  contractText: string;
  intentText: string;
  strategyText: string;
  sourceOutline: string;
  analysisText: string;
  researchQuestions: string[];
  researchText: string;
  totalChars: number | null;
  policy: string;
  brandColors?: string[];
}): string {
  return [
    opts.contractText,
    opts.intentText,
    opts.strategyText,
    opts.policy,
    opts.sourceOutline ? `[올린 자료의 구조]\n${opts.sourceOutline}` : "",
    opts.analysisText,
    opts.researchQuestions.length ? `[조사 질문]\n${opts.researchQuestions.map((q) => `- ${q}`).join("\n")}` : "",
    opts.researchText,
    opts.totalChars ? `[분량] 본문 약 ${opts.totalChars.toLocaleString()}자(공백 제외)를 섹션에 나눕니다. weight로 비중을 정하세요.` : "",
    opts.brandColors?.length ? `[브랜드 컬러] ${opts.brandColors.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, n: number, max = 200) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

export function parsePlan(raw: unknown, valid: { sourceIds: Set<string>; requirementIds: Set<string>; questions: string[] }): DocumentPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sections = (Array.isArray(r.sections) ? r.sections : [])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x, i) => {
      const kind = (VISUAL_KINDS as readonly string[]).includes(x.visual_kind as string) ? (x.visual_kind as VisualKind) : "none";
      return {
        id: `p${i + 1}`,
        title: str(x.title, 160),
        level: Math.max(1, Math.min(3, Number(x.level) || 1)),
        purpose: str(x.purpose, 300),
        sourceRefs: strs(x.source_refs, 12, 20).map((id) => id.replace(/[[\]]/g, "")).filter((id) => valid.sourceIds.has(id)),
        requirements: strs(x.requirements, 12, 10).filter((id) => valid.requirementIds.has(id)),
        mustCover: strs(x.must_cover, 6, 200),
        research: strs(x.research, 5, 200).filter((q) => valid.questions.includes(q)),
        weight: Math.max(1, Math.min(5, Math.round(Number(x.weight) || 2))),
        targetChars: 0,
        visual: { kind, purpose: kind === "none" ? "" : str(x.visual_purpose, 200), spec: kind === "none" ? "" : str(x.visual_spec, 300) },
      } satisfies PlanSection;
    })
    .filter((s) => s.title);
  if (sections.length < 2) return null;
  return {
    title: str(r.title, 160),
    subtitle: str(r.subtitle, 240),
    docType: str(r.doc_type, 120),
    narrative: str(r.narrative, 500),
    design: {
      tone: (["formal", "modern", "premium", "warm", "technical", "minimal"] as const).includes(r.design_tone as "formal") ? (r.design_tone as DesignSystem["tone"]) : "formal",
      accent: /^#[0-9a-f]{6}$/i.test(String(r.design_accent)) ? String(r.design_accent) : "#1F4E79",
      density: "standard",
      numbering: true,
    },
    sections,
    derived: false,
  };
}

/**
 * Preserving modes: one plan section per source section, in order, with
 * its title — the structure is the member's, not the planner's.
 */
export function derivePreservedPlan(docs: SourceDoc[], contract: TaskContract, analysis: SourceAnalysis | null): DocumentPlan {
  const first = docs[0];
  const sections: PlanSection[] = [];
  for (const d of docs) {
    for (const s of d.sections) {
      const chars = (s.text + s.tables.map((t) => t.rows.flat().join("")).join("")).replace(/\s+/g, "").length;
      const role = analysis?.sections.find((a) => a.id === s.id);
      sections.push({
        id: `p${sections.length + 1}`,
        title: s.title || (sections.length === 0 ? first.name.replace(/\.[a-z0-9]+$/i, "") : `${s.number || sections.length + 1}`),
        level: Math.max(1, Math.min(3, s.level)),
        purpose: role?.summary ?? "",
        sourceRefs: [s.id],
        requirements: [],
        mustCover: role?.keyPoints ?? [],
        research: [],
        weight: 1,
        targetChars: contract.mode === "rewrite" ? Math.round(chars * 1.05) : chars,
        visual: { kind: s.tables.length ? "table" : "none", purpose: "", spec: "" },
        from: s.id,
      });
    }
  }
  return {
    title: analysis?.docType && first ? first.sections[0]?.title || first.name.replace(/\.[a-z0-9]+$/i, "") : first?.name ?? "",
    subtitle: "",
    docType: analysis?.docType ?? "",
    narrative: "",
    design: { tone: "formal", accent: "#1F4E79", density: "standard", numbering: false },
    sections,
    derived: true,
  };
}

/** The total prose budget from the contract (characters, no spaces), or null when no length was asked. */
export function totalBudget(contract: TaskContract, charsPerPage: number): number | null {
  const t = contract.length.target;
  if (!t) return null;
  switch (contract.length.unit) {
    case "pages":
      // Visuals and headings take roughly a fifth of a document page.
      return Math.round(t * charsPerPage * 0.8);
    case "chars":
      return t;
    case "words":
      return Math.round(t * (charsPerPage > 2000 ? 5 : 2.6));
    case "sections":
      return t * 1800;
    default:
      return null;
  }
}

/** Spreads the budget over the sections by weight (a floor so no section is a stub). */
export function allocate(plan: DocumentPlan, total: number | null, fallbackPerSection = 900): DocumentPlan {
  if (plan.derived) return plan;
  const weights = plan.sections.reduce((n, s) => n + s.weight, 0) || 1;
  const sum = total ?? plan.sections.reduce((n, s) => n + s.weight * fallbackPerSection, 0);
  return { ...plan, sections: plan.sections.map((s) => ({ ...s, targetChars: Math.max(350, Math.round((sum * s.weight) / weights)) })) };
}

/** Problems with a plan before anything is written (a missed requirement, a reordered preserved document). */
export function checkPlan(plan: DocumentPlan, contract: TaskContract, analysis: SourceAnalysis | null): string[] {
  const issues: string[] = [];
  if (analysis && contract.mode === "answer_requirements") {
    const covered = new Set(plan.sections.flatMap((s) => s.requirements));
    for (const r of analysis.requirements.filter((q) => q.mandatory)) if (!covered.has(r.id)) issues.push(`요구사항 ${r.id}(${r.text.slice(0, 60)})을 답하는 섹션이 없습니다`);
  }
  if (contract.preserve.order && !plan.derived) {
    const refs = plan.sections.map((s) => s.sourceRefs[0]).filter(Boolean).map((id) => Number(id.slice(1)));
    for (let i = 1; i < refs.length; i++) if (refs[i] < refs[i - 1]) issues.push("원본 순서를 지켜야 하는데 계획의 순서가 원본과 다릅니다");
  }
  if (contract.visuals.level === "none") for (const s of plan.sections) s.visual = { kind: "none", purpose: "", spec: "" };
  if (contract.visuals.avoid.some((a) => /사진|이미지|image|photo/i.test(a))) for (const s of plan.sections) if (s.visual.kind === "image") s.visual = { kind: "none", purpose: "", spec: "" };
  return [...new Set(issues)];
}
