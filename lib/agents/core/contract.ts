// The task contract: what the member asked for, written down once and
// carried through every stage — the planner plans against it, writers are
// told it, the verifier checks the result against it, and the result page
// shows it. It answers "what kind of task is this?" before anything is
// written, so "do not change the document, make it beautiful" and "use
// this only as inspiration" become different workflows, not different
// adjectives in one prompt.
//
// Two halves: the model reads the request (CONTRACT_SCHEMA / parseContract)
// and the code reads the explicit instructions itself (detectExplicit).
// Explicit instructions win — "순서 유지" is a requirement whatever the
// model made of it.
//
// Pure logic (tested); the model call is in lib/agents/specs.

export type TaskMode =
  /** A new result from the brief (no source, or source only as background). */
  | "create"
  /** A new deliverable built on the source's facts: expand, research, restructure freely. */
  | "create_from_source"
  /** The source turned into another kind of deliverable (report → deck, materials → proposal). */
  | "transform"
  /** Follow a requirements document (RFP, grant call, form): its items and order drive the structure. */
  | "answer_requirements"
  /** Same structure, order and meaning; wording rewritten to a professional standard. */
  | "rewrite"
  /** Same structure and nearly the same text: grammar, clarity, consistency only. */
  | "polish"
  /** Design only: every word stays; layout, hierarchy, tables and visuals change. */
  | "beautify"
  /** The source is inspiration only: new structure, new content, nothing copied. */
  | "inspire";

export type SourceRole = "none" | "primary" | "requirements" | "inspiration" | "style" | "data";
export type LengthUnit = "pages" | "slides" | "words" | "chars" | "sections" | "none";

export interface TaskContract {
  mode: TaskMode;
  sourceRole: SourceRole;
  preserve: { order: boolean; structure: boolean; wording: boolean; meaning: boolean; facts: boolean; sectionTitles: boolean };
  /** What may change ("문장 다듬기", "표 추가"…). */
  allow: string[];
  /** What must not happen ("섹션 순서 변경", "새 사실 추가"…). */
  prohibit: string[];
  length: { unit: LengthUnit; target: number | null; strict: boolean; from: "user" | "source" | "default" };
  detail: "brief" | "standard" | "comprehensive";
  research: { need: "none" | "helpful" | "required"; reason: string; questions: string[] };
  visuals: { level: "none" | "minimal" | "balanced" | "rich"; prefer: string[]; avoid: string[] };
  audience: string;
  deliverable: string;
  /** The member's explicit instructions, each one a requirement the verifier checks. */
  explicit: string[];
  /** Why the contract reads the request this way (shown to the member). */
  rationale: string;
}

const TASK_MODES: TaskMode[] = ["create", "create_from_source", "transform", "answer_requirements", "rewrite", "polish", "beautify", "inspire"];
const SOURCE_ROLES: SourceRole[] = ["none", "primary", "requirements", "inspiration", "style", "data"];
const UNITS: LengthUnit[] = ["pages", "slides", "words", "chars", "sections", "none"];

export const MODE_LABELS: Record<TaskMode, { ko: string; en: string }> = {
  create: { ko: "새로 만들기", en: "Create new" },
  create_from_source: { ko: "자료를 바탕으로 새로 만들기", en: "Build from the source" },
  transform: { ko: "다른 형식으로 바꾸기", en: "Transform" },
  answer_requirements: { ko: "요구사항·공고에 맞추기", en: "Answer the requirements" },
  rewrite: { ko: "구조는 그대로, 문장을 전문적으로", en: "Rewrite, same structure" },
  polish: { ko: "문장만 다듬기", en: "Polish the wording" },
  beautify: { ko: "내용은 그대로, 디자인만", en: "Design only, wording untouched" },
  inspire: { ko: "영감만 얻어 새로", en: "Inspired by, all new" },
};

export const CONTRACT_SCHEMA = {
  type: "object",
  properties: {
    mode: { type: "string", enum: TASK_MODES, description: "이 작업의 종류. 원본을 바꾸지 말라는 말이 있으면 polish·rewrite·beautify 중 하나, 디자인만 바꾸라면 beautify, 참고만 하고 새로 만들라면 inspire" },
    source_role: { type: "string", enum: SOURCE_ROLES, description: "올린 자료의 역할. 자료가 없으면 none" },
    preserve_order: { type: "boolean" },
    preserve_structure: { type: "boolean" },
    preserve_wording: { type: "boolean", description: "문장을 한 글자도 바꾸면 안 되면 true" },
    preserve_meaning: { type: "boolean" },
    preserve_facts: { type: "boolean" },
    preserve_section_titles: { type: "boolean" },
    allow: { type: "array", items: { type: "string" }, maxItems: 8, description: "바꿔도 되는 것" },
    prohibit: { type: "array", items: { type: "string" }, maxItems: 8, description: "하면 안 되는 것" },
    length_unit: { type: "string", enum: UNITS },
    length_target: { type: "integer", description: "요청한 분량 숫자. 없으면 0" },
    length_strict: { type: "boolean", description: "분량이 명시된 요구인지" },
    detail: { type: "string", enum: ["brief", "standard", "comprehensive"] },
    research_need: { type: "string", enum: ["none", "helpful", "required"], description: "외부 조사가 필요한지. 최신 시장·통계·규제·경쟁사·정책이 결과의 질을 좌우하면 required" },
    research_reason: { type: "string" },
    research_questions: { type: "array", items: { type: "string" }, maxItems: 8, description: "사용자 문장을 그대로 검색하지 말고, 결과에 필요한 사실을 찾는 구체적인 조사 질문 (예: 2025년 국내 스마트팜 교육 시장 규모)" },
    visuals_level: { type: "string", enum: ["none", "minimal", "balanced", "rich"] },
    visuals_prefer: { type: "array", items: { type: "string" }, maxItems: 6, description: "어울리는 시각 요소 (표, 공정도, 일정표, 비교표, 차트, 사진…)" },
    visuals_avoid: { type: "array", items: { type: "string" }, maxItems: 4 },
    audience: { type: "string" },
    deliverable: { type: "string", description: "최종 결과물 한 구절 (예: 30쪽 정부 R&D 과제 계획서)" },
    explicit: { type: "array", items: { type: "string" }, maxItems: 10, description: "사용자가 명시한 지시 하나하나 (사용자 표현에 가깝게)" },
    rationale: { type: "string", description: "이렇게 판단한 이유 한두 문장" },
  },
  required: [
    "mode", "source_role", "preserve_order", "preserve_structure", "preserve_wording", "preserve_meaning", "preserve_facts", "preserve_section_titles",
    "allow", "prohibit", "length_unit", "length_target", "length_strict", "detail", "research_need", "research_reason", "research_questions",
    "visuals_level", "visuals_prefer", "visuals_avoid", "audience", "deliverable", "explicit", "rationale",
  ],
} as const;

export const CONTRACT_SYSTEM = [
  "당신은 작업을 시작하기 전에 요청을 '작업 계약'으로 정리하는 시니어 프로젝트 매니저입니다. 결과물을 쓰지 말고, 무엇을 해야 하고 무엇을 하면 안 되는지만 정확히 정리합니다.",
  "사용자의 명시적 지시는 제안이 아니라 요구사항입니다. '바꾸지 마', '그대로', '순서 유지', '디자인만', '참고만'처럼 범위를 정하는 말을 놓치지 마세요.",
  "올린 자료의 역할을 구분하세요: 사용자의 프로젝트 자체(primary), 지켜야 할 공고·RFP·양식(requirements), 영감(inspiration), 스타일 참고(style), 데이터(data).",
  "조사가 필요하면 사용자 문장을 그대로 검색하지 말고 결과에 필요한 사실을 찾는 질문으로 나누세요. 사용자가 올린 자료에 이미 있는 사실은 조사하지 마세요.",
  "분량은 사용자가 말한 숫자를 그대로 쓰고, 말하지 않았으면 0으로 두세요.",
].join("\n");

export function contractPrompt(opts: { toolName: string; requestText: string; sourceOutline?: string; intentText?: string }): string {
  return [
    `도구: ${opts.toolName}`,
    "",
    "[사용자 요청]",
    opts.requestText || "(입력 없음)",
    ...(opts.intentText ? ["", opts.intentText] : []),
    ...(opts.sourceOutline ? ["", "[올린 자료의 구조]", opts.sourceOutline] : ["", "[올린 자료] 없음"]),
  ].join("\n");
}

// ── Explicit instructions, read by the code ────────────────────────────

export interface Explicit {
  mode?: TaskMode;
  preserve: Partial<TaskContract["preserve"]>;
  length?: TaskContract["length"];
  research?: "required";
  visualsAvoid: string[];
  visualsPrefer: string[];
  /** The phrases that triggered each rule, kept as requirements. */
  quotes: string[];
}

const RX = {
  // "문서/내용/문장은 바꾸지 말고", "그대로 두고", "don't change the document"
  freezeText:
    /((문서|내용|문장|문구|글|텍스트|원문|본문|단어|표현|제안서|계획서|보고서|원본|자료|파일)[은는을를이가]?\s*(절대\s*)?(바꾸지|수정하지|고치지|건드리지|손대지|변경하지)|(문서|내용|문장|원문|본문|원본)[은는을를]?\s*(그대로|유지)|(모두|전부|다|모든\s*것을?)\s*그대로|한\s*글자도|(do\s*not|don'?t|never)\s+(change|touch|modify|alter|edit)\s+(any\s+|the\s+)?(uploaded\s+|original\s+)?(wording|words|text|content|document|copy|proposal|file|original|it)\b|(preserve|keep)\s+everything|keep\s+(all\s+)?(the\s+)?(wording|text|content)\s+(as\s+is|unchanged|exactly))/i,
  designOnly: /(디자인만|레이아웃만|서식만|모양만|꾸미기만|only\s+(beautify|redesign|the\s+design|the\s+layout|design|layout)|(design|layout)\s+only)/i,
  design: /(디자인|레이아웃|배치|서식|타이포|예쁘게|아름답게|보기\s*좋게|깔끔하게\s*꾸|beautiful|beautify|design|layout|typography|look\s+(better|premium|professional))/i,
  order: /((순서|목차\s*순서)[는를은을]?\s*(그대로|유지|바꾸지)|같은\s*순서|keep\s+(the\s+)?order|preserve\s+(the\s+)?order|same\s+order)/i,
  structure: /((구성|구조|목차|틀|양식|형식)[은는을를]?\s*(그대로|유지|바꾸지|지키)|keep\s+(the\s+)?(structure|outline|sections)|preserve\s+(the\s+)?(structure|outline))/i,
  rewrite: /(다듬|윤문|매끄럽게|전문적으로|프로페셔널|문장을?\s*(고쳐|개선|다시)|polish|rewrite|reword|make\s+it\s+(more\s+)?professional|improve\s+the\s+wording)/i,
  lightEdit: /(맞춤법|오탈자|문법|띄어쓰기|grammar|typos?|proofread)/i,
  inspire: /(영감|참고만|아이디어만|참고용으로만|완전히\s*새로|처음부터\s*새로|베끼지|inspiration|inspired\s+by|completely\s+new|from\s+scratch|don'?t\s+copy)/i,
  requirements: /(공고|RFP|제안요청서|과업지시서|평가\s*기준|심사\s*기준|양식에\s*맞|지원사업|requirements?\s+document|call\s+for\s+proposals)/i,
  transform: /(발표\s*자료로|슬라이드로|제안서로|계획서로|보고서로|바꿔\s*줘|변환|turn\s+(this|these|it)\s+into|convert)/i,
  research: /(조사|리서치|최신|현황|동향|통계|시장\s*규모|경쟁사|정책|규제|research|latest|current\s+market|statistics|competitors?)/i,
  noResearch: /(조사[는를]?\s*(하지\s*)?(말|필요\s*없|안\s*해)|검색[은는]?\s*하지|no\s+research|don'?t\s+research)/i,
  fewerImages: /((이미지|사진|그림)[은는을를]?\s*(줄이|빼|없이|넣지)|fewer\s+images|no\s+(images|photos)|less\s+images)/i,
  moreDiagrams: /((도표|다이어그램|도식|공정도|흐름도|표|차트)[를을]?\s*(더|많이|추가)|more\s+(diagrams|charts|tables))/i,
  visualsWanted: /(이미지|사진|그림|도표|다이어그램|도식|차트|그래프|인포그래픽|시각\s*자료|visuals?|images?|diagrams?|charts?|infographics?)/i,
};

const PAGE_RX = /(\d{1,3})\s*(페이지|쪽|pages?|p\b|매)/i;
const SLIDE_RX = /(\d{1,3})\s*(장|슬라이드|slides?)/i;
const WORD_RX = /(\d{1,3}(?:,\d{3})+|\d{3,6})\s*(자|글자|단어|words?|characters?)/i;

function quote(text: string, rx: RegExp): string | null {
  const m = rx.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - 12);
  return text.slice(start, Math.min(text.length, m.index + m[0].length + 12)).replace(/\s+/g, " ").trim();
}

/**
 * What the request says in so many words. `text` is everything the member
 * typed (free request, form fields); `referenceMode` the command they
 * picked for their upload; `deck` whether the tool's unit is slides.
 */
export function detectExplicit(text: string, opts: { referenceMode?: string | null; hasSource: boolean; deck?: boolean }): Explicit {
  const t = text ?? "";
  const out: Explicit = { preserve: {}, visualsAvoid: [], visualsPrefer: [], quotes: [] };
  const hit = (rx: RegExp) => {
    const q = quote(t, rx);
    if (q) out.quotes.push(q);
    return !!q;
  };

  const frozen = hit(RX.freezeText);
  const design = RX.design.test(t);
  const inspire = hit(RX.inspire);
  if (hit(RX.order)) out.preserve.order = true;
  if (hit(RX.structure)) out.preserve.structure = out.preserve.order = true;

  if (opts.hasSource) {
    const designOnly = hit(RX.designOnly);
    const rewriteWords = RX.rewrite.test(t) || RX.lightEdit.test(t);
    if ((frozen || designOnly) && design && !rewriteWords) {
      // "Don't change the document, make it beautiful": a design task.
      out.mode = "beautify";
      Object.assign(out.preserve, { order: true, structure: true, wording: true, meaning: true, facts: true, sectionTitles: true });
    } else if (frozen) {
      // "Don't change it, but polish it / make it professional": content,
      // order and structure stay; the language (and the design) improve.
      out.mode = "polish";
      Object.assign(out.preserve, { order: true, structure: true, meaning: true, facts: true });
    } else if (inspire) {
      out.mode = "inspire";
    } else if ((out.preserve.order || out.preserve.structure) && RX.rewrite.test(t)) {
      out.mode = "rewrite";
      Object.assign(out.preserve, { meaning: true, facts: true });
    } else if (RX.lightEdit.test(t) && !RX.transform.test(t)) {
      out.mode = "polish";
      Object.assign(out.preserve, { order: true, structure: true, meaning: true, facts: true });
    } else if (RX.requirements.test(t)) {
      hit(RX.requirements);
      out.mode = "answer_requirements";
    }
  }

  // The command picked for the upload says it too.
  const byMode: Record<string, TaskMode> = {
    improve: "rewrite",
    beautify: "beautify",
    inspire: "inspire",
    rfp: "answer_requirements",
    call: "answer_requirements",
    convert: "transform",
    restructure: "transform",
    condense: "transform",
    "from-doc": "transform",
    redesign: "transform",
    mood: "inspire",
  };
  const fromCommand = opts.referenceMode ? byMode[opts.referenceMode] : undefined;
  if (opts.hasSource && fromCommand && !out.mode) out.mode = fromCommand;
  if (opts.hasSource && opts.referenceMode === "beautify") Object.assign(out.preserve, { order: true, structure: true, wording: true, meaning: true, facts: true, sectionTitles: true });
  if (opts.hasSource && opts.referenceMode === "improve") Object.assign(out.preserve, { order: true, meaning: true, facts: true });

  const slides = SLIDE_RX.exec(t);
  const pages = PAGE_RX.exec(t);
  const words = WORD_RX.exec(t);
  if (opts.deck && slides) out.length = { unit: "slides", target: Number(slides[1]), strict: true, from: "user" };
  else if (pages) out.length = { unit: "pages", target: Number(pages[1]), strict: true, from: "user" };
  else if (slides && !opts.deck && /장/.test(slides[2])) out.length = { unit: "pages", target: Number(slides[1]), strict: true, from: "user" };
  else if (words) out.length = { unit: /자|글자|char/i.test(words[2]) ? "chars" : "words", target: Number(words[1].replace(/,/g, "")), strict: true, from: "user" };
  if (out.length) out.quotes.push(`${out.length.target} ${out.length.unit}`);

  if (RX.noResearch.test(t)) out.research = undefined;
  else if (hit(RX.research)) out.research = "required";
  if (hit(RX.fewerImages)) out.visualsAvoid.push("사진·이미지");
  if (hit(RX.moreDiagrams)) out.visualsPrefer.push("도표·다이어그램");
  else if (RX.visualsWanted.test(t) && !out.visualsAvoid.length) out.visualsPrefer.push("요청한 시각 자료");
  out.quotes = [...new Set(out.quotes)].slice(0, 10);
  return out;
}

// ── The model's reading ────────────────────────────────────────────────

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, n: number, max = 200) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);

export function parseContract(raw: unknown): TaskContract | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const target = Math.round(Number(r.length_target) || 0);
  return {
    mode: pick(r.mode, TASK_MODES, "create"),
    sourceRole: pick(r.source_role, SOURCE_ROLES, "none"),
    preserve: {
      order: r.preserve_order === true,
      structure: r.preserve_structure === true,
      wording: r.preserve_wording === true,
      meaning: r.preserve_meaning === true,
      facts: r.preserve_facts !== false,
      sectionTitles: r.preserve_section_titles === true,
    },
    allow: strs(r.allow, 8),
    prohibit: strs(r.prohibit, 8),
    length: { unit: pick(r.length_unit, UNITS, "none"), target: target > 0 ? Math.min(target, 400) : null, strict: r.length_strict === true && target > 0, from: target > 0 ? "user" : "default" },
    detail: pick(r.detail, ["brief", "standard", "comprehensive"] as const, "standard"),
    research: { need: pick(r.research_need, ["none", "helpful", "required"] as const, "none"), reason: str(r.research_reason, 240), questions: strs(r.research_questions, 8, 160) },
    visuals: { level: pick(r.visuals_level, ["none", "minimal", "balanced", "rich"] as const, "balanced"), prefer: strs(r.visuals_prefer, 6, 60), avoid: strs(r.visuals_avoid, 4, 60) },
    audience: str(r.audience, 160),
    deliverable: str(r.deliverable, 160),
    explicit: strs(r.explicit, 10, 200),
    rationale: str(r.rationale, 400),
  };
}

/** A contract from the explicit rules alone (the model call failed or was skipped). */
function defaultContract(): TaskContract {
  return {
    mode: "create",
    sourceRole: "none",
    preserve: { order: false, structure: false, wording: false, meaning: false, facts: true, sectionTitles: false },
    allow: [],
    prohibit: [],
    length: { unit: "none", target: null, strict: false, from: "default" },
    detail: "standard",
    research: { need: "none", reason: "", questions: [] },
    visuals: { level: "balanced", prefer: [], avoid: [] },
    audience: "",
    deliverable: "",
    explicit: [],
    rationale: "",
  };
}

const PRESERVING: TaskMode[] = ["beautify", "polish", "rewrite"];
const NEEDS_SOURCE: TaskMode[] = ["create_from_source", "transform", "answer_requirements", "rewrite", "polish", "beautify", "inspire"];

/**
 * The contract the run follows: the model's reading, overruled by what the
 * member said in so many words, then made consistent (a preserving mode
 * preserves; no source means nothing to preserve; facts are never
 * invented).
 */
export function mergeContract(model: TaskContract | null, explicit: Explicit, opts: { hasSource: boolean; sourceSections?: number; sourcePages?: number; deck?: boolean }): TaskContract {
  const c: TaskContract = structuredClone(model ?? defaultContract());
  if (explicit.mode) c.mode = explicit.mode;
  // The model may not quietly downgrade a preserving request into a rewrite from scratch.
  if (model && PRESERVING.includes(model.mode) && !explicit.mode && opts.hasSource) c.mode = model.mode;
  for (const [k, v] of Object.entries(explicit.preserve)) if (v) c.preserve[k as keyof TaskContract["preserve"]] = true;
  if (explicit.length) c.length = explicit.length;
  if (explicit.research) c.research.need = "required";
  c.visuals.avoid = [...new Set([...c.visuals.avoid, ...explicit.visualsAvoid])].slice(0, 4);
  c.visuals.prefer = [...new Set([...explicit.visualsPrefer, ...c.visuals.prefer])].slice(0, 6);
  c.explicit = [...new Set([...explicit.quotes, ...c.explicit])].slice(0, 12);

  // An upload with no other instruction is material to build on.
  if (opts.hasSource && c.mode === "create") c.mode = "create_from_source";
  if (!opts.hasSource) {
    if (NEEDS_SOURCE.includes(c.mode)) c.mode = "create";
    c.sourceRole = "none";
    c.preserve = { order: false, structure: false, wording: false, meaning: false, facts: true, sectionTitles: false };
  } else if (c.sourceRole === "none") {
    c.sourceRole = c.mode === "inspire" ? "inspiration" : c.mode === "answer_requirements" ? "requirements" : "primary";
  }
  if (c.mode === "beautify") Object.assign(c.preserve, { order: true, structure: true, wording: true, meaning: true, facts: true, sectionTitles: true });
  if (c.mode === "polish") Object.assign(c.preserve, { order: true, structure: true, meaning: true, facts: true });
  if (c.mode === "rewrite") Object.assign(c.preserve, { order: true, meaning: true, facts: true });
  if (c.mode === "inspire") {
    c.sourceRole = "inspiration";
    Object.assign(c.preserve, { order: false, structure: false, wording: false, sectionTitles: false });
  }
  if (c.mode !== "beautify") c.preserve.wording = false;
  c.preserve.facts = true;
  // Design-only work doesn't research or add content.
  if (c.mode === "beautify" || c.mode === "polish") c.research = { need: "none", reason: "원문을 바꾸지 않는 작업", questions: [] };
  // A preserved document keeps its own length unless the member set one.
  if (PRESERVING.includes(c.mode) && c.length.from !== "user") {
    if (opts.deck && opts.sourcePages) c.length = { unit: "slides", target: opts.sourcePages, strict: true, from: "source" };
    else if (opts.sourcePages) c.length = { unit: "pages", target: opts.sourcePages, strict: false, from: "source" };
  }
  const prohibit = new Set(c.prohibit);
  prohibit.add("입력·자료·조사에 없는 사업 사실(수치, 실적, 인증, 고객, 가격) 지어내기");
  if (c.preserve.order) prohibit.add("원본 섹션 순서 바꾸기");
  if (c.preserve.wording) prohibit.add("원문 문장 바꾸기·지우기·요약하기");
  if (c.preserve.meaning) prohibit.add("원문의 의미·주장·요구사항 바꾸기");
  if (c.mode === "inspire") prohibit.add("원본의 구성이나 문장을 그대로 가져오기");
  c.prohibit = [...prohibit].slice(0, 10);
  return c;
}

/** The block every later stage reads. */
export function contractBlock(c: TaskContract): string {
  const keep = Object.entries(c.preserve).filter(([, v]) => v).map(([k]) => PRESERVE_LABEL[k as keyof TaskContract["preserve"]]);
  const len = c.length.target ? `${c.length.target}${UNIT_LABEL[c.length.unit]}${c.length.strict ? " (요구사항)" : " (목표)"}` : "";
  return [
    `[작업 계약 — 이 작업 내내 지켜야 할 요구사항]`,
    `- 작업 종류: ${MODE_LABELS[c.mode].ko}${c.deliverable ? ` → ${c.deliverable}` : ""}`,
    c.sourceRole !== "none" ? `- 올린 자료의 역할: ${ROLE_LABEL[c.sourceRole]}` : "",
    keep.length ? `- 지킬 것: ${keep.join(", ")}` : "",
    c.allow.length ? `- 바꿔도 되는 것: ${c.allow.join(", ")}` : "",
    c.prohibit.length ? `- 하면 안 되는 것: ${c.prohibit.join(" / ")}` : "",
    len ? `- 분량: ${len}` : "",
    `- 깊이: ${{ brief: "간결하게", standard: "표준", comprehensive: "빠짐없이 깊게" }[c.detail]}`,
    c.audience ? `- 독자: ${c.audience}` : "",
    c.visuals.level !== "none" ? `- 시각 자료: ${{ none: "없음", minimal: "꼭 필요한 곳만", balanced: "적절히", rich: "풍부하게" }[c.visuals.level]}${c.visuals.prefer.length ? ` · 선호: ${c.visuals.prefer.join(", ")}` : ""}${c.visuals.avoid.length ? ` · 피할 것: ${c.visuals.avoid.join(", ")}` : ""}` : "- 시각 자료: 넣지 않음",
    c.explicit.length ? `- 사용자가 명시한 지시: ${c.explicit.map((e) => `"${e}"`).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const PRESERVE_LABEL: Record<keyof TaskContract["preserve"], string> = {
  order: "원본 순서",
  structure: "원본 구성",
  wording: "원문 문장 그대로",
  meaning: "원본의 의미",
  facts: "원본의 사실·수치",
  sectionTitles: "섹션 제목",
};
const ROLE_LABEL: Record<SourceRole, string> = {
  none: "없음",
  primary: "사용자의 프로젝트 자체 — 가장 권위 있는 사실",
  requirements: "지켜야 할 요구사항·양식",
  inspiration: "영감 — 구성과 문장은 새로",
  style: "스타일 참고",
  data: "데이터",
};
const UNIT_LABEL: Record<LengthUnit, string> = { pages: "쪽", slides: "장", words: "단어", chars: "자", sections: "개 섹션", none: "" };
