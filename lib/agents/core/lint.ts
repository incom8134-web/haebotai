import { blockText, type LongDocument } from "./document.ts";

// Anti-generic lint: counts the habits that make a result read like a
// template — stock openings and closings, empty superlatives and
// buzzwords, the same sentence opener over and over, every section built
// the same way. Deterministic, so the critic gets evidence instead of an
// impression and the verifier can hold the line.
//
// Pure logic (tested).

const STOCK = [
  /오늘날/, /급변하는/, /4차\s*산업혁명/, /아무리\s*강조해도/, /결론적으로/, /요약하자면/, /앞으로도\s*최선/, /새로운\s*패러다임/, /무한한\s*가능성/,
  /in\s+today'?s\s+(fast-paced|rapidly)/i, /in\s+conclusion/i, /it\s+is\s+important\s+to\s+note/i, /game[-\s]?changer/i, /unlock\s+the\s+(full\s+)?potential/i,
];
const BUZZ = [/혁신적인/, /획기적인/, /최고의/, /차별화된/, /시너지/, /원스톱/, /토탈\s*솔루션/, /고객\s*중심의/, /최적의/, /극대화/, /seamless/i, /cutting[-\s]edge/i, /world[-\s]class/i, /synergy/i, /best[-\s]in[-\s]class/i, /revolutionary/i];

export interface LintFinding {
  kind: "stock" | "buzzword" | "opener" | "structure" | "filler";
  where: string;
  detail: string;
}

export interface LintReport {
  findings: LintFinding[];
  /** 0 (clean) … 100 (template-like). */
  score: number;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?。다요])\s+/).map((s) => s.trim()).filter((s) => s.length > 8);
}

function lintText(text: string, where = ""): LintFinding[] {
  const out: LintFinding[] = [];
  for (const rx of STOCK) {
    const m = rx.exec(text);
    if (m) out.push({ kind: "stock", where, detail: `상투적 표현 "${m[0]}"` });
  }
  const buzz = BUZZ.flatMap((rx) => text.match(new RegExp(rx.source, rx.flags.includes("i") ? "gi" : "g")) ?? []);
  if (buzz.length >= 2) out.push({ kind: "buzzword", where, detail: `빈 수식어 ${buzz.length}회 (${[...new Set(buzz)].slice(0, 4).join(", ")})` });
  return out;
}

export function lintDocument(doc: LongDocument): LintReport {
  const findings: LintFinding[] = [];
  const openers = new Map<string, number>();
  const shapes = new Map<string, string[]>();
  for (const s of doc.sections) {
    const text = s.blocks.map(blockText).join("\n");
    findings.push(...lintText(text, s.title));
    for (const sent of s.blocks.filter((b) => b.type === "paragraph").flatMap((b) => sentences(blockText(b)))) {
      const opener = sent.split(/\s+/).slice(0, 2).join(" ");
      if (opener.length >= 3) openers.set(opener, (openers.get(opener) ?? 0) + 1);
    }
    if (s.blocks.length >= 3) {
      const shape = s.blocks.map((b) => b.type).join(">");
      shapes.set(shape, [...(shapes.get(shape) ?? []), s.title]);
    }
    // A long section with nothing but one paragraph type and repeated words is filler.
    const words = text.split(/\s+/).filter((w) => w.length > 1);
    const distinct = new Set(words).size;
    if (words.length > 250 && distinct / words.length < 0.38) findings.push({ kind: "filler", where: s.title, detail: `같은 말이 많이 반복됩니다 (고유 단어 비율 ${Math.round((distinct / words.length) * 100)}%)` });
  }
  for (const [opener, n] of openers) if (n >= 4) findings.push({ kind: "opener", where: "문서 전체", detail: `"${opener}…"로 시작하는 문장 ${n}개` });
  for (const [shape, titles] of shapes) if (titles.length >= 4 && titles.length >= doc.sections.length * 0.5) findings.push({ kind: "structure", where: titles.slice(0, 3).join(", "), detail: `섹션 ${titles.length}개가 같은 구성(${shape.replace(/>/g, "→")})` });
  const weight = { stock: 6, buzzword: 5, opener: 8, structure: 12, filler: 10 } as const;
  const score = Math.min(100, findings.reduce((n, f) => n + weight[f.kind], 0));
  return { findings, score };
}
