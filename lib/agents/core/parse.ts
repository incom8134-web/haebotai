import JSZip from "jszip";
import { buildSource, linesFromText, type SourceDoc, type SourceLine } from "./source.ts";

// Uploads → SourceDoc. Each format keeps the hints it has: Word heading
// styles, bold runs and tables; PowerPoint slide titles and tables; PDF
// lines with their font size and page; HTML headings. Nothing is cut off
// here — size limits are the caller's (the upload limit is 30 MB).

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

const runsText = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g"))].map((m) => decodeXml(m[1])).join("");

/** styleId → heading level, from word/styles.xml ("heading 1" … or an outline level). */
function headingStyles(stylesXml: string | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!stylesXml) return out;
  for (const m of stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const [, id, body] = m;
    const name = /<w:name w:val="([^"]+)"/.exec(body)?.[1]?.toLowerCase() ?? "";
    const outline = /<w:outlineLvl w:val="(\d)"/.exec(body)?.[1];
    const h = /^(?:heading|제목)\s*(\d)$/.exec(name)?.[1];
    if (h) out.set(id, Number(h));
    else if (name === "title") out.set(id, 1);
    else if (outline !== undefined && Number(outline) < 6) out.set(id, Number(outline) + 1);
  }
  return out;
}

export function docxLines(documentXml: string, stylesXml?: string): SourceLine[] {
  const styles = headingStyles(stylesXml);
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(documentXml)?.[1] ?? documentXml;
  const lines: SourceLine[] = [];
  // Top-level tables and paragraphs, in order.
  const rx = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g;
  for (const m of body.matchAll(rx)) {
    const xml = m[0];
    if (xml.startsWith("<w:tbl>")) {
      for (const row of xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
        const cells = [...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) =>
          [...c[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => runsText(p[0], "w:t")).filter(Boolean).join(" "),
        );
        if (cells.some(Boolean)) lines.push({ text: cells.join(" | "), cells });
      }
      continue;
    }
    const text = runsText(xml, "w:t");
    if (!text.trim()) continue;
    const styleId = /<w:pStyle w:val="([^"]+)"/.exec(xml)?.[1];
    const outline = /<w:outlineLvl w:val="(\d)"/.exec(xml)?.[1];
    const runs = [...xml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].filter((r) => /<w:t[\s>]/.test(r[0]));
    const bold = runs.length > 0 && runs.every((r) => /<w:b(?:\s+w:val="(?:1|true)")?\s*\/>/.test(r[0]));
    const level = (styleId && styles.get(styleId)) || (outline !== undefined ? Number(outline) + 1 : undefined);
    lines.push({ text, headingLevel: level, bold });
  }
  return lines;
}

export async function parseDocx(name: string, bytes: Uint8Array): Promise<SourceDoc> {
  const zip = await JSZip.loadAsync(bytes);
  const doc = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const styles = await zip.file("word/styles.xml")?.async("string");
  return buildSource(name, "docx", docxLines(doc, styles));
}

export async function parsePptx(name: string, bytes: Uint8Array): Promise<SourceDoc> {
  const zip = await JSZip.loadAsync(bytes);
  const slides = Object.keys(zip.files)
    .map((n) => /^ppt\/slides\/slide(\d+)\.xml$/.exec(n))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]));
  const lines: SourceLine[] = [];
  for (const m of slides) {
    const xml = await zip.file(m[0])!.async("string");
    const shapes = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((s) => s[0]);
    const titleShape = shapes.find((s) => /<p:ph[^>]*type="(?:title|ctrTitle)"/.test(s));
    const title = titleShape ? [...titleShape.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)].map((p) => runsText(p[0], "a:t")).filter(Boolean).join(" ") : "";
    const slide = Number(m[1]);
    lines.push({ text: title || `슬라이드 ${slide}`, headingLevel: 1, page: slide });
    for (const s of shapes) {
      if (s === titleShape) continue;
      for (const p of s.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
        const t = runsText(p[0], "a:t").trim();
        if (t) lines.push({ text: t, page: slide });
      }
    }
    for (const tbl of xml.matchAll(/<a:tbl>[\s\S]*?<\/a:tbl>/g)) {
      for (const row of tbl[0].matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)) {
        const cells = [...row[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map((c) => runsText(c[0], "a:t"));
        if (cells.some(Boolean)) lines.push({ text: cells.join(" | "), cells, page: slide });
      }
    }
  }
  return buildSource(name, "pptx", lines, { pages: slides.length });
}

interface PdfItem {
  str: string;
  height?: number;
  y?: number;
  hasEOL?: boolean;
  transform?: number[];
}

/** PDF text items (per page) → lines with font size and page. */
function pdfLines(pages: PdfItem[][]): SourceLine[] {
  const out: SourceLine[] = [];
  pages.forEach((items, p) => {
    let text = "";
    let size = 0;
    let y: number | null = null;
    const flush = () => {
      const t = text.replace(/\s+/g, " ").trim();
      // Running page numbers ("- 3 -", "3 / 26") are noise.
      if (t && !/^[-–\s]*\d{1,3}\s*[-–]?\s*$|^\d{1,3}\s*\/\s*\d{1,3}$/.test(t)) out.push({ text: t, size: size || undefined, page: p + 1 });
      text = "";
      size = 0;
    };
    for (const it of items) {
      const iy = it.y ?? it.transform?.[5] ?? null;
      if (y !== null && iy !== null && Math.abs(iy - y) > 2 && text.trim()) flush();
      if (iy !== null) y = iy;
      text += it.str;
      if ((it.height ?? 0) > size && it.str.trim()) size = it.height ?? 0;
      if (it.hasEOL) flush();
    }
    flush();
  });
  return out;
}

export async function parsePdf(name: string, bytes: Uint8Array): Promise<SourceDoc> {
  const { getDocumentProxy, extractTextItems } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { items, totalPages } = (await extractTextItems(pdf)) as unknown as { items: PdfItem[][]; totalPages: number };
  return buildSource(name, "pdf", pdfLines(items), { pages: totalPages });
}

function parseHtml(name: string, html: string): SourceDoc {
  const md = html
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, inner) => `\n${"#".repeat(Number(n))} ${inner.replace(/<[^>]+>/g, " ")}\n`)
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return buildSource(name, "html", linesFromText(decodeXml(md)));
}

export function parseText(name: string, text: string, kind: SourceDoc["kind"] = "text"): SourceDoc {
  return buildSource(name, /\.md$/i.test(name) ? "markdown" : kind, linesFromText(text));
}

/** Any supported upload → SourceDoc, or null for images and unknown types. */
export async function parseUpload(name: string, bytes: Uint8Array): Promise<SourceDoc | null> {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return parsePdf(name, bytes);
  if (ext === "docx") return parseDocx(name, bytes);
  if (ext === "pptx") return parsePptx(name, bytes);
  if (ext === "html" || ext === "htm") return parseHtml(name, new TextDecoder().decode(bytes));
  if (["txt", "md", "csv"].includes(ext)) return parseText(name, new TextDecoder().decode(bytes));
  return null;
}
