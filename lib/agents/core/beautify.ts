import type { SourceDoc, SourceSection } from "./source.ts";
import type { DesignSystem, DocBlock, DocSection, LongDocument } from "./document.ts";

// Document beautification: a design task, not a writing task. The
// document is rebuilt from the source by code — every sentence verbatim,
// in order — and only its presentation changes: wrapped PDF lines become
// paragraphs again, marked lines become lists, "label: value" runs become
// tables, tables with a numeric column get a chart beside them, and the
// model may choose a design system and pick sentences/figures to
// highlight, each of which must already be in that section word for
// word (anything else is dropped). The verifier then proves the wording
// is unchanged.
//
// Pure logic (tested); the design call is in the document agent.

// A list marker is followed by a space ("1. 항목"), so "80.000" stays a number.
const BULLET = /^\s*([-•·▪◦○●□■※➔→✓✔]|\d{1,2}[.)](?=\s)|[가-하][.)](?=\s)|[①-⑳])\s*/;
const KV = /^([^:：]{2,30})\s*[:：]\s*(.{1,200})$/;
const WORD_END = /[이가은는을를의에와과로도만고며서다요함음등및됨임,.)]$/;

/** Wrapped lines → paragraphs (a PDF line break is not a paragraph break). */
function reflow(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const prev = out[out.length - 1];
    const startsNew = BULLET.test(line) || KV.test(line);
    if (prev !== undefined && !startsNew && !/[.!?。:：]$/.test(prev) && !BULLET.test(prev) && !KV.test(prev) && prev.length > 25) {
      // A Korean word broken across lines joins without a space.
      out[out.length - 1] = /[가-힣]$/.test(prev) && /^[가-힣]/.test(line) && !WORD_END.test(prev) ? prev + line : `${prev} ${line}`;
    } else out.push(line);
  }
  return out;
}

function numericColumn(rows: string[][]): number {
  if (rows.length < 3) return -1;
  const cols = Math.max(...rows.map((r) => r.length));
  for (let c = cols - 1; c >= 1; c--) {
    const vals = rows.map((r) => r[c] ?? "");
    if (vals.every((v) => /^[\d,.\s%원천만억개명]+$/.test(v) && /\d/.test(v))) return c;
  }
  return -1;
}

/** One source section → blocks, every word kept. */
function sectionBlocks(s: SourceSection): DocBlock[] {
  const blocks: DocBlock[] = [];
  const paras = reflow(s.text.split("\n"));
  let bullets: string[] = [];
  let kv: [string, string][] = [];
  const flush = () => {
    if (bullets.length) blocks.push({ type: "bullets", items: bullets });
    if (kv.length >= 3) blocks.push({ type: "table", header: ["항목", "내용"], rows: kv.map(([k, v]) => [k, v]) });
    else for (const [k, v] of kv) blocks.push({ type: "paragraph", text: `${k}: ${v}` });
    bullets = [];
    kv = [];
  };
  for (const p of paras) {
    const kvm = KV.exec(p);
    if (BULLET.test(p)) {
      if (kv.length) flush();
      bullets.push(p.replace(BULLET, (m, mark) => (/\d|[가-하]|[①-⑳]/.test(mark) ? m.trim() + " " : "")).trim());
    } else if (kvm && p.length <= 160) {
      if (bullets.length) flush();
      kv.push([kvm[1].trim(), kvm[2].trim()]);
    } else {
      flush();
      blocks.push({ type: "paragraph", text: p });
    }
  }
  flush();
  for (const t of s.tables) {
    const header = t.rows[0];
    const body = t.rows.slice(1);
    const looksHeader = header && body.length > 0 && header.every((c) => c && !/^\d[\d,.]*$/.test(c));
    const rows = looksHeader ? body : t.rows;
    const head = looksHeader ? header : t.rows[0].map((_, i) => `열 ${i + 1}`);
    blocks.push({ type: "table", header: head, rows });
    const col = numericColumn(rows);
    if (col > 0) {
      const values = rows.map((r) => Number((r[col] ?? "").replace(/[^\d.]/g, "")) || 0);
      if (values.some((v) => v > 0)) blocks.push({ type: "chart", kind: "bar", title: head[col] ?? "", labels: rows.map((r) => r[0] ?? ""), values, caption: "원문 표의 수치를 그래프로 표시", basis: "source" });
    }
  }
  return blocks;
}

export const DESIGN_SCHEMA = {
  type: "object",
  properties: {
    tone: { type: "string", enum: ["formal", "modern", "premium", "warm", "technical", "minimal"], description: "문서의 성격과 독자에 맞는 디자인 톤" },
    accent: { type: "string", description: "주조색 hex" },
    density: { type: "string", enum: ["airy", "standard", "compact"] },
    numbering: { type: "boolean", description: "원문에 번호가 없을 때 장 번호를 붙일지" },
    highlights: {
      type: "array",
      maxItems: 12,
      description: "강조 상자로 보여 줄 문장 — 그 섹션 원문에 있는 문장을 한 글자도 바꾸지 말고 그대로",
      items: { type: "object", properties: { section_id: { type: "string" }, label: { type: "string", description: "짧은 라벨 (핵심, 목표, 유의사항 등)" }, sentence: { type: "string" } }, required: ["section_id", "label", "sentence"] },
    },
    kpis: {
      type: "array",
      maxItems: 12,
      description: "숫자 카드로 보여 줄 핵심 수치 — label과 value 모두 그 섹션 원문에 있는 표현 그대로",
      items: { type: "object", properties: { section_id: { type: "string" }, label: { type: "string" }, value: { type: "string" } }, required: ["section_id", "label", "value"] },
    },
    rationale: { type: "string", description: "디자인 선택 이유 두세 문장" },
  },
  required: ["tone", "accent", "density", "numbering", "highlights", "kpis", "rationale"],
} as const;

export const DESIGN_SYSTEM = [
  "당신은 문서 디자이너입니다. 이 작업은 디자인 작업이며 내용은 한 글자도 바꾸지 않습니다.",
  "문서의 성격·독자·밀도를 보고 디자인 톤과 주조색을 정하고, 독자가 빨리 파악해야 할 문장과 수치를 골라 강조합니다.",
  "강조할 문장과 수치는 반드시 해당 섹션 원문에 있는 그대로여야 합니다. 요약하거나 고쳐 쓴 문장은 모두 버려집니다.",
].join("\n");

const flat = (t: string) => t.replace(/\s+/g, "");

export interface DesignChoice {
  design: DesignSystem;
  highlights: { sectionId: string; label: string; sentence: string }[];
  kpis: { sectionId: string; label: string; value: string }[];
  rationale: string;
}

/** Keeps only highlights and figures that are verbatim in their section. */
export function parseDesign(raw: unknown, docs: SourceDoc[]): DesignChoice {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = new Map(docs.flatMap((d) => d.sections).map((s) => [s.id, flat(`${s.title}\n${s.text}\n${s.tables.map((t) => t.rows.flat().join(" ")).join(" ")}`)]));
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
  const sid = (v: unknown) => String(v ?? "").replace(/[[\]]/g, "");
  const tones = ["formal", "modern", "premium", "warm", "technical", "minimal"] as const;
  return {
    design: {
      tone: tones.includes(r.tone as "formal") ? (r.tone as DesignSystem["tone"]) : "formal",
      accent: /^#[0-9a-f]{6}$/i.test(String(r.accent)) ? String(r.accent) : "#1F4E79",
      density: (["airy", "standard", "compact"] as const).includes(r.density as "airy") ? (r.density as DesignSystem["density"]) : "standard",
      numbering: r.numbering === true,
    },
    highlights: list(r.highlights)
      .map((h) => ({ sectionId: sid(h.section_id), label: String(h.label ?? "핵심").slice(0, 20), sentence: String(h.sentence ?? "").trim() }))
      .filter((h) => h.sentence.length >= 10 && (text.get(h.sectionId) ?? "").includes(flat(h.sentence))),
    kpis: list(r.kpis)
      .map((k) => ({ sectionId: sid(k.section_id), label: String(k.label ?? "").trim(), value: String(k.value ?? "").trim() }))
      .filter((k) => k.label && /\d/.test(k.value) && (text.get(k.sectionId) ?? "").includes(flat(k.value)) && (text.get(k.sectionId) ?? "").includes(flat(k.label))),
    rationale: String(r.rationale ?? "").slice(0, 400),
  };
}

/** The beautified document: the source verbatim, laid out, with the chosen design and highlights. */
export function beautifyDocument(docs: SourceDoc[], design: DesignChoice, title?: string): LongDocument {
  const sections: DocSection[] = [];
  for (const d of docs) {
    for (const s of d.sections) {
      const blocks = sectionBlocks(s);
      const kpis = design.kpis.filter((k) => k.sectionId === s.id).slice(0, 4);
      if (kpis.length) blocks.unshift({ type: "kpis", items: kpis.map((k) => ({ label: k.label, value: k.value })) });
      for (const h of design.highlights.filter((x) => x.sectionId === s.id).slice(0, 2)) blocks.push({ type: "callout", label: h.label, text: h.sentence });
      sections.push({ id: `p${sections.length + 1}`, number: s.number && !/^\d+(\.\d+)*$/.test(s.number) ? s.number : undefined, title: s.title || (sections.length === 0 ? d.name.replace(/\.[a-z0-9]+$/i, "") : ""), level: s.level, blocks, sourceRefs: [s.id], status: "kept" });
    }
  }
  const first = docs[0];
  return { title: title || first?.sections.find((s) => s.title)?.title || first?.name.replace(/\.[a-z0-9]+$/i, "") || "", subtitle: "", docType: "", design: design.design, sections };
}
