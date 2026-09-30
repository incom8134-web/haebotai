// Intent layer (docs/ai-architecture-proposal.md §3.2): before any work,
// read the request into a working understanding — what it is for, who
// it's for, the tone, what must be in it — and list what is unknown.
// Unknowns get a sensible assumption; only a CRITICAL one (the answer
// would change the whole result and no default is reasonable) may become
// a question to the member, at most three, each with a default so
// "그냥 진행" always works.
//
// Pure logic (tested); the model call is lib/agents/calls.ts.

import type { Intent, Question } from "./types.ts";
import type { RequestBrief } from "../tools/request-brief.ts";

export const MAX_QUESTIONS = 3;

export const INTENT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "결과물이 누구·무엇을 위한 것인지: 요청에 적힌 상호·제품·프로젝트 이름 그대로. 요청에 없고 프로필이 해당되면 프로필의 브랜드명, 둘 다 없으면 빈 문자열" },
    uses_profile: { type: "boolean", description: "저장된 비즈니스 프로필이 이번 요청의 대상과 같은 사업이면 true. 다른 가게·고객사·지인·새 프로젝트·일반 주제면 false. 요청에 대상이 따로 없으면 true" },
    kind: { type: "string", description: "이 요청이 정확히 어떤 종류의 결과물인지 한 구절 (예: 고급 법률사무소의 상담 예약용 사이트, 시드 투자 IR 덱, 동네 카페 창업 자금용 사업계획서)" },
    audience: { type: "array", items: { type: "string" }, maxItems: 4, description: "결과물을 보고 판단할 사람들 (짧게)" },
    goal: { type: "string", description: "결과물이 이뤄야 할 한 가지 목적 (예: 상담 예약, 투자 유치, 대출 심사 통과)" },
    positioning: { type: "string", description: "요청에서 읽히는 포지셔닝·차별점. 없으면 빈 문자열" },
    tone_words: { type: "string", description: "결과물의 톤을 한국어 형용사 2~5개로" },
    formality: { type: "string", enum: ["formal", "neutral", "casual"] },
    energy: { type: "string", enum: ["calm", "balanced", "energetic"] },
    must_include: { type: "array", items: { type: "string" }, maxItems: 10, description: "요청에 적혀 있어 결과에 반드시 들어가야 할 요소 (사용자 표현 그대로)" },
    avoid: { type: "array", items: { type: "string" }, maxItems: 6, description: "이 요청과 어울리지 않아 피해야 할 톤·스타일·내용" },
    unknowns: {
      type: "array",
      maxItems: 6,
      description: "결과를 좌우하지만 요청에 없는 정보. 각 항목마다 합리적인 기본 가정을 적으세요",
      items: {
        type: "object",
        properties: {
          item: { type: "string" },
          critical: { type: "boolean", description: "답에 따라 결과 전체가 완전히 달라지고, 합리적인 기본 가정이 없을 때만 true. 대부분은 false" },
          assumption: { type: "string", description: "묻지 않고 진행할 때 쓸 작업 방식의 가정. 사업에 관한 사실(시설, 혜택, 가격, 위치, 수치)이면 '사실로 쓰지 않고 [입력 필요]로 표시'" },
        },
        required: ["item", "critical", "assumption"],
      },
    },
    questions: {
      type: "array",
      maxItems: MAX_QUESTIONS,
      description: "critical인 미지 항목에 대해서만 짧은 질문. 요청이 충분하면 빈 배열",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "짧고 구체적인 질문 (한국어)" },
          options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "고를 수 있는 답 2~4개" },
          default_index: { type: "integer", description: "건너뛸 때 쓸 답의 번호 (0부터)" },
        },
        required: ["question", "options", "default_index"],
      },
    },
    summary: { type: "string", description: "이해한 요청 한 문장 (예: 강남 이혼 전문 법률사무소의 신뢰 중심 상담 예약 사이트)" },
  },
  required: ["subject", "uses_profile", "kind", "audience", "goal", "positioning", "tone_words", "formality", "energy", "must_include", "avoid", "unknowns", "questions", "summary"],
} as const;

export const INTENT_SYSTEM = [
  "당신은 시니어 크리에이티브 디렉터이자 전략가입니다. 작업을 시작하기 전에 요청을 읽고, 무엇을 누구를 위해 왜 만드는지, 어떤 톤이어야 하는지, 무엇이 반드시 들어가야 하는지 정리합니다.",
  "요청에 적힌 대상이 저장된 프로필과 다른 사업·프로젝트라면 프로필은 이번 작업과 무관합니다.",
  "모르는 것은 unknowns에 적고 가정을 붙이되, 가정은 작업 방식(분량, 형식, 강조점, 채널, 대상의 범위)에 대해서만 세우세요. 사업에 관한 사실(시설, 위치·거리, 혜택·이벤트, 가격, 경력·연혁, 인증, 수치, 후기)은 절대 가정하지 마세요 — 그런 항목의 assumption은 '사실로 쓰지 않고 [입력 필요]로 표시'입니다.",
  "질문은 최후의 수단입니다. 답에 따라 결과 전체가 완전히 달라지고 기본 가정이 합리적이지 않은 경우에만, 최대 3개까지 짧게 물으세요. 요청이 짧더라도 좋은 기본값이 있으면 묻지 말고 가정하세요. 이미 답이 주어진 것은 다시 묻지 마세요.",
].join("\n");

export function intentPrompt(opts: { toolName: string; requestText: string; profileText: string; answers?: { question: string; answer: string }[] }): string {
  return [
    `도구: ${opts.toolName}`,
    "",
    "[사용자 요청]",
    opts.requestText || "(입력 없음)",
    "",
    "[계정에 저장된 비즈니스 프로필]",
    opts.profileText || "(없음)",
    ...(opts.answers?.length ? ["", "[사용자가 이미 답한 질문 — 다시 묻지 마세요]", ...opts.answers.map((a) => `- ${a.question} → ${a.answer}`)] : []),
  ].join("\n");
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, n: number, max = 120) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);

/** Validates the model's answer. Questions survive only when a critical unknown backs them. */
export function parseIntent(raw: unknown): { intent: Intent; questions: Question[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const tone = str(r.tone_words, 120);
  if (!tone) return null;
  const unknowns = Array.isArray(r.unknowns)
    ? r.unknowns
        .map((u) => (u && typeof u === "object" ? (u as Record<string, unknown>) : {}))
        .map((u) => ({ item: str(u.item, 120), critical: u.critical === true, assumption: str(u.assumption, 200) }))
        .filter((u) => u.item)
        .slice(0, 6)
    : [];
  const intent: Intent = {
    subject: str(r.subject, 80),
    usesProfile: r.uses_profile !== false,
    kind: str(r.kind, 160),
    audience: strs(r.audience, 4),
    goal: str(r.goal, 160),
    positioning: str(r.positioning, 200),
    tone: { words: tone, formality: pick(r.formality, ["formal", "neutral", "casual"] as const, "neutral"), energy: pick(r.energy, ["calm", "balanced", "energetic"] as const, "balanced") },
    mustInclude: strs(r.must_include, 10, 160),
    avoid: strs(r.avoid, 6),
    unknowns,
    summary: str(r.summary, 160),
  };
  const hasCritical = unknowns.some((u) => u.critical);
  const questions: Question[] = hasCritical && Array.isArray(r.questions)
    ? r.questions
        .map((q) => (q && typeof q === "object" ? (q as Record<string, unknown>) : {}))
        .map((q, i) => {
          const options = strs(q.options, 4, 80);
          const d = typeof q.default_index === "number" && Number.isInteger(q.default_index) ? q.default_index : 0;
          return { id: `q${i + 1}`, question: str(q.question, 160), options, defaultIndex: d >= 0 && d < options.length ? d : 0, allowFreeText: true };
        })
        .filter((q) => q.question && q.options.length >= 2)
        .slice(0, MAX_QUESTIONS)
    : [];
  return { intent, questions };
}

/** What a skipped question resolves to: its default option. */
export function resolveAnswers(questions: Question[], given: Record<string, string>): { question: string; answer: string }[] {
  return questions.map((q) => {
    const a = (given[q.id] ?? "").trim().slice(0, 200);
    return { question: q.question, answer: a || q.options[q.defaultIndex] || q.options[0] };
  });
}

/** The request-analysis block every prompt already reads (lib/tools/request-brief.ts), from an intent. */
export function intentToBrief(intent: Intent, direction: RequestBrief["direction"] = null, directionReason = ""): RequestBrief {
  return {
    subject: intent.subject,
    usesProfile: intent.usesProfile,
    tone: intent.tone.words,
    audience: intent.audience.join(", "),
    formality: intent.tone.formality,
    energy: intent.tone.energy,
    avoid: intent.avoid,
    direction,
    directionReason,
  };
}

/** The rest of the understanding: kind, goal, positioning, must-haves, assumptions and the member's answers. */
export function intentBlock(intent: Intent, answers: { question: string; answer: string }[] = []): string {
  // A critical unknown the member answered is replaced by the answer.
  const assumptions = intent.unknowns.filter((u) => u.assumption && !(u.critical && answers.length));
  return [
    "[이해한 요청]",
    intent.summary ? `- 한 줄 요약: ${intent.summary}` : "",
    intent.kind ? `- 결과물의 종류: ${intent.kind}` : "",
    intent.goal ? `- 목적: ${intent.goal}` : "",
    intent.audience.length ? `- 판단할 사람: ${intent.audience.join(", ")}` : "",
    intent.positioning ? `- 포지셔닝: ${intent.positioning}` : "",
    intent.mustInclude.length ? `- 반드시 담을 것: ${intent.mustInclude.join(" / ")}` : "",
    ...answers.map((a) => `- 사용자 답변 — ${a.question}: ${a.answer}`),
    assumptions.length ? `- 작업 방식의 가정(요청에 없어 이렇게 진행): ${assumptions.map((u) => `${u.item} → ${u.assumption}`).join(" / ")}` : "",
    "- 요청·참고 자료에 없는 사업의 사실(시설, 혜택, 가격, 위치, 경력, 실적 수치, 후기)은 결과에 사실처럼 쓰지 마세요. 꼭 필요하면 [입력 필요: …]로 남깁니다. 단, 계획의 추정치(재무 가정, 목표, 예상 효과)는 '가정'·'목표'로 밝히고 근거와 함께 제시하는 것이 맞습니다.",
  ]
    .filter(Boolean)
    .join("\n");
}
