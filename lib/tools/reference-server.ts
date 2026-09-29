import JSZip from "jszip";
import { z } from "zod";
import { REFERENCE_LIMITS, referenceModesFor, type ReferenceBundle } from "./reference.ts";
import type { ImagePart } from "./generate-prompt.ts";

// Server side of "참고 자료": validates what the run page sent, turns
// documents into text the model can read (DOCX paragraphs, PPTX slide by
// slide, plain text; HTML stripped to its words), and keeps images and
// PDFs as parts Gemini reads natively. Nothing here is stored raw — the
// run row keeps only the command, the text and the file names.

const referenceSchema = z
  .object({
    mode: z.string().max(40).optional(),
    text: z.string().max(REFERENCE_LIMITS.maxTextChars).optional(),
    files: z.array(z.object({ name: z.string().max(200), dataUrl: z.string() })).max(REFERENCE_LIMITS.maxFiles).optional(),
  })
  .optional();

const MAX_TEXT = 30_000;

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

/** Paragraph text of runs matching `tag` (w:t for Word, a:t for slides). */
function xmlParagraphs(xml: string, paragraphTag: string, textTag: string): string[] {
  return xml
    .split(new RegExp(`</${paragraphTag}>`))
    .map((p) => [...p.matchAll(new RegExp(`<${textTag}(?:\\s[^>]*)?>([^<]*)</${textTag}>`, "g"))].map((m) => decodeXml(m[1])).join(""))
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function docxText(bytes: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  return xml ? xmlParagraphs(xml, "w:p", "w:t").join("\n") : "";
}

export async function pptxText(bytes: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const slides = Object.keys(zip.files)
    .map((name) => /^ppt\/slides\/slide(\d+)\.xml$/.exec(name))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]));
  const out: string[] = [];
  for (const m of slides) {
    const xml = await zip.file(m[0])!.async("string");
    const lines = xmlParagraphs(xml, "a:p", "a:t");
    if (lines.length) out.push(`[슬라이드 ${m[1]}]\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}

export function htmlText(html: string): string {
  return decodeXml(
    html
      .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/section)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
};

export async function buildReference(
  toolId: string,
  raw: unknown,
): Promise<{ ok: true; bundle: ReferenceBundle | null } | { ok: false; error: string }> {
  const parsed = referenceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "참고 자료 형식이 올바르지 않습니다" };
  const ref = parsed.data;
  const pasted = ref?.text?.trim() ?? "";
  const files = ref?.files ?? [];
  if (!pasted && files.length === 0) return { ok: true, bundle: null };

  const modes = referenceModesFor(toolId);
  const mode = modes.find((m) => m.id === ref?.mode) ?? modes[0];
  const images: ImagePart[] = [];
  const documents: ImagePart[] = [];
  const texts: string[] = pasted ? [pasted] : [];
  let total = 0;

  for (const file of files) {
    const match = /^data:([^;]*);base64,([A-Za-z0-9+/=\s]*)$/.exec(file.dataUrl);
    if (!match) return { ok: false, error: `${file.name}: 파일을 읽지 못했습니다` };
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = EXT_MIME[ext] ?? match[1];
    const bytes = Buffer.from(match[2], "base64");
    total += bytes.length;
    if (total > REFERENCE_LIMITS.maxTotalBytes) return { ok: false, error: "참고 파일은 합쳐서 3MB까지 올릴 수 있습니다" };

    try {
      if (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp") images.push({ mimeType: mime, data: match[2] });
      else if (mime === "application/pdf") documents.push({ mimeType: mime, data: match[2] });
      else if (ext === "docx") texts.push(`[파일: ${file.name}]\n${await docxText(bytes)}`);
      else if (ext === "pptx") texts.push(`[파일: ${file.name}]\n${await pptxText(bytes)}`);
      else if (ext === "html" || mime === "text/html") texts.push(`[파일: ${file.name}]\n${htmlText(bytes.toString("utf8"))}`);
      else if (mime.startsWith("text/") || ["txt", "md", "csv"].includes(ext)) texts.push(`[파일: ${file.name}]\n${bytes.toString("utf8")}`);
      else return { ok: false, error: `${file.name}: 이미지, PDF, Word, PowerPoint, 텍스트 파일만 올릴 수 있습니다` };
    } catch {
      return { ok: false, error: `${file.name}: 파일 내용을 읽지 못했습니다` };
    }
  }

  let text = texts.join("\n\n").trim();
  if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}\n…(이후 생략)`;
  return { ok: true, bundle: { mode, text, fileNames: files.map((f) => f.name), images, documents } };
}

/** What the run row keeps: no file bytes. */
export function referenceForStorage(bundle: ReferenceBundle) {
  return { mode: bundle.mode.id, text: bundle.text.slice(0, 20_000), files: bundle.fileNames };
}
