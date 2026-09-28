import type { Source } from "../registry/shared.ts";
import { asCompactPair, formatPrimitive, humanize, isSourceArray, titleKeyOf } from "../output-labels.ts";

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
  | { type: "markdown"; text: string };

export interface ExportSlide {
  title: string;
  points: string[];
  notes?: string;
}

export interface ExportDoc {
  title: string;
  subtitle: string;
  blocks: Block[];
  sources: Source[];
  /** Presentation tool only: its own slide list, used as-is for .pptx. */
  slides?: ExportSlide[];
  /** The run's structured output, for writers that lay out tables and cards. */
  output?: unknown;
}

// Machine fields that mean nothing in a document.
export const SKIP_KEYS = new Set(["asset_id", "seed", "zip_asset_id", "preview_url", "svg", "html", "negative_prompt", "refined_prompt", "data_source", "model_seed", "hero_image_prompt", "accent_color", "design"]);
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
  sources: Source[];
  brandName?: string | null;
  createdAt?: string | null;
}): ExportDoc {
  const { toolName, toolId, output } = params;
  const blocks: Block[] = [];
  const sources: Source[] = [];
  const o = (output ?? {}) as Record<string, unknown>;

  for (const [k, v] of Object.entries(o)) walkField(k, v, 1, blocks, sources);

  if (typeof o.html === "string") {
    blocks.push({ type: "paragraph", text: "완성된 HTML 파일은 결과 화면의 'HTML 다운로드'로 받을 수 있습니다." });
  }

  // Run-level sources first, then any found inside the output; dedupe by URL.
  const seen = new Set<string>();
  const allSources = [...params.sources, ...sources].filter((s) => !seen.has(s.url) && Boolean(seen.add(s.url)));

  const date = params.createdAt ? new Date(params.createdAt) : new Date();
  const subtitle = [params.brandName, date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }), "해봇 AI"]
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

  return { title: toolName, subtitle, blocks, sources: allSources, slides, output };
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
