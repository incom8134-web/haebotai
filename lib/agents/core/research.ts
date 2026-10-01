// Research: questions first, then searches, then a synthesis that keeps
// only facts that answer a question, ties each to its sources, and checks
// them against the member's own material. The member's documents outrank
// research: when they disagree the result keeps the member's fact and the
// conflict is reported, never silently replaced.
//
//   request → research questions (contract) → one web search per question
//   → synthesis (relevant facts + sources + conflicts) → writers
//
// Pure logic (tested); the searches and the synthesis call run in the
// document agent / generic spec.

export interface ResearchFinding {
  question: string;
  findings: string;
  sources: { url: string; title: string; domain?: string }[];
}

export interface ResearchFact {
  claim: string;
  question: string;
  /** 1-based indexes into the merged source list. */
  sources: number[];
  confidence: "high" | "medium" | "low";
}

export interface ResearchResult {
  questions: string[];
  facts: ResearchFact[];
  conflicts: { source: string; research: string; resolution: string }[];
  /** Merged, deduplicated; the numbering writers cite as [n]. */
  sources: { url: string; title: string; domain?: string }[];
  unanswered: string[];
}

export const MAX_QUESTIONS = 5;

/**
 * The questions to search: the contract's, else built from the subject —
 * never the member's whole sentence. Deduplicated, at most five.
 */
export function researchQuestions(contractQuestions: string[], fallback: { subject: string; kind: string; year: number }): string[] {
  const qs = contractQuestions.map((q) => q.trim()).filter((q) => q.length >= 6);
  if (qs.length === 0 && fallback.subject) {
    qs.push(`${fallback.subject} 시장 규모와 성장률 ${fallback.year - 1}~${fallback.year}`, `${fallback.subject} 주요 경쟁사와 대안`, `${fallback.subject} 관련 정책·규제·지원사업 ${fallback.year}`);
  }
  const seen = new Set<string>();
  return qs.filter((q) => {
    const k = q.replace(/\s+/g, "").toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, MAX_QUESTIONS);
}

export function searchPrompt(question: string, context: string): string {
  return [
    `다음 질문에 답하는 사실을 웹 검색으로 찾으세요: ${question}`,
    "수치·기관·날짜·이름을 살려 출처와 함께 한국어로 정리하고, 가장 최신 자료를 우선하세요. 찾지 못한 것은 찾지 못했다고 쓰세요. 추측하지 마세요.",
    context ? `\n[작업 맥락 — 검색 범위를 좁히는 데만 쓰세요]\n${context.slice(0, 1500)}` : "",
  ].join("\n");
}

/** All findings' sources merged and deduplicated by URL, in question order. */
export function mergeSources(findings: ResearchFinding[]): { url: string; title: string; domain?: string }[] {
  const seen = new Set<string>();
  const out: { url: string; title: string; domain?: string }[] = [];
  for (const f of findings) {
    for (const s of f.sources) {
      if (s.url && !seen.has(s.url)) {
        seen.add(s.url);
        out.push(s);
      }
    }
  }
  return out.slice(0, 40);
}

export const SYNTHESIS_SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          claim: { type: "string", description: "검색 결과에 실제로 있는 사실 한 문장 (수치·기관·연도 포함)" },
          question: { type: "string", description: "어느 조사 질문에 답하는지 (질문 그대로)" },
          sources: { type: "array", items: { type: "integer" }, description: "근거 출처 번호 ([출처 목록]의 번호)" },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "공신력 있는 기관·최근 자료면 high, 블로그·오래된 자료면 low" },
        },
        required: ["claim", "question", "sources", "confidence"],
      },
    },
    conflicts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          source: { type: "string", description: "사용자 자료에 적힌 내용" },
          research: { type: "string", description: "조사 결과와 다른 내용" },
          resolution: { type: "string", description: "어떻게 다룰지 — 기본은 사용자 자료를 유지하고 차이를 알림" },
        },
        required: ["source", "research", "resolution"],
      },
    },
    unanswered: { type: "array", items: { type: "string" }, maxItems: 5, description: "답을 찾지 못한 질문" },
  },
  required: ["facts", "conflicts", "unanswered"],
} as const;

export const SYNTHESIS_SYSTEM = [
  "당신은 조사 결과를 검증하는 리서처입니다. 검색 결과 중 질문에 실제로 답하는 사실만 남기고, 출처 번호를 붙입니다.",
  "검색 결과에 없는 내용을 보태지 마세요. 출처가 없는 주장은 버리세요. 오래되었거나 신뢰도가 낮은 자료는 confidence를 낮추세요.",
  "사용자가 올린 자료의 사실과 조사 결과가 다르면 conflicts에 적으세요. 사용자 자료가 이 프로젝트에 대해서는 더 권위 있습니다.",
].join("\n");

export function synthesisPrompt(findings: ResearchFinding[], sources: ResearchResult["sources"], userFacts: string[]): string {
  return [
    "[조사 질문과 검색 결과]",
    ...findings.map((f, i) => `Q${i + 1}. ${f.question}\n${f.findings || "(결과 없음)"}`),
    "",
    "[출처 목록]",
    ...sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`),
    ...(userFacts.length ? ["", "[사용자가 올린 자료의 사실 — 충돌 확인용]", ...userFacts.slice(0, 40).map((f) => `- ${f}`)] : []),
  ].join("\n");
}

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseSynthesis(raw: unknown, questions: string[], sourceCount: number): Omit<ResearchResult, "questions" | "sources"> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
  const facts = list(r.facts)
    .map((f) => ({
      claim: str(f.claim, 300),
      question: questions.find((q) => q === str(f.question, 200)) ?? str(f.question, 200),
      sources: (Array.isArray(f.sources) ? f.sources : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount),
      confidence: (["high", "medium", "low"] as const).includes(f.confidence as "high") ? (f.confidence as ResearchFact["confidence"]) : "medium",
    }))
    // A research fact without a source is not a research fact.
    .filter((f) => f.claim && f.sources.length > 0);
  return {
    facts,
    conflicts: list(r.conflicts).map((c) => ({ source: str(c.source, 300), research: str(c.research, 300), resolution: str(c.resolution, 200) || "사용자 자료를 유지하고 차이를 알림" })).filter((c) => c.source && c.research),
    unanswered: Array.isArray(r.unanswered) ? r.unanswered.map((u) => str(u, 200)).filter(Boolean).slice(0, 5) : [],
  };
}

/** Without a synthesis (the call failed): the raw findings, each with its own question's sources. */
export function fallbackFacts(findings: ResearchFinding[], sources: ResearchResult["sources"]): ResearchFact[] {
  return findings.flatMap((f) =>
    f.findings
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((l) => l.length > 20)
      .slice(0, 6)
      .map((claim) => ({ claim, question: f.question, sources: f.sources.map((s) => sources.findIndex((x) => x.url === s.url) + 1).filter((n) => n > 0), confidence: "low" as const }))
      .filter((x) => x.sources.length),
  );
}

/** The block writers read, optionally only the facts for some questions. */
export function researchBlock(r: ResearchResult, opts: { questions?: string[]; max?: number } = {}): string {
  const facts = r.facts.filter((f) => !opts.questions?.length || opts.questions.includes(f.question)).slice(0, opts.max ?? 30);
  if (!facts.length && !r.conflicts.length) return "";
  return [
    "[외부 조사 — 보조 자료. 사용자 자료와 다르면 사용자 자료가 우선]",
    ...facts.map((f) => `- ${f.claim} ${f.sources.map((n) => `[${n}]`).join("")}${f.confidence === "low" ? " (신뢰도 낮음 — 단정하지 말 것)" : ""}`),
    ...(r.conflicts.length ? ["[자료 충돌 — 사용자 자료를 유지하고 필요하면 차이를 밝힐 것]", ...r.conflicts.map((c) => `- 사용자 자료: ${c.source} / 조사: ${c.research}`)] : []),
    r.sources.length ? `[출처 번호]\n${r.sources.map((s, i) => `[${i + 1}] ${s.title}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
