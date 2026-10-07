import type { ChartSpec } from "../../tools/report/charts.ts";
import type { Report, ReportBlock, ReportSection } from "../../tools/report/types.ts";

// A long document as the document agent builds it: sections in the
// plan's order, each made of typed blocks (paragraphs, lists, tables,
// charts, process diagrams, callouts, images), each section tagged with
// the source sections it rests on and how it relates to the original
// (kept verbatim, rewritten, new). Rendered through the existing report
// model, so the result page and the PDF / Word / PowerPoint / Markdown
// exports draw it without a new renderer.
//
// Pure logic (tested).

export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[]; ordered?: boolean }
  | { type: "table"; header: string[]; rows: string[][]; caption?: string }
  | { type: "chart"; kind: "bar" | "line" | "donut"; title: string; labels: string[]; values: number[]; unit?: string; caption?: string; basis: "source" | "research" | "assumption" }
  | { type: "timeline"; title?: string; items: { label: string; start: number; end: number; note?: string }[]; unit: string }
  | { type: "process"; title?: string; steps: { title: string; text: string }[] }
  | { type: "kpis"; items: { label: string; value: string; note?: string }[] }
  | { type: "callout"; label: string; text: string; tone?: "accent" | "warn" }
  | { type: "image"; prompt: string; caption: string; url?: string; asset_id?: string };

export type SectionStatus = "kept" | "polished" | "rewritten" | "new";

export interface Claim {
  text: string;
  basis: "source" | "research" | "input" | "assumption";
  ref?: string;
}

export interface DocSection {
  id: string;
  number?: string;
  title: string;
  level: number;
  purpose?: string;
  blocks: DocBlock[];
  sourceRefs: string[];
  status: SectionStatus;
  claims?: Claim[];
  /** One line for the next writer (continuity) and the outline. */
  summary?: string;
}

export interface DesignSystem {
  tone: "formal" | "modern" | "premium" | "warm" | "technical" | "minimal";
  accent: string;
  density: "airy" | "standard" | "compact";
  numbering: boolean;
}

export interface LongDocument {
  title: string;
  subtitle: string;
  docType: string;
  design: DesignSystem;
  sections: DocSection[];
}

const DEFAULT_DESIGN: DesignSystem = { tone: "formal", accent: "#1F4E79", density: "standard", numbering: true };

const TONE_PALETTE: Record<DesignSystem["tone"], string[]> = {
  formal: ["#1F4E79", "#4A7AB0", "#8FB0D6", "#C9D8EA", "#5B6770"],
  modern: ["#3B5BDB", "#15AABF", "#40C057", "#FAB005", "#868E96"],
  premium: ["#1C1C1E", "#B08D57", "#6E5B3E", "#D8C3A5", "#8E8E93"],
  warm: ["#C2410C", "#EA580C", "#F59E0B", "#FCD34D", "#78716C"],
  technical: ["#0F766E", "#0EA5E9", "#6366F1", "#94A3B8", "#334155"],
  minimal: ["#111827", "#6B7280", "#9CA3AF", "#D1D5DB", "#374151"],
};

/** Plain text of a block (for length, lint and preservation checks). */
export function blockText(b: DocBlock): string {
  switch (b.type) {
    case "paragraph":
      return b.text;
    case "bullets":
      return b.items.join("\n");
    case "table":
      return [b.header.join(" "), ...b.rows.map((r) => r.join(" ")), b.caption ?? ""].join("\n");
    case "chart":
      return [b.title, b.labels.map((l, i) => `${l} ${b.values[i] ?? ""}`).join(" "), b.caption ?? ""].join("\n");
    case "timeline":
      return [b.title ?? "", ...b.items.map((i) => `${i.label} ${i.note ?? ""}`)].join("\n");
    case "process":
      return [b.title ?? "", ...b.steps.map((s) => `${s.title} ${s.text}`)].join("\n");
    case "kpis":
      return b.items.map((k) => `${k.label} ${k.value} ${k.note ?? ""}`).join("\n");
    case "callout":
      return `${b.label} ${b.text}`;
    case "image":
      return b.caption;
  }
}

function sectionPlainText(s: DocSection): string {
  return [s.title, ...s.blocks.map(blockText)].join("\n");
}

export function documentChars(doc: LongDocument): number {
  return doc.sections.map(sectionPlainText).join("\n").replace(/\s+/g, "").length;
}

/** Visual blocks (not paragraphs or lists). */
export function visualCount(doc: LongDocument): number {
  return doc.sections.reduce((n, s) => n + s.blocks.filter((b) => !["paragraph", "bullets"].includes(b.type)).length, 0);
}

/**
 * Estimated A4 pages: text at the language's density plus space for each
 * visual. The rendered PDF's real count overrides this when available.
 */
export function estimatePages(doc: LongDocument, charsPerPage: number): number {
  const visuals = doc.sections.reduce(
    (n, s) => n + s.blocks.reduce((m, b) => m + (b.type === "image" ? 0.45 : b.type === "chart" || b.type === "timeline" ? 0.35 : b.type === "table" ? 0.12 + 0.03 * b.rows.length : b.type === "process" ? 0.25 : b.type === "kpis" ? 0.12 : b.type === "callout" ? 0.08 : 0), 0),
    0,
  );
  const level1 = doc.sections.filter((s) => s.level <= 1).length;
  // Chapters start on a new page in the export: half a page lost each on average.
  return Math.max(1, Math.round((documentChars(doc) / charsPerPage + visuals + level1 * 0.3 + 1) * 10) / 10);
}

function toChart(b: Extract<DocBlock, { type: "chart" }>): ChartSpec {
  if (b.kind === "donut") return { kind: "donut", slices: b.labels.map((label, i) => ({ label, value: b.values[i] ?? 0 })), unit: b.unit };
  if (b.kind === "line") return { kind: "line", categories: b.labels, series: [{ name: b.title, values: b.values }], unit: b.unit };
  return { kind: "bar", categories: b.labels, series: [{ name: b.title, values: b.values }], unit: b.unit };
}

function toReportBlocks(blocks: DocBlock[]): ReportBlock[] {
  const out: ReportBlock[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "paragraph":
        if (b.text.trim()) out.push({ type: "text", text: b.text });
        break;
      case "bullets":
        if (b.items.length) out.push({ type: "bullets", items: b.items, style: b.ordered ? "num" : "dot" });
        break;
      case "table":
        if (b.rows.length) out.push({ type: "table", header: b.header, rows: b.rows, caption: b.caption });
        break;
      case "chart":
        if (b.labels.length && b.values.some((v) => v !== 0)) out.push({ type: "chart", title: b.title, chart: toChart(b), caption: b.caption, estimated: b.basis === "assumption" });
        break;
      case "timeline": {
        if (!b.items.length) break;
        const end = Math.max(...b.items.map((i) => i.end));
        out.push({ type: "chart", title: b.title, chart: { kind: "gantt", scale: Array.from({ length: Math.max(1, Math.ceil(end)) }, (_, i) => `${i + 1}${b.unit}`), rows: b.items.map((i) => ({ label: i.label, start: Math.max(0, i.start - 1), end: Math.max(0, i.end - 1), note: i.note })) } });
        break;
      }
      case "process":
        if (b.steps.length) out.push({ type: "cards", title: b.title, columns: b.steps.length <= 3 ? (b.steps.length as 1 | 2 | 3) : 3, items: b.steps.map((s, i) => ({ kicker: `STEP ${i + 1}`, title: s.title, lines: s.text ? [s.text] : [] })) });
        break;
      case "kpis":
        if (b.items.length) out.push({ type: "kpis", items: b.items });
        break;
      case "callout":
        out.push({ type: "callout", label: b.label, text: b.text, tone: b.tone });
        break;
      case "image":
        if (b.url) out.push({ type: "image", url: b.url, caption: b.caption });
        break;
    }
  }
  return out;
}

/** The document as a report: hero from the title, one report section per document section. */
export function documentReport(doc: LongDocument, eyebrow: string): Report {
  let chapter = 0;
  let sub = 0;
  const sections: ReportSection[] = doc.sections.map((s) => {
    if (s.level <= 1) {
      chapter++;
      sub = 0;
    } else sub++;
    const number = s.number || (doc.design.numbering ? (s.level <= 1 ? String(chapter).padStart(2, "0") : `${chapter}.${sub}`) : "");
    return { id: s.id, kicker: number || undefined, title: s.title, blocks: toReportBlocks(s.blocks) };
  });
  return {
    palette: TONE_PALETTE[doc.design.tone] ?? TONE_PALETTE.formal,
    hero: { eyebrow, title: doc.title, subtitle: doc.subtitle || undefined },
    sections: sections.filter((s) => s.blocks.length || s.title),
  };
}

const s = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** Validates a stored or model-written document (drops malformed blocks). */
export function parseDocument(raw: unknown): LongDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sections = arr(r.sections)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x, i) => ({
      id: s(x.id, 20) || `d${i + 1}`,
      number: s(x.number, 20) || undefined,
      title: s(x.title, 200),
      level: Math.max(1, Math.min(4, Number(x.level) || 1)),
      purpose: s(x.purpose, 300) || undefined,
      blocks: parseBlocks(x.blocks),
      sourceRefs: arr(x.sourceRefs).map((v) => s(v, 20)).filter(Boolean),
      status: (["kept", "polished", "rewritten", "new"] as const).includes(x.status as SectionStatus) ? (x.status as SectionStatus) : "new",
      summary: s(x.summary, 300) || undefined,
    }))
    .filter((x) => x.title || x.blocks.length);
  if (!sections.length) return null;
  const d = (r.design ?? {}) as Record<string, unknown>;
  return {
    title: s(r.title, 200),
    subtitle: s(r.subtitle, 300),
    docType: s(r.docType, 120),
    design: {
      tone: (Object.keys(TONE_PALETTE) as DesignSystem["tone"][]).includes(d.tone as DesignSystem["tone"]) ? (d.tone as DesignSystem["tone"]) : DEFAULT_DESIGN.tone,
      accent: /^#[0-9a-f]{6}$/i.test(String(d.accent)) ? String(d.accent) : DEFAULT_DESIGN.accent,
      density: (["airy", "standard", "compact"] as const).includes(d.density as "airy") ? (d.density as DesignSystem["density"]) : "standard",
      numbering: d.numbering !== false,
    },
    sections,
  };
}

export function parseBlocks(raw: unknown): DocBlock[] {
  const out: DocBlock[] = [];
  for (const b of arr(raw)) {
    if (!b || typeof b !== "object") continue;
    const x = b as Record<string, unknown>;
    const strs = (v: unknown, max = 600) => arr(v).map((t) => s(t, max)).filter(Boolean);
    switch (x.type) {
      case "paragraph":
        if (s(x.text)) out.push({ type: "paragraph", text: s(x.text, 8000) });
        break;
      case "bullets":
        if (strs(x.items).length) out.push({ type: "bullets", items: strs(x.items).slice(0, 30), ordered: x.ordered === true });
        break;
      case "table": {
        const header = strs(x.header, 120).slice(0, 8);
        const rows = arr(x.rows).map((r) => arr(r).map((c) => s(String(c ?? ""), 400)).slice(0, 8)).filter((r) => r.some(Boolean)).slice(0, 60);
        if (rows.length) out.push({ type: "table", header: header.length ? header : rows[0].map((_, i) => `항목 ${i + 1}`), rows, caption: s(x.caption, 300) || undefined });
        break;
      }
      case "chart": {
        const labels = strs(x.labels, 60).slice(0, 16);
        const values = arr(x.values).map(Number).slice(0, labels.length);
        if (labels.length >= 2 && values.length === labels.length && values.every(Number.isFinite))
          out.push({ type: "chart", kind: (["bar", "line", "donut"] as const).includes(x.kind as "bar") ? (x.kind as "bar") : "bar", title: s(x.title, 120), labels, values, unit: s(x.unit, 20) || undefined, caption: s(x.caption, 300) || undefined, basis: (["source", "research", "assumption"] as const).includes(x.basis as "source") ? (x.basis as "source") : "assumption" });
        break;
      }
      case "timeline": {
        const items = arr(x.items)
          .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
          .map((i) => ({ label: s(i.label, 120), start: Math.max(1, Number(i.start) || 1), end: Math.max(1, Number(i.end) || Number(i.start) || 1), note: s(i.note, 200) || undefined }))
          .filter((i) => i.label)
          .map((i) => ({ ...i, end: Math.max(i.start, i.end) }))
          .slice(0, 20);
        if (items.length) out.push({ type: "timeline", title: s(x.title, 120) || undefined, items, unit: s(x.unit, 10) || "개월" });
        break;
      }
      case "process": {
        const steps = arr(x.steps)
          .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
          .map((i) => ({ title: s(i.title, 120), text: s(i.text, 400) }))
          .filter((i) => i.title)
          .slice(0, 8);
        if (steps.length >= 2) out.push({ type: "process", title: s(x.title, 120) || undefined, steps });
        break;
      }
      case "kpis": {
        const items = arr(x.items)
          .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
          .map((i) => ({ label: s(i.label, 60), value: s(i.value, 40), note: s(i.note, 120) || undefined }))
          .filter((i) => i.label && i.value)
          .slice(0, 6);
        if (items.length) out.push({ type: "kpis", items });
        break;
      }
      case "callout":
        if (s(x.text)) out.push({ type: "callout", label: s(x.label, 60) || "핵심", text: s(x.text, 1200), tone: x.tone === "warn" ? "warn" : "accent" });
        break;
      case "image":
        if (s(x.prompt) || s(x.url)) out.push({ type: "image", prompt: s(x.prompt, 600), caption: s(x.caption, 200), url: s(x.url, 2000) || undefined, asset_id: s(x.asset_id, 300) || undefined });
        break;
    }
  }
  return out;
}
