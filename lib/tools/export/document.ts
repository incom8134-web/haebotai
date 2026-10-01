import type { Source } from "../registry/shared.ts";
import { asCompactPair, formatPrimitive, humanize, isSourceArray, titleKeyOf } from "../output-labels.ts";
import { buildReport } from "../report/index.ts";
import type { ChartSpec } from "../report/charts.ts";
import type { Report } from "../report/types.ts";
import { deckChartSpec, deckPalette, type DeckChart } from "../report/deck.ts";

// One export model for every tool: a run's JSON output becomes an
// outline of headings, paragraphs, bullet lists and images, which the
// md / docx / pdf / pptx writers in this folder each render. Same walk
// as the on-screen StructuredResult, so a download reads like the
// result the user just saw — no per-tool export code except the few
// shapes that need it (presentation slides, blog markdown).

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string; estimated?: boolean }
  | { type: "paragraph"; text: string }
  | { type: "field"; label: string; value: string }
  | { type: "bullets"; items: string[] }
  | { type: "image"; url: string; caption?: string }
  | { type: "markdown"; text: string }
  // Report blocks (data tools): drawn as tiles, real tables and charts.
  | { type: "kpis"; items: { label: string; value: string; note?: string }[] }
  | { type: "table"; title?: string; header: string[]; rows: string[][]; align?: ("l" | "r" | "c")[]; totalRow?: boolean; caption?: string }
  | { type: "chart"; title?: string; chart: ChartSpec; palette: string[]; caption?: string; estimated?: boolean }
  | { type: "callout"; label: string; text: string };

export interface ExportSlide {
  title: string;
  points: string[];
  notes?: string;
}

export interface ExportDoc {
  title: string;
  subtitle: string;
  /** The kind of document (tool name), for covers. */
  eyebrow?: string;
  blocks: Block[];
  sources: Source[];
  /** Presentation tool only: its own slide list, used as-is for .pptx. */
  slides?: ExportSlide[];
  /** The run's structured output, for writers that lay out tables and cards. */
  output?: unknown;
  /** Data tools: the report the result page shows, for writers that lay it out natively (pptx). */
  report?: Report;
}

/** A deck as a document: each slide a section, its layout's data as a chart, table or tiles. */
export function deckBlocks(o: Record<string, unknown>): Block[] {
  const out: Block[] = [];
  const accent = typeof o.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(o.accent_color) ? o.accent_color : "#4D7CFE";
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x ?? "")).filter(Boolean) : []);
  if (s(o.subtitle)) out.push({ type: "paragraph", text: s(o.subtitle) });
  if (typeof o.cover_image_url === "string") out.push({ type: "image", url: o.cover_image_url });
  if (s(o.storyline)) out.push({ type: "callout", label: "이야기 흐름", text: s(o.storyline) });
  (Array.isArray(o.slides) ? o.slides : []).forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const sl = raw as Record<string, unknown>;
    out.push({ type: "heading", level: 1, text: `${String(i + 1).padStart(2, "0")}. ${s(sl.headline) || s(sl.title) || `슬라이드 ${i + 1}`}` });
    const stat = sl.stat as Record<string, unknown> | undefined;
    if (sl.layout === "big_number" && stat?.value) out.push({ type: "kpis", items: [{ label: s(stat.label), value: s(stat.value), note: s(stat.context) || undefined }] });
    const chart = sl.chart as DeckChart | undefined;
    const spec = sl.layout === "chart" ? deckChartSpec(chart) : null;
    if (spec) out.push({ type: "chart", chart: spec, palette: deckPalette(accent), caption: s(chart?.takeaway) || undefined, estimated: chart?.source === "estimate" });
    const table = sl.table as { header?: unknown; rows?: unknown } | undefined;
    if (sl.layout === "table" && Array.isArray(table?.rows)) out.push({ type: "table", header: list(table?.header), rows: (table!.rows as unknown[]).map(list) });
    const cmp = sl.compare as Record<string, unknown> | undefined;
    if (sl.layout === "comparison" && cmp) {
      const l = list(cmp.left_points);
      const r = list(cmp.right_points);
      out.push({ type: "table", header: [s(cmp.left_title), s(cmp.right_title)], rows: Array.from({ length: Math.max(l.length, r.length) }, (_, k) => [l[k] ?? "", r[k] ?? ""]) });
    }
    if (sl.layout === "process" && Array.isArray(sl.steps)) {
      out.push({ type: "table", header: ["단계", "내용"], rows: (sl.steps as Record<string, unknown>[]).map((st, k) => [`${k + 1}. ${s(st?.title)}`, s(st?.text)]) });
    }
    const quote = sl.quote as Record<string, unknown> | undefined;
    if (sl.layout === "quote" && quote?.text) out.push({ type: "callout", label: s(quote.source) || "인용", text: s(quote.text) });
    const points = list(sl.points);
    if (points.length) out.push({ type: "bullets", items: points });
    if (typeof sl.image_url === "string") out.push({ type: "image", url: sl.image_url });
    if (s(sl.speaker_notes)) out.push({ type: "field", label: "발표 메모", value: s(sl.speaker_notes) });
  });
  if (s(o.closing_ask)) out.push({ type: "heading", level: 1, text: "요청" }, { type: "callout", label: "오늘의 요청", text: s(o.closing_ask) });
  return out;
}

/** Tools whose report hero title is the document's own title (not a conclusion). */
const DOCUMENT_TITLED = new Set(["proposal", "business-plan", "presentation", "grant", "sop-builder", "meeting-action"]);

/** A report as export blocks: sections become level-1 headings, cards become sub-headings with facts. */
export function reportBlocks(report: Report): { blocks: Block[]; sources: Source[] } {
  const out: Block[] = [];
  const sources: Source[] = [];
  if (report.hero.subtitle) out.push({ type: "paragraph", text: report.hero.subtitle });
  if (report.hero.kpis?.length) out.push({ type: "kpis", items: report.hero.kpis.map((k) => ({ label: k.label, value: k.value, note: k.note })) });
  for (const section of report.sections) {
    const onlySources = section.blocks.every((b) => b.type === "sources");
    if (!onlySources) out.push({ type: "heading", level: 1, text: section.title });
    // A lead that only repeats the summary above isn't printed twice.
    if (section.lead && section.lead !== report.hero.subtitle) out.push({ type: "paragraph", text: section.lead });
    for (const b of section.blocks) {
      switch (b.type) {
        case "kpis":
          out.push({ type: "kpis", items: b.items.map((k) => ({ label: k.label, value: k.value, note: k.note })) });
          break;
        case "chart":
          out.push({ type: "chart", title: b.title, chart: b.chart, palette: report.palette, caption: b.caption, estimated: b.estimated });
          break;
        case "table":
          out.push({ type: "table", title: b.title, header: b.header, rows: b.rows, align: b.align, totalRow: b.totalRow, caption: b.caption });
          break;
        case "text":
          if (b.title) out.push({ type: "heading", level: 2, text: b.title });
          out.push({ type: "paragraph", text: b.text });
          break;
        case "callout":
          out.push({ type: "callout", label: b.label, text: b.text });
          break;
        case "bullets":
          if (b.title) out.push({ type: "heading", level: 2, text: b.title });
          out.push({ type: "bullets", items: b.style === "num" ? b.items.map((it, i) => `${i + 1}. ${it}`) : b.items });
          break;
        case "cards":
          if (b.title) out.push({ type: "heading", level: 2, text: b.title });
          for (const c of b.items) {
            out.push({ type: "heading", level: 3, text: [c.kicker, c.title].filter(Boolean).join(" · ") + (c.badge ? ` [${c.badge}]` : "") });
            if (c.meter) out.push({ type: "field", label: "지표", value: c.meter.label });
            for (const f of c.facts ?? []) out.push({ type: "field", label: f.label, value: f.value });
            if (c.lines?.length) out.push({ type: "bullets", items: c.lines });
          }
          break;
        case "quad": {
          const depth = Math.max(...b.cells.map((c) => c.items.length));
          out.push({
            type: "table",
            title: b.title,
            header: b.cells.map((c) => c.title),
            rows: Array.from({ length: depth }, (_, i) => b.cells.map((c) => c.items[i] ?? "")),
          });
          break;
        }
        case "image":
          out.push({ type: "image", url: b.url, caption: b.caption });
          break;
        case "sources":
          sources.push(...b.items);
          break;
      }
    }
  }
  return { blocks: out, sources };
}

// Machine fields that mean nothing in a document.
export const SKIP_KEYS = new Set(["asset_id", "seed", "zip_asset_id", "preview_url", "svg", "html", "negative_prompt", "refined_prompt", "data_source", "model_seed", "hero_image_prompt", "accent_color", "design", "creative_direction", "request_brief", "agent", "financial_assumptions", "plan_type"]);
// A string this short with no line break reads best as "label: value".
const INLINE_MAX = 80;

function text(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return formatPrimitive(key, value);
  return null;
}

export function imageUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//.test(value) && /\.(png|jpe?g|webp)(\?|$)/i.test(value)) return value;
  if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") {
    const url = (value as { url: string }).url;
    return /^https?:\/\//.test(url) ? url : null;
  }
  return null;
}

// Image URLs come from model-produced JSON, so a prompt-injected URL could
// point the server-side export fetch at internal hosts. Only our own
// storage is fetched.
export function isAllowedImageUrl(url: string, storageOrigin: string | undefined): boolean {
  if (!storageOrigin) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.origin === new URL(storageOrigin).origin && u.pathname.startsWith("/storage/v1/");
  } catch {
    return false;
  }
}

function walkField(key: string, value: unknown, level: 1 | 2 | 3, out: Block[], sources: Source[]): void {
  if (SKIP_KEYS.has(key) || value === null || value === undefined || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  if (isSourceArray(value)) {
    sources.push(...value);
    return;
  }
  const label = humanize(key);

  // A photo URL (cover_image_url, a slot's image_url) is a picture, not text.
  const photo = typeof value === "string" ? imageUrl(value) : null;
  if (photo) {
    out.push({ type: "image", url: photo, caption: label });
    return;
  }

  const scalar = text(key, value);
  if (scalar !== null) {
    if (key === "body_markdown") {
      out.push({ type: "heading", level, text: label }, { type: "markdown", text: scalar });
    } else if (level > 1 && scalar.length <= INLINE_MAX && !scalar.includes("\n")) {
      out.push({ type: "field", label, value: scalar });
    } else {
      out.push({ type: "heading", level, text: label }, { type: "paragraph", text: scalar });
    }
    return;
  }

  if (Array.isArray(value)) {
    const images = value.map(imageUrl).filter((u): u is string => u !== null);
    if (images.length === value.length) {
      out.push({ type: "heading", level, text: label });
      images.forEach((url, i) => out.push({ type: "image", url, caption: `${label} ${i + 1}` }));
      return;
    }
    if (value.every((v) => typeof v !== "object" || v === null)) {
      out.push({ type: "heading", level, text: label }, { type: "bullets", items: value.map((v) => text(key, v) ?? "").filter(Boolean) });
      return;
    }
    const objects = value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v));
    out.push({ type: "heading", level, text: label });
    if (objects.every((o) => asCompactPair(o))) {
      out.push({
        type: "bullets",
        items: objects.map((o) => {
          const pair = asCompactPair(o)!;
          return `${pair.label} ${pair.text}`;
        }),
      });
      return;
    }
    const itemLevel = (level < 3 ? level + 1 : 3) as 2 | 3;
    objects.forEach((obj, i) => walkItem(obj, `${label} ${i + 1}`, itemLevel, out, sources));
    return;
  }

  if (typeof value === "object") {
    const url = imageUrl(value);
    if (url) {
      out.push({ type: "image", url, caption: label });
      return;
    }
    out.push({ type: "heading", level, text: label, estimated: (value as Record<string, unknown>).data_source === "estimated" });
    const childLevel = (level < 3 ? level + 1 : 3) as 2 | 3;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) walkField(k, v, childLevel, out, sources);
  }
}

function walkItem(obj: Record<string, unknown>, fallbackTitle: string, level: 2 | 3, out: Block[], sources: Source[]): void {
  const titleKey = titleKeyOf(obj);
  const estimated = obj.data_source === "estimated";
  out.push({ type: "heading", level, text: titleKey ? String(obj[titleKey]) : fallbackTitle, estimated });
  const childLevel = 3 as const;
  for (const [k, v] of Object.entries(obj)) {
    if (k === titleKey) continue;
    const url = k === "image" || k === "url" || k.endsWith("image_url") ? imageUrl(k === "url" ? obj : v) : null;
    if (url) {
      out.push({ type: "image", url, caption: titleKey ? String(obj[titleKey]) : fallbackTitle });
      continue;
    }
    walkField(k, v, childLevel, out, sources);
  }
}

export function buildExportDoc(params: {
  toolName: string;
  toolId: string;
  output: unknown;
  input?: unknown;
  sources: Source[];
  brandName?: string | null;
  createdAt?: string | null;
}): ExportDoc {
  const { toolName, toolId, output } = params;
  const blocks: Block[] = [];
  const sources: Source[] = [];
  const o = (output ?? {}) as Record<string, unknown>;

  const { creative_direction: _direction, ...rest } = o;
  void _direction;
  const report = buildReport(toolId, rest, params.input);
  if (report) {
    if (Array.isArray(o.mood_board)) {
      for (const img of o.mood_board) {
        const url = imageUrl(img);
        if (url) blocks.push({ type: "image", url, caption: typeof (img as { caption?: unknown }).caption === "string" ? (img as { caption: string }).caption : undefined });
      }
    }
    const converted = reportBlocks(report);
    blocks.push(...converted.blocks);
    sources.push(...converted.sources);
  } else if (toolId === "presentation" && Array.isArray(o.slides)) {
    blocks.push(...deckBlocks(o));
  } else {
    for (const [k, v] of Object.entries(o)) walkField(k, v, 1, blocks, sources);
  }

  if (typeof o.html === "string") {
    blocks.push({ type: "paragraph", text: "완성된 HTML 파일은 결과 화면의 'HTML 다운로드'로 받을 수 있습니다." });
  }

  // Run-level sources first, then any found inside the output; dedupe by URL.
  const seen = new Set<string>();
  const allSources = [...params.sources, ...sources].filter((s) => !seen.has(s.url) && Boolean(seen.add(s.url)));

  const date = params.createdAt ? new Date(params.createdAt) : new Date();
  const subtitle = [params.brandName, date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })]
    .filter(Boolean)
    .join(" · ");

  let slides: ExportSlide[] | undefined;
  if (toolId === "presentation" && Array.isArray(o.slides)) {
    slides = (o.slides as Record<string, unknown>[]).map((s, i) => ({
      title: typeof s.headline === "string" ? s.headline : typeof s.title === "string" ? s.title : `슬라이드 ${i + 1}`,
      points: Array.isArray(s.points) ? s.points.map(String) : [],
      notes: typeof s.speaker_notes === "string" ? s.speaker_notes : undefined,
    }));
  }

  if (report) {
    // A document's own title for documents; for analyses the hero title is
    // the conclusion ("먼저: 매장 판매 + 구독"), so the file is named for
    // what it is and the conclusion leads the subtitle.
    const named = DOCUMENT_TITLED.has(toolId) || !report.hero.title;
    const name = params.brandName ? `${params.brandName} ${toolName}` : toolName;
    return {
      title: named ? report.hero.title || name : name,
      subtitle: named ? `${report.hero.eyebrow} · ${subtitle}` : `${report.hero.title} · ${subtitle}`,
      eyebrow: report.hero.eyebrow || toolName,
      blocks,
      sources: allSources,
      output,
      report,
    };
  }
  return { title: toolName, subtitle, eyebrow: toolName, blocks, sources: allSources, slides, output };
}

/** Section = a level-1 heading and everything under it (for slides). */
export function splitSections(blocks: Block[]): { title: string; blocks: Block[] }[] {
  const sections: { title: string; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.type === "heading" && b.level === 1) sections.push({ title: b.estimated ? `${b.text} (추정)` : b.text, blocks: [] });
    else {
      if (sections.length === 0) sections.push({ title: "", blocks: [] });
      sections[sections.length - 1].blocks.push(b);
    }
  }
  return sections;
}

/** Strip the markdown syntax a plain-text writer (docx/pdf/pptx) can't render. */
export function plainMarkdownLines(md: string): { text: string; heading: boolean; bullet: boolean }[] {
  return md
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const heading = /^#{1,6}\s/.test(line);
      const bullet = /^\s*([-*]|\d+\.)\s/.test(line);
      const clean = line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^\s*([-*]|\d+\.)\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
      return { text: clean, heading, bullet };
    });
}
