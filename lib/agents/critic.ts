// Critic layer (docs/ai-architecture-proposal.md §3.5): a separate
// reviewer that reads the draft against the request, the chosen strategy
// and its rubric, and returns a prioritised critique — it never rewrites.
// The reviser (a different call) acts on it and may restructure. The loop
// is bounded and keeps the best-scoring version, so a revision can't make
// the result worse.
//
// Pure logic (tested); the model call is lib/agents/calls.ts.

import type { Critique, CritiqueIssue, Strategy } from "./types.ts";

/** A draft at or above this with no high-severity issue ships as is. */
export const PASS_SCORE = 82;

export const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100, description: "이 요청과 완성 기준에 비춘 점수. 80 이상은 그대로 전달해도 부끄럽지 않은 수준" },
    issues: {
      type: "array",
      maxItems: 8,
      description: "고칠 점, 중요한 순서대로. 사소한 표현 취향은 빼세요",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          type: { type: "string", enum: ["structure", "generic", "fact", "tone", "hierarchy", "cta", "missing", "repetition", "design", "other"] },
          where: { type: "string", description: "어느 부분 (섹션·장·슬라이드·필드 이름)" },
          problem: { type: "string", description: "무엇이 왜 문제인지 구체적으로" },
          fix: { type: "string", description: "어떻게 고칠지 구체적으로 (구조를 바꾸라는 지시도 가능)" },
        },
        required: ["severity", "type", "where", "problem", "fix"],
      },
    },
    strengths: { type: "array", items: { type: "string" }, maxItems: 4, description: "수정할 때 반드시 지켜야 할 좋은 점" },
  },
  required: ["score", "issues", "strengths"],
} as const;

export const CRITIC_SYSTEM = [
  "당신은 까다로운 시니어 검토자입니다. 초안을 직접 고치지 않고, 요청·전략·완성 기준에 비춰 무엇이 부족한지만 판정합니다.",
  "다음을 특히 봅니다: 요청과 전략에서 벗어난 구조, 어느 가게에나 쓸 수 있는 뻔한 문장, 톤 불일치, 정보 위계와 행동 유도(CTA)의 약함, 반드시 담을 것의 누락, 반복.",
  "사실 점검이 가장 중요합니다: [요청 원문]과 검색 근거에 없는 사업의 사실(시설·설비, 혜택·이벤트, 가격, 위치·거리, 경력·연혁, 인증, 수치, 후기)이 단정적으로 쓰였으면 type fact, severity high로 하나하나 지적하고, fix는 '삭제하거나 [입력 필요: …]로 바꾸기'입니다. [입력 필요]·[확인 필요]로 표시된 것과, 가정·목표·추정으로 밝힌 계획 수치(재무 가정 등)는 날조가 아닙니다. 반대로 계획서에 필요한 추정치를 0이나 빈칸으로 둔 것은 missing으로 지적하세요.",
  "점수는 냉정하게 매기세요. 문제가 없으면 억지로 만들지 마세요.",
].join("\n");

export function criticPrompt(opts: {
  toolName: string;
  intentText: string;
  requestText?: string;
  strategy: Strategy | null;
  draft: string;
  sameness?: string;
  /** What the planner asked the critic to check hardest for this request. */
  focus?: string[];
  /** The obvious default the strategist named and rejected: the template detector's reference. */
  avoidDefault?: { name: string; summary: string } | null;
}): string {
  return [
    `도구: ${opts.toolName}`,
    "",
    opts.intentText,
    "",
    ...(opts.requestText ? ["[요청 원문 — 사업에 관한 사실은 여기와 검색 근거에 있는 것만 쓸 수 있습니다]", opts.requestText, ""] : []),
    ...(opts.strategy
      ? [
          `[선택한 전략: ${opts.strategy.chosen}]`,
          "[설계도]",
          ...opts.strategy.blueprint.map((b, i) => `${i + 1}. ${b.part} — ${b.purpose}`),
          "[완성 기준]",
          ...opts.strategy.rubric.map((r) => `- ${r}`),
          "",
        ]
      : []),
    ...(opts.focus?.length ? ["[이번 요청에서 특히 볼 것]", ...opts.focus.map((f) => `- ${f}`), ""] : []),
    ...(opts.avoidDefault
      ? [
          `[템플릿 점검] 이 요청에 AI가 흔히 내놓는 뻔한 기본안은 '${opts.avoidDefault.name}'(${opts.avoidDefault.summary})이고, 전략은 이를 피하기로 했습니다. 초안의 구성·흐름·형식이 그 기본안이나 도구의 기본 목차를 닮았다면 type structure, severity high로 지적하고, 무엇을 어떻게 바꿀지 구체적으로 쓰세요.`,
          "",
        ]
      : []),
    ...(opts.sameness ? [opts.sameness, ""] : []),
    "[검토할 초안]",
    opts.draft,
  ].join("\n");
}

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const SEVERITY = ["high", "medium", "low"] as const;
const TYPES = ["structure", "generic", "fact", "tone", "hierarchy", "cta", "missing", "repetition", "design", "other"] as const;

export function parseCritique(raw: unknown): Critique | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score))));
  if (!Number.isFinite(score)) return null;
  const issues: CritiqueIssue[] = Array.isArray(r.issues)
    ? r.issues
        .map((i) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {}))
        .map((i) => ({
          severity: SEVERITY.includes(i.severity as (typeof SEVERITY)[number]) ? (i.severity as CritiqueIssue["severity"]) : "medium",
          type: TYPES.includes(i.type as (typeof TYPES)[number]) ? (i.type as CritiqueIssue["type"]) : "other",
          where: str(i.where, 120),
          problem: str(i.problem),
          fix: str(i.fix),
        }))
        .filter((i) => i.problem)
        .slice(0, 8)
    : [];
  const order = { high: 0, medium: 1, low: 2 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  const verdict = score >= PASS_SCORE && !issues.some((i) => i.severity === "high") ? "pass" : "revise";
  return { score, verdict, issues, strengths: Array.isArray(r.strengths) ? r.strengths.map((s) => str(s, 200)).filter(Boolean).slice(0, 4) : [] };
}

/** The block the reviser gets: the critique, what to keep, and licence to restructure. */
export function revisionBlock(c: Critique): string {
  return [
    `[검토 결과 — 점수 ${c.score}/100. 아래 문제를 모두 고친 개선판을 처음부터 다시 쓰세요]`,
    ...c.issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.where}: ${i.problem} → ${i.fix}`),
    c.strengths.length ? `지킬 것: ${c.strengths.join(" / ")}` : "",
    "구조가 문제라면 섹션·장·슬라이드의 순서와 구성을 과감히 바꿔도 됩니다. 문장만 다듬는 수정은 안 됩니다. 입력에 없는 사실은 여전히 만들지 마세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The version to ship: the highest score; ties go to the later (revised) one. */
export function pickBest<T>(versions: { value: T; score: number | null }[]): T {
  let best = versions[0];
  for (const v of versions.slice(1)) {
    if ((v.score ?? -1) >= (best.score ?? -1)) best = v;
  }
  return best.value;
}

/** Keeps a draft short enough for the critic (the start and end matter most). */
export function clip(text: string, max = 60_000): string {
  if (text.length <= max) return text;
  const half = Math.floor(max / 2);
  return `${text.slice(0, half)}\n…(중략)…\n${text.slice(-half)}`;
}
