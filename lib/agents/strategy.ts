// Strategy layer (docs/ai-architecture-proposal.md §3.3): decide HOW to
// solve this request before writing anything. The strategist weighs at
// least three materially different approaches — from the agent's library
// (lib/agents/library.ts) or its own — scores their fit against the
// understood request, picks one, and turns it into a blueprint (the
// structure for THIS request), a rubric (what great means here; the
// critic's checklist) and what to emphasise or leave out. The creative
// language (lib/tools/directions.ts) is chosen in the same step, so tone,
// structure and style come from one decision.
//
// Pure logic (tested); the model call is lib/agents/calls.ts.

import type { Direction } from "../tools/directions.ts";
import type { AgentGuide } from "./library.ts";
import { clashes, normalizeCoords, spacePrompt, type Domain } from "./space.ts";
import type { Strategy } from "./types.ts";

export const MIN_CONSIDERED = 3;

export function strategySchema(approachIds: string[], directionIds: string[], domain?: Domain) {
  const dims = domain?.dimensions ?? [];
  const coords = dims.length
    ? {
        coords: {
          type: "array",
          items: { type: "string" },
          minItems: dims.length,
          maxItems: dims.length,
          description: `전략 공간에서의 위치, 이 순서대로 값 하나씩: ${dims.map((d) => d.id).join(", ")}`,
        },
        obvious_default: { type: "boolean", description: "이 후보가 이런 요청에 AI가 보통 내놓는 뻔한 기본 구성이면 true (후보 중 정확히 하나)" },
      }
    : {};
  return {
    type: "object",
    properties: {
      considered: {
        type: "array",
        minItems: MIN_CONSIDERED,
        maxItems: 4,
        description: "서로 구조·설득 방식·강조점이 실제로 다른 접근 3~4개. 같은 접근의 말만 바꾼 변형은 안 됩니다",
        items: {
          type: "object",
          properties: {
            approach_id: { type: "string", enum: [...approachIds, "custom"], description: "라이브러리의 접근 id, 새로 만든 접근이면 custom" },
            name: { type: "string", description: "접근의 이름 (한국어, 짧게)" },
            summary: { type: "string", description: "이 접근으로 만들면 결과가 어떤 구조·흐름이 되는지 한두 문장" },
            fit: { type: "integer", minimum: 1, maximum: 10, description: "이 요청(목적·청중·톤·반드시 담을 것)에 맞는 정도" },
            why: { type: "string", description: "점수의 이유 한 문장: 이 요청의 무엇 때문에 맞거나 안 맞는지" },
            ...coords,
          },
          required: ["approach_id", "name", "summary", "fit", "why", ...(dims.length ? ["coords", "obvious_default"] : [])],
        },
      },
      chosen_index: { type: "integer", description: "고른 접근의 번호 (considered에서 0부터)" },
      rationale: { type: "string", description: "그 접근을 고른 이유 두세 문장. 다른 후보보다 나은 점을 이 요청의 사실로 설명" },
      direction_id: { type: "string", enum: [...directionIds, "custom", ""], description: "창작 방향(시각·언어 스타일) id. 목록에 맞는 게 없으면 custom, 이 도구에 해당 없으면 빈 문자열" },
      direction_brief: { type: "string", description: "이 결과물의 시각·언어 스타일을 두세 문장으로 (톤에서 출발). custom이면 새로 정의" },
      blueprint: {
        type: "array",
        minItems: 3,
        maxItems: 16,
        description: "고른 접근을 이 요청에 맞게 펼친 구조, 순서대로. 각 부분이 무엇을 증명·전달하는지",
        items: {
          type: "object",
          properties: {
            part: { type: "string", description: "부분의 이름 (섹션·장·슬라이드·컷)" },
            purpose: { type: "string", description: "이 부분이 독자에게 이루는 것" },
            notes: { type: "string", description: "담을 구체 내용·형식 (입력에 있는 사실만, 없으면 가정이라고 표시)" },
          },
          required: ["part", "purpose", "notes"],
        },
      },
      rubric: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 7, description: "이 요청에서 '훌륭한 결과'의 기준. 검토자가 체크할 구체 문장" },
      emphasize: { type: "array", items: { type: "string" }, maxItems: 5 },
      omit: { type: "array", items: { type: "string" }, maxItems: 5, description: "이 요청에는 필요 없어 과감히 뺄 것 (도구의 기본 구성 중에서도)" },
      ...(dims.length ? { default_reason: { type: "string", description: "뻔한 기본안을 골랐을 때만: 이 요청이 왜 정말 그것을 요구하는지. 아니면 빈 문자열" } } : {}),
    },
    required: ["considered", "chosen_index", "rationale", "direction_id", "direction_brief", "blueprint", "rubric", "emphasize", "omit", ...(dims.length ? ["default_reason"] : [])],
  } as const;
}

export const STRATEGY_SYSTEM = [
  "당신은 이 분야의 최고 수준 전략가입니다. 결과물을 만들기 전에, 이 요청을 푸는 서로 다른 접근을 최소 3개 검토하고 가장 잘 맞는 하나를 고른 뒤 이 요청만을 위한 설계도를 만듭니다.",
  "접근은 구조·설득 방식·강조점이 실제로 달라야 합니다. 업종의 뻔한 템플릿이나 도구의 기본 목차를 그대로 따르지 말고, 이 요청의 목적·청중·톤·반드시 담을 것에서 출발하세요.",
  "선택은 적합도로만 합니다. 무작위로 고르지 말고, 최근 결과와 비슷하다는 이유만으로 더 잘 맞는 접근을 버리지 마세요. 여러 접근이 똑같이 잘 맞을 때만 최근에 쓰지 않은 쪽을 고르세요.",
  "설계도에는 입력에 없는 사실(수치, 후기, 수상, 경력)을 만들어 넣지 마세요. 필요하면 '가정' 또는 '[입력 필요]'로 표시합니다.",
  "창작 예산: 고르기 전에 실제로 서로 다른 최소 3개의 길을 끝까지 상상해 보세요. 그중 하나는 뻔한 기본안이어야 하고, 기본안은 요청이 정말 그것을 요구할 때만 이깁니다.",
].join("\n");

export function strategyPrompt(opts: {
  toolName: string;
  guide: AgentGuide;
  directions: Direction[];
  intentText: string;
  requestText: string;
  recent: string[];
  override: string | null;
  extra?: string;
  domain?: Domain;
  /** Recent positions in the space (same tool), for the strategist to avoid repeating without reason. */
  recentCoords?: string[][];
  /** A retry: what was wrong with the first answer. */
  retry?: string;
}): string {
  const { guide } = opts;
  return [
    `도구: ${opts.toolName}`,
    `이 도구의 목표: ${guide.objective}`,
    "",
    opts.intentText,
    "",
    "[요청 원문]",
    opts.requestText || "(입력 없음)",
    "",
    "[이번에 정해야 할 것]",
    ...guide.decide.map((d) => `- ${d}`),
    "",
    "[접근 라이브러리 — 참고용, 더 잘 맞는 접근이 있으면 custom으로 새로 만드세요]",
    ...guide.approaches.map((a) => `- ${a.id}: ${a.name} — 언제: ${a.when} / 구조: ${a.structure}`),
    ...(opts.domain ? ["", spacePrompt(opts.domain)] : []),
    ...(opts.domain && opts.recentCoords?.length
      ? ["", `[이 사용자의 최근 결과가 놓였던 위치 — 이번 요청이 이어서 같은 것을 원하지 않는 한 반복하지 마세요] ${opts.recentCoords.map((c) => c.join("/")).join(" · ")}`]
      : []),
    ...(opts.directions.length ? ["", "[창작 방향 — 시각·언어 스타일]", ...opts.directions.map((d) => `- ${d.id}: ${d.name} — ${d.brief}`)] : []),
    ...(opts.recent.length ? ["", `[이 사용자의 최근 결과에 쓰인 전략 — 동점일 때만 피하세요] ${opts.recent.join(" / ")}`] : []),
    ...(opts.override ? ["", `[사용자 요청] 이번에는 이전과 다른 전략으로 만들어 달라고 했습니다. 이전 전략: "${opts.override}". 이것과 구조가 확실히 다른 접근을 고르세요.`] : []),
    ...(opts.extra ? ["", opts.extra] : []),
    ...(opts.retry ? ["", `[다시 작성] 첫 답에 문제가 있었습니다: ${opts.retry}`] : []),
  ].join("\n");
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, n: number, max = 200) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** Validates the strategist's answer; also returns the creative direction it chose (for the prompts' [요청 분석] block). */
export function parseStrategy(raw: unknown, guide: AgentGuide, directions: Direction[], domain?: Domain): { strategy: Strategy; direction: Direction | null } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const considered = Array.isArray(r.considered)
    ? r.considered
        .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
        .map((c) => ({
          id: str(c.approach_id, 40),
          name: str(c.name, 60),
          summary: str(c.summary, 300),
          fit: Math.max(1, Math.min(10, Math.round(Number(c.fit) || 1))),
          why: str(c.why, 240),
          ...(domain ? { coords: normalizeCoords(c.coords, domain), isDefault: c.obvious_default === true } : {}),
        }))
        .filter((c) => c.name)
    : [];
  if (considered.length === 0) return null;
  const blueprint = Array.isArray(r.blueprint)
    ? r.blueprint
        .map((b) => (b && typeof b === "object" ? (b as Record<string, unknown>) : {}))
        .map((b) => ({ part: str(b.part, 80), purpose: str(b.purpose, 200), notes: str(b.notes, 400) }))
        .filter((b) => b.part)
        .slice(0, 16)
    : [];
  if (blueprint.length === 0) return null;
  const idx = typeof r.chosen_index === "number" && r.chosen_index >= 0 && r.chosen_index < considered.length ? Math.floor(r.chosen_index) : considered.reduce((best, c, i) => (c.fit > considered[best].fit ? i : best), 0);
  const chosen = considered[idx];
  const libraryId = guide.approaches.some((a) => a.id === chosen.id) ? chosen.id : undefined;
  const dirId = str(r.direction_id, 40);
  const briefText = str(r.direction_brief, 500);
  const fromPool = directions.find((d) => d.id === dirId) ?? null;
  const direction: Direction | null = fromPool
    ? { ...fromPool, brief: briefText ? `${fromPool.brief} ${briefText}` : fromPool.brief }
    : briefText && dirId !== ""
      ? { id: "custom", name: chosen.name, brief: briefText }
      : null;
  return {
    strategy: {
      considered: considered.map(({ name, summary, fit, why, ...rest }) => ({ name, summary, fit, why, ...("coords" in rest ? { coords: rest.coords, isDefault: rest.isDefault } : {}) })),
      chosen: chosen.name,
      rationale: str(r.rationale, 600),
      blueprint,
      rubric: strs(r.rubric, 7, 240),
      emphasize: strs(r.emphasize, 5),
      omit: strs(r.omit, 5),
      ...(libraryId ? { libraryId } : {}),
      ...(domain ? { domain: domain.id, dimensions: domain.dimensions.map((d) => d.id) } : {}),
      ...(domain && chosen.isDefault && str(r.default_reason, 400) ? { defaultReason: str(r.default_reason, 400) } : {}),
    },
    direction,
  };
}

/**
 * What's wrong with a strategy's candidates, if anything (the creative
 * budget, checked in code): pairs too close in the space, no honest
 * default named, or the default chosen without a reason. null = fine.
 */
export function budgetProblem(s: Strategy): string | null {
  const placed = s.considered.filter((c) => c.coords?.some(Boolean));
  if (!s.dimensions?.length || placed.length < 2) return null;
  const problems: string[] = [];
  const close = clashes(placed.map((c) => c.coords!));
  if (close.length) {
    problems.push(
      `후보 ${close.map(([a, b]) => `'${placed[a].name}'와 '${placed[b].name}'`).join(", ")}가 전략 공간에서 거의 같은 위치입니다. 차원 2개 이상에서 실제로 다른 후보로 바꾸세요.`,
    );
  }
  const defaults = s.considered.filter((c) => c.isDefault);
  if (defaults.length === 0) problems.push("뻔한 기본안이 표시되지 않았습니다. 후보 중 하나를 이런 요청의 뻔한 기본 구성으로 정직하게 표시하세요.");
  const chosen = s.considered.find((c) => c.name === s.chosen);
  if (chosen?.isDefault && !s.defaultReason) problems.push("뻔한 기본안을 골랐는데 이유(default_reason)가 없습니다. 이유를 쓰거나 더 잘 맞는 다른 후보를 고르세요.");
  return problems.length ? problems.join(" ") : null;
}

/** The obvious default the strategist named, when it wasn't chosen: what the result must not turn into. */
export function rejectedDefault(s: Strategy | null): { name: string; summary: string } | null {
  if (!s) return null;
  const d = s.considered.find((c) => c.isDefault && c.name !== s.chosen);
  return d ? { name: d.name, summary: d.summary } : null;
}

/** The block the writer gets: follow this structure, meet this bar. */
export function strategyBlock(s: Strategy): string {
  return [
    `[이번 결과물의 전략: ${s.chosen}]`,
    s.rationale ? `선택 이유: ${s.rationale}` : "",
    "[설계도 — 이 순서와 목적대로 구성하세요. 도구의 [작업 방식]은 정해진 목차가 아니라 도구 상자입니다]",
    ...s.blueprint.map((b, i) => `${i + 1}. ${b.part} — ${b.purpose}${b.notes ? ` (${b.notes})` : ""}`),
    s.emphasize.length ? `강조: ${s.emphasize.join(" / ")}` : "",
    s.omit.length ? `빼기(이번 요청에는 필요 없음): ${s.omit.join(" / ")}` : "",
    ...(() => {
      const d = rejectedDefault(s);
      return d ? [`[피할 뻔한 기본안: ${d.name}] ${d.summary} — 결과가 이 구성을 닮으면 실패입니다.`] : [];
    })(),
    "[완성 기준 — 이 요청에서 훌륭한 결과]",
    ...s.rubric.map((r) => `- ${r}`),
    "JSON 필드는 담는 그릇일 뿐 목차가 아닙니다. 필드 안의 구성·순서·비중·분량·형식(레이아웃, 블록 종류)은 이 설계도를 따르고, 설계도에서 중요하지 않은 필드는 허용되는 범위에서 짧게 두세요.",
  ]
    .filter(Boolean)
    .join("\n");
}
