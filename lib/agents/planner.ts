// The planner (docs/ai-architecture-v2.md §4.3): after the strategy is
// chosen, decide the workflow for THIS request — which research to do
// (none, the topic, the competition, the customers' own language), how
// many critique ⇄ revise rounds the deliverable deserves, and what the
// critic must check hardest. The model chooses; code builds the plan from
// its choice and validates it, so a plan can only use the tool's allowed
// capabilities in a sound order. A failed or invalid choice keeps the
// tool's default plan.
//
// Pure logic (tested); the model call is lib/agents/calls.ts.

import { agenticFor, type Plan, type PlanStep } from "./plan.ts";

/** Research capabilities the planner may pick, with the step id each uses in a plan. */
export const RESEARCH: Record<string, { stepId: string; name: string; when: string; focus?: string }> = {
  research_topic: {
    stepId: "research",
    name: "주제·시장 조사",
    when: "시장·업계 사실, 최신 수치, 규정이 결과의 근거가 될 때",
  },
  analyze_competitors: {
    stepId: "competitors",
    name: "경쟁·대안 분석",
    when: "차별화·포지셔닝·비교가 결과의 핵심일 때(경쟁자가 입력에 있거나, 고객이 고르는 대안이 결과를 좌우할 때)",
    focus:
      "이 요청의 고객이 실제로 비교하는 경쟁자와 대안(입력에 적힌 경쟁자 우선, 없으면 이 업종·지역의 대표 대안)의 제안·가격대·메시지·약점, 그리고 아무도 차지하지 않은 자리",
  },
  research_audience: {
    stepId: "audience",
    name: "고객 언어·행동 조사",
    when: "고객이 실제로 쓰는 말, 구매 이유와 망설임이 설득력을 좌우할 때(카피, 페이지, 제안, 콘텐츠)",
    focus: "이 요청의 고객이 이 문제·제품에 대해 실제로 쓰는 표현(리뷰, 커뮤니티, 검색어), 사는 이유와 망설이는 이유, 결정하는 순간과 장소",
  },
};

/** Tools whose generic writing workflow the planner shapes. Visual and site agents keep their own plans. */
const OWN_WORKFLOW = new Set(["homepage", "logo", "image", "brand-model"]);

export function plannable(toolId: string, provider: string): boolean {
  return agenticFor(toolId, provider) && !OWN_WORKFLOW.has(toolId);
}

export const MAX_STEPS = 12;
const TERMINAL = new Set(["finish_output", "assemble_site", "draw_logo", "render_photos", "one_shot"]);

export function plannerSchema(webSearch: boolean) {
  return {
    type: "object",
    properties: {
      ...(webSearch
        ? {
            research: {
              type: "array",
              items: { type: "string", enum: Object.keys(RESEARCH) },
              maxItems: 3,
              description: "이 요청에 실제로 필요한 조사만, 필요한 순서대로. 입력만으로 충분하면 빈 배열",
            },
          }
        : {}),
      revisions: { type: "integer", minimum: 1, maximum: 2, description: "검토 후 고쳐 쓰기 최대 횟수. 짧고 분명한 결과물은 1, 길거나 설득·심사가 걸린 결과물은 2" },
      critic_focus: {
        type: "array",
        items: { type: "string" },
        maxItems: 4,
        description: "검토자가 이번 요청에서 가장 엄격하게 볼 것 (이 요청의 독자·목적에서 나온 구체적인 기준 문장)",
      },
      reason: { type: "string", description: "이 작업 순서를 고른 이유 한 문장 (사용자에게 보임)" },
    },
    required: [...(webSearch ? ["research"] : []), "revisions", "critic_focus", "reason"],
  } as const;
}

export const PLANNER_SYSTEM = [
  "당신은 작업 설계자입니다. 전략은 이미 정해졌습니다. 이 요청을 그 전략대로 해내는 데 필요한 작업 순서만 정합니다.",
  "모든 요청에 같은 순서를 쓰지 마세요. 조사는 결과의 근거가 될 때만, 경쟁 분석은 차별화가 핵심일 때만, 고객 언어 조사는 설득력이 핵심일 때만 넣습니다.",
  "검토 기준은 이 요청의 독자가 결과를 거절할 이유에서 출발한 구체적인 문장으로 씁니다.",
].join("\n");

export function plannerPrompt(opts: { toolName: string; intentText: string; strategyText: string; webSearch: boolean }): string {
  return [
    `도구: ${opts.toolName}`,
    "",
    opts.intentText,
    "",
    opts.strategyText,
    "",
    "[쓸 수 있는 작업]",
    ...(opts.webSearch ? Object.entries(RESEARCH).map(([id, r]) => `- ${id}: ${r.name} — 언제: ${r.when}`) : ["- (이 도구는 웹 조사를 쓰지 않습니다)"]),
    "- 초안 작성 → 검토 ⇄ 고쳐 쓰기 → 마무리 (항상)",
  ].join("\n");
}

export interface PlanChoice {
  research: string[];
  revisions: number;
  criticFocus: string[];
  reason: string;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parsePlanChoice(raw: unknown, webSearch: boolean): PlanChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const revisions = Math.round(Number(r.revisions));
  if (!Number.isFinite(revisions)) return null;
  const research = webSearch && Array.isArray(r.research) ? [...new Set(r.research.filter((x): x is string => typeof x === "string" && x in RESEARCH))].slice(0, 3) : [];
  return {
    research,
    revisions: Math.max(1, Math.min(2, revisions)),
    criticFocus: Array.isArray(r.critic_focus) ? r.critic_focus.map((x) => str(x, 200)).filter(Boolean).slice(0, 4) : [],
    reason: str(r.reason, 240),
  };
}

const isResearch = (s: PlanStep) => s.capability in RESEARCH;

/**
 * The default plan reshaped by the choice: the chosen research steps
 * replace the default's, and the critique step carries the revision budget
 * and the focus. Everything before and after stays as in the default.
 */
export function buildPlan(base: Plan, choice: PlanChoice): Plan {
  const firstResearch = base.steps.findIndex(isResearch);
  const draftAt = base.steps.findIndex((s) => s.capability === "write_draft");
  const insertAt = firstResearch >= 0 ? firstResearch : draftAt >= 0 ? draftAt : base.steps.length;
  const research: PlanStep[] = choice.research.map((id) => ({ id: RESEARCH[id].stepId, capability: id }));
  const rest = base.steps.filter((s) => !isResearch(s));
  const head = rest.slice(0, insertAt);
  const tail = rest.slice(insertAt).map((s) =>
    s.capability === "critique_output" ? { ...s, args: { ...s.args, maxRevisions: choice.revisions, focus: choice.criticFocus } } : s,
  );
  return { ...base, source: "planner", reason: choice.reason || undefined, steps: [...head, ...research, ...tail] };
}

/** Problems that make a plan unsafe to run (empty = valid). */
export function validatePlan(plan: Plan, known: Set<string>): string[] {
  const errors: string[] = [];
  if (plan.steps.length === 0) errors.push("no steps");
  if (plan.steps.length > MAX_STEPS) errors.push("too many steps");
  const ids = new Set<string>();
  for (const s of plan.steps) {
    if (ids.has(s.id)) errors.push(`duplicate step ${s.id}`);
    ids.add(s.id);
    if (!known.has(s.capability)) errors.push(`unknown capability ${s.capability}`);
  }
  const last = plan.steps[plan.steps.length - 1];
  if (last && !TERMINAL.has(last.capability)) errors.push("does not end in a finishing step");
  const caps = plan.steps.map((s) => s.capability);
  if (caps.includes("revise_output") && !caps.includes("critique_output")) errors.push("revision without critique");
  if (caps.includes("critique_output") && !caps.includes("write_draft")) errors.push("critique without draft");
  return errors;
}

/** One line for the timeline: "경쟁·대안 분석 → 초안 → 검토(최대 2회 고침)". */
export function planLabel(plan: Plan, lang: "ko" | "en" = "ko"): string {
  const EN: Record<string, string> = { research_topic: "Topic research", analyze_competitors: "Competitor analysis", research_audience: "Customer language" };
  const parts: string[] = [];
  for (const s of plan.steps) {
    const n = Number(s.args?.maxRevisions ?? 2);
    if (s.capability in RESEARCH) parts.push(lang === "en" ? EN[s.capability] : RESEARCH[s.capability].name);
    else if (s.capability === "write_draft") parts.push(lang === "en" ? "Draft" : "초안");
    else if (s.capability === "critique_output") parts.push(lang === "en" ? `Review (up to ${n} rewrite${n > 1 ? "s" : ""})` : `검토(최대 ${n}회 고침)`);
  }
  return parts.join(" → ");
}
