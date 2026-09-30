// Request analysis: the step that makes every tool follow the request
// instead of a house pattern. Before generating, a fast model reads the
// user's input (and their saved business profile) and decides:
//   - what the work is for (the business/project named in the request),
//   - whether the saved profile is even about that — a request for a
//     friend's café or a client project must not come out wearing the
//     account's own brand name, colours or tone,
//   - the tone the result should have (formality, energy, what to avoid),
//   - which of the tool's creative directions fits that tone — or none.
// Directions used to be picked at random for variety, which put a
// playful sticker look on a law office. Variety now comes from the
// requests themselves; recently used directions only break ties.
// Pure logic lives here (tested); the model call is lib/ai/brief.ts.

import type { Direction } from "./directions.ts";

export interface RequestBrief {
  /** The business or project the result is for, as the user named it ("" if not named). */
  subject: string;
  /** Whether the saved business profile describes that subject. */
  usesProfile: boolean;
  /** 2–5 words describing the fitting tone. */
  tone: string;
  audience: string;
  formality: "formal" | "neutral" | "casual";
  energy: "calm" | "balanced" | "energetic";
  /** Styles or tones that would clash with this request. */
  avoid: string[];
  /** The chosen creative direction, or null when none fits. */
  direction: Direction | null;
  directionReason: string;
}

export function briefSchema(directionIds: string[]) {
  return {
    type: "object",
    properties: {
      subject: { type: "string", description: "결과물이 누구·무엇을 위한 것인지: 요청에 적힌 상호·제품·프로젝트 이름 그대로. 요청에 없고 프로필이 해당되면 프로필의 브랜드명, 둘 다 없으면 빈 문자열" },
      uses_profile: { type: "boolean", description: "저장된 비즈니스 프로필이 이번 요청의 대상과 같은 사업이면 true. 요청이 다른 가게·고객사·지인·새 프로젝트·일반 주제를 다루면 false. 요청에 대상이 따로 없으면 true" },
      tone: { type: "string", description: "이 요청에 맞는 결과물의 톤을 한국어 형용사 2~5개로 (예: 차분하고 신뢰감 있는, 격식 있는)" },
      audience: { type: "string", description: "결과물을 보게 될 사람 (한국어, 짧게)" },
      formality: { type: "string", enum: ["formal", "neutral", "casual"] },
      energy: { type: "string", enum: ["calm", "balanced", "energetic"] },
      avoid: { type: "array", items: { type: "string" }, maxItems: 5, description: "이 요청과 어울리지 않아 피해야 할 톤·스타일 (한국어)" },
      direction_id: { type: "string", enum: [...directionIds, ""], description: "톤·업종·목적·청중에 가장 잘 맞는 창작 방향 id. 어울리는 것이 없으면 빈 문자열" },
      direction_reason: { type: "string", description: "그 방향을 고른 이유 한 문장 (한국어)" },
    },
    required: ["subject", "uses_profile", "tone", "audience", "formality", "energy", "avoid", "direction_id", "direction_reason"],
  } as const;
}

export function briefPrompt(opts: { toolName: string; requestText: string; profileText: string; directions: Direction[]; recentIds: string[] }): string {
  const lines = [
    `도구: ${opts.toolName}`,
    "",
    "[사용자 요청]",
    opts.requestText || "(입력 없음)",
    "",
    "[계정에 저장된 비즈니스 프로필]",
    opts.profileText || "(없음)",
  ];
  if (opts.directions.length) {
    lines.push(
      "",
      "[이 도구의 창작 방향 후보]",
      ...opts.directions.map((d) => `- ${d.id}: ${d.name} — ${d.brief}`),
      "",
      "요청의 톤·업종·목적·청중에 실제로 어울리는 방향만 고르세요. 어울리지 않는 방향(예: 법률·의료·장례·금융에 장난스러운 스타일, 럭셔리 브랜드에 싸구려 느낌)은 절대 고르지 마세요. 사용자가 요청에서 스타일을 직접 정했다면 그와 같은 방향을, 맞는 것이 없으면 빈 문자열을 고르세요.",
      opts.recentIds.length ? `여러 방향이 똑같이 잘 맞을 때만, 최근에 쓴 방향(${opts.recentIds.join(", ")})은 피하세요. 가장 잘 맞는 것이 최근에 쓴 방향이면 그대로 고르세요.` : "",
    );
  }
  return lines.filter((l) => l !== "").length ? lines.join("\n") : "";
}

export const BRIEF_SYSTEM =
  "당신은 크리에이티브 디렉터입니다. 작업을 시작하기 전에 사용자의 요청을 읽고, 결과물이 누구를 위한 것인지, 어떤 톤이어야 하는지, 어떤 방향이 어울리는지 판단합니다. 요청에 적힌 대상이 저장된 프로필과 다른 사업·프로젝트라면 프로필은 이번 작업과 무관하다고 판단하세요. 추측으로 사실을 만들지 말고, 요청에 적힌 표현을 존중하세요.";

/** Validates the model's answer against the tool's directions. */
export function parseBrief(raw: unknown, directions: Direction[]): RequestBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const tone = str(r.tone);
  if (!tone) return null;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
  const direction = directions.find((d) => d.id === str(r.direction_id)) ?? null;
  return {
    subject: str(r.subject).slice(0, 80),
    usesProfile: r.uses_profile !== false,
    tone: tone.slice(0, 120),
    audience: str(r.audience).slice(0, 120),
    formality: pick(r.formality, ["formal", "neutral", "casual"] as const, "neutral"),
    energy: pick(r.energy, ["calm", "balanced", "energetic"] as const, "balanced"),
    avoid: Array.isArray(r.avoid) ? r.avoid.map(str).filter(Boolean).slice(0, 5) : [],
    direction,
    directionReason: str(r.direction_reason).slice(0, 200),
  };
}

const FORMALITY: Record<RequestBrief["formality"], string> = { formal: "격식 있게", neutral: "담백하게", casual: "편하고 친근하게" };
const ENERGY: Record<RequestBrief["energy"], string> = { calm: "차분하고 절제된 호흡", balanced: "균형 잡힌 호흡", energetic: "에너지 있고 역동적인 호흡" };

/** The block every tool's prompt gets: who it's for, the tone, and the chosen direction. */
export function briefBlock(b: RequestBrief): string {
  const lines = [
    "[요청 분석 — 결과물 전체가 따라야 할 기준]",
    b.subject ? `- 대상: ${b.subject}${b.usesProfile ? "" : " (계정의 저장 프로필과 다른 사업·프로젝트입니다. 프로필의 브랜드명·색·톤·업종을 섞지 마세요)"}` : "",
    `- 톤: ${b.tone} — ${FORMALITY[b.formality]}, ${ENERGY[b.energy]}`,
    b.audience ? `- 보는 사람: ${b.audience}` : "",
    b.avoid.length ? `- 피할 것: ${b.avoid.join(", ")}` : "",
    "문장, 구성, 색, 이미지, 움직임까지 모든 선택이 이 톤과 대상에 맞아야 합니다. 도구의 기본 패턴이나 이전 결과의 스타일을 반복하지 말고 이 요청에서 출발하세요.",
  ];
  if (b.direction) {
    lines.push("", `[이 요청의 톤에 맞춰 고른 창작 방향: ${b.direction.name}]`, b.direction.brief, b.directionReason ? `고른 이유: ${b.directionReason}` : "", "이 방향을 따르되, 사용자가 입력한 조건·사실 규칙·참고 자료 지시와 충돌하면 그쪽을 우선하세요.");
  }
  return lines.filter(Boolean).join("\n");
}
