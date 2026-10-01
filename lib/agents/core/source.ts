// The source model: an uploaded document as a document — outline,
// sections in order, pages, tables, numbers — instead of one string cut
// off at 80,000 characters. Every stage works from this: the analyzer
// reads the whole outline, the planner maps plan sections to source
// sections, writers retrieve the parts they need (retrieve.ts), the
// beautifier keeps every section verbatim, and the verifier checks order
// and coverage against it.
//
// Builders take what each format gives: Word paragraphs with their styles,
// slides, PDF lines with their font size, Markdown or plain text.
//
// Pure logic (tested).

export interface SourceTable {
  rows: string[][];
}

export interface SourceSection {
  /** Stable id: "s1", "s2"… in document order. */
  id: string;
  /** Outline number as the document wrote it ("1.", "Ⅱ", "제3장") or derived ("2.1"). */
  number: string;
  title: string;
  level: number;
  /** First page this section appears on (1-based), when the format has pages. */
  page?: number;
  /** Body text, verbatim, paragraphs separated by newlines. */
  text: string;
  tables: SourceTable[];
}

export interface SourceDoc {
  id: string;
  name: string;
  kind: "pdf" | "docx" | "pptx" | "text" | "markdown" | "html" | "pasted";
  pages?: number;
  sections: SourceSection[];
  stats: { chars: number; words: number; sections: number; tables: number; numbers: number };
}

/** One line of a document with whatever hints the format gives. */
export interface SourceLine {
  text: string;
  /** Font size (PDF) — bigger than the body means a heading. */
  size?: number;
  /** Word heading level from the paragraph style (1 = Heading 1). */
  headingLevel?: number;
  page?: number;
  /** A table row: cells. */
  cells?: string[];
  bold?: boolean;
}

// ── Heading detection ──────────────────────────────────────────────────

// Korean and English outline numbering, most to least significant.
const NUMBERING: { rx: RegExp; level: number }[] = [
  { rx: /^(제\s*\d+\s*[장편부])\s*/, level: 1 },
  { rx: /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)[.\s]\s*/, level: 1 },
  { rx: /^((?:Chapter|Part|Section)\s+\d+)[.:\s]\s*/i, level: 1 },
  { rx: /^(\d{1,2})\.\s+(?=\S)/, level: 2 },
  { rx: /^(\d{1,2}\.\d{1,2})\.?\s+(?=\S)/, level: 3 },
  { rx: /^(\d{1,2}\.\d{1,2}\.\d{1,2})\.?\s+(?=\S)/, level: 4 },
  { rx: /^([가-하])\.\s+(?=\S)/, level: 4 },
  { rx: /^(\d{1,2})\)\s+(?=\S)/, level: 5 },
];

export function numberingOf(line: string): { number: string; level: number; title: string } | null {
  const t = line.trim();
  for (const n of NUMBERING) {
    const m = n.rx.exec(t);
    if (m) return { number: m[1].replace(/\s+/g, ""), level: n.level, title: t.slice(m[0].length).trim() || t };
  }
  return null;
}

/** A line that reads like a heading, not a sentence: short, no sentence ending. */
function headingShaped(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 70) return false;
  // Table-of-contents lines ("1. 개요 ······ 3") are not the headings themselves.
  if (/[·…]{3,}|\.{4,}/.test(t)) return false;
  if (!/[가-힣A-Za-z]{2,}/.test(t)) return false;
  if (/[.!?。]$|[다요죠음함임됨]\.?$/.test(t) && t.length > 25) return false;
  if (/^[-•·*▪○●□■◦※]/.test(t)) return false;
  if (/^[\d\s.,%원천만억]+$/.test(t)) return false;
  return true;
}

/** The most common font size among body-length lines (the PDF's body text). */
function bodySize(lines: SourceLine[]): number | null {
  const counts = new Map<number, number>();
  for (const l of lines) {
    if (!l.size || l.text.trim().length < 20) continue;
    const s = Math.round(l.size * 2) / 2;
    counts.set(s, (counts.get(s) ?? 0) + l.text.length);
  }
  let best: number | null = null;
  let max = 0;
  for (const [s, n] of counts) {
    if (n > max) {
      max = n;
      best = s;
    }
  }
  return best;
}

function levelOf(line: SourceLine, body: number | null): { level: number; number: string; title: string } | null {
  const text = line.text.trim();
  if (!text || line.cells) return null;
  if (line.headingLevel) {
    const n = numberingOf(text);
    return { level: line.headingLevel, number: n?.number ?? "", title: n?.title ?? text };
  }
  const n = numberingOf(text);
  const bigger = body && line.size ? line.size >= body * 1.18 : false;
  // A numbered line at body size is a heading only when it's short (else it's a numbered list item).
  if (n && headingShaped(n.title) && (bigger || line.bold || n.level === 1 || (n.title.length <= 40 && !/[,，]/.test(n.title)) || !body)) return { level: bigger ? Math.min(n.level, 2) : n.level, number: n.number, title: n.title };
  if (bigger && headingShaped(text)) return { level: line.size! >= (body ?? 10) * 1.5 ? 1 : 2, number: "", title: text };
  return null;
}

// ── Building ───────────────────────────────────────────────────────────

const NUMBER_RX = /\d[\d,.]*\s*(%|퍼센트|원|천원|만원|억원|억|만|천|명|개|건|곳|개소|년|개월|월|일|시간|분|초|배|위|kg|km|㎡|평|TB|GB)?/g;

export function countNumbers(text: string): number {
  return (text.match(NUMBER_RX) ?? []).filter((n) => /\d{2,}|\d[.,]\d|%|원|명|개/.test(n)).length;
}

/**
 * Lines → sections. Text before the first heading becomes an untitled
 * opening section; tables stay inside the section they appear in. With no
 * headings at all the document is split into even parts so retrieval
 * still works.
 */
export function buildSource(name: string, kind: SourceDoc["kind"], lines: SourceLine[], opts: { id?: string; pages?: number } = {}): SourceDoc {
  const body = bodySize(lines);
  const sections: SourceSection[] = [];
  let cur: SourceSection | null = null;
  let tableRows: string[][] | null = null;
  const counters: number[] = [];
  const flushTable = () => {
    if (cur && tableRows?.length) cur.tables.push({ rows: tableRows });
    tableRows = null;
  };
  const open = (title: string, level: number, number: string, page?: number) => {
    flushTable();
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    counters.length = level;
    cur = { id: `s${sections.length + 1}`, number: number || counters.map((c) => c ?? 1).join("."), title, level, page, text: "", tables: [] };
    sections.push(cur);
  };
  for (const line of lines) {
    const text = line.text.replace(/\s+/g, " ").trim();
    if (line.cells) {
      if (!cur) open("", 1, "", line.page);
      (tableRows ??= []).push(line.cells.map((c) => c.replace(/\s+/g, " ").trim()));
      continue;
    }
    if (!text) continue;
    const h = levelOf(line, body);
    if (h) {
      open(h.title, h.level, h.number, line.page);
      continue;
    }
    if (!cur) open("", 1, "", line.page);
    flushTable();
    const c = cur as unknown as SourceSection;
    c.text = c.text ? `${c.text}\n${text}` : text;
  }
  flushTable();
  // Headings with nothing under them merge into the next section's title path.
  const merged = sections.filter((s, i) => s.text || s.tables.length || i === sections.length - 1 || sections[i + 1]?.level <= s.level);
  const final = merged.length > 1 || (merged[0]?.title ?? "") ? merged : splitEvenly(merged[0]?.text ?? "", merged[0]?.tables ?? []);
  final.forEach((s, i) => (s.id = `s${i + 1}`));
  const all = final.map((s) => `${s.title}\n${s.text}\n${s.tables.map((t) => t.rows.map((r) => r.join(" | ")).join("\n")).join("\n")}`).join("\n");
  return {
    id: opts.id ?? name,
    name,
    kind,
    pages: opts.pages,
    sections: final,
    stats: {
      chars: all.replace(/\s+/g, "").length,
      words: all.split(/\s+/).filter(Boolean).length,
      sections: final.length,
      tables: final.reduce((n, s) => n + s.tables.length, 0),
      numbers: countNumbers(all),
    },
  };
}

function splitEvenly(text: string, tables: SourceTable[]): SourceSection[] {
  const paras = text.split("\n").filter(Boolean);
  const size = 2400;
  const out: SourceSection[] = [];
  let buf: string[] = [];
  let len = 0;
  for (const p of paras) {
    buf.push(p);
    len += p.length;
    if (len >= size) {
      out.push({ id: "", number: String(out.length + 1), title: "", level: 1, text: buf.join("\n"), tables: [] });
      buf = [];
      len = 0;
    }
  }
  if (buf.length || out.length === 0) out.push({ id: "", number: String(out.length + 1), title: "", level: 1, text: buf.join("\n"), tables: [] });
  if (tables.length) out[0].tables = tables;
  return out;
}

/** Markdown / plain text → lines (Markdown headings carry their level). */
export function linesFromText(text: string): SourceLine[] {
  const out: SourceLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const md = /^(#{1,6})\s+(.*)$/.exec(raw.trim());
    if (md) out.push({ text: md[2], headingLevel: md[1].length });
    else if (/^\|.*\|$/.test(raw.trim()) && !/^\|[\s:|-]+\|$/.test(raw.trim())) out.push({ text: raw, cells: raw.trim().slice(1, -1).split("|") });
    else if (!/^\|[\s:|-]+\|$/.test(raw.trim())) out.push({ text: raw });
  }
  return out;
}

/** The outline every planning prompt reads: numbered titles, pages and size per section. */
export function outlineText(doc: SourceDoc, max = 120): string {
  const rows = doc.sections.slice(0, max).map((s) => {
    const indent = "  ".repeat(Math.max(0, s.level - 1));
    const size = s.text.replace(/\s+/g, "").length;
    return `${indent}[${s.id}] ${s.number ? `${s.number} ` : ""}${s.title || "(제목 없음)"}${s.page ? ` · p.${s.page}` : ""} · ${size}자${s.tables.length ? ` · 표 ${s.tables.length}` : ""}`;
  });
  return [
    `${doc.name} (${kindLabel(doc.kind)}${doc.pages ? `, ${doc.pages}쪽` : ""}, ${doc.stats.chars.toLocaleString()}자, 섹션 ${doc.stats.sections}개, 표 ${doc.stats.tables}개)`,
    ...rows,
    doc.sections.length > max ? `… 외 ${doc.sections.length - max}개 섹션` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function kindLabel(kind: SourceDoc["kind"]): string {
  return { pdf: "PDF", docx: "Word", pptx: "PowerPoint", text: "텍스트", markdown: "Markdown", html: "웹페이지", pasted: "붙여 넣은 글" }[kind];
}

/** A section as prompt text, verbatim, with its tables. */
export function sectionText(s: SourceSection): string {
  return [
    `### [${s.id}] ${s.number ? `${s.number} ` : ""}${s.title || "(제목 없음)"}${s.page ? ` (p.${s.page})` : ""}`,
    s.text,
    ...s.tables.map((t) => t.rows.map((r) => `| ${r.join(" | ")} |`).join("\n")),
  ]
    .filter(Boolean)
    .join("\n");
}

/** The whole document as prompt text (callers check the size first). */
export function fullText(doc: SourceDoc): string {
  return doc.sections.map(sectionText).join("\n\n");
}

/** Characters per page of a typical A4 document in this language mix (for page estimates). */
export function charsPerPage(sample: string): number {
  const hangul = (sample.match(/[가-힣]/g) ?? []).length;
  const letters = (sample.match(/[A-Za-z]/g) ?? []).length;
  return hangul >= letters ? 1100 : 2600;
}

/** Section ids unique across several uploaded documents (s1…sN in upload order). */
export function renumber(docs: SourceDoc[]): SourceDoc[] {
  let n = 0;
  return docs.map((d) => ({ ...d, sections: d.sections.map((s) => ({ ...s, id: `s${++n}` })) }));
}
