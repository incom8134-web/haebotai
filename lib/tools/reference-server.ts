import JSZip from "jszip";
import { z } from "zod";
import { REFERENCE_LIMITS, referenceModesFor, type ReferenceBundle } from "./reference.ts";
import type { ImagePart } from "./generate-prompt.ts";

// Server side of "참고 자료": validates what the run page sent, turns
// documents into text the model can read (DOCX paragraphs, PPTX slide by
// slide, plain text; HTML stripped to its words), and keeps images and
// PDFs as parts Gemini reads natively. Files arrive as paths in the
// user's own folder of the "inputs" bucket (the browser uploads them
// directly, up to 30 MB), are read once here and then deleted. Nothing
// is stored raw — the run row keeps only the command, the text and the
// file names. Large photos are scaled down to what a model can use.

const referenceSchema = z
  .object({
    mode: z.string().max(40).optional(),
    text: z.string().max(REFERENCE_LIMITS.maxTextChars).optional(),
    files: z
      .array(z.union([z.object({ name: z.string().max(200), path: z.string().max(400) }), z.object({ name: z.string().max(200), dataUrl: z.string() })]))
      .max(REFERENCE_LIMITS.maxFiles)
      .optional(),
  })
  .optional();

const MAX_TEXT = 80_000;
/** Longest side a reference photo keeps; plenty for a model to read style and detail. */
const MAX_IMAGE_SIDE = 2048;

/** Reading a stored upload (and cleaning it up afterwards) — supplied by the route. */
export interface ReferenceStore {
  /** Folder every path must sit in: the user's own ("<uid>/"). */
  prefix: string;
  download(path: string): Promise<Buffer | null>;
  remove(paths: string[]): Promise<void>;
}

/** A photo re-encoded to at most 2048px JPEG when it's bigger than a model needs. */
export async function shrinkImage(bytes: Buffer, mime: string): Promise<{ data: Buffer; mimeType: string }> {
  if (bytes.length <= 1.5 * 1024 * 1024) return { data: bytes, mimeType: mime };
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(bytes).rotate().resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return { data, mimeType: "image/jpeg" };
  } catch {
    return { data: bytes, mimeType: mime };
  }
}

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

/** Storage paths of the uploaded reference files in a raw "참고 자료" payload (for cleanup when a run ends). */
export function referencePaths(raw: unknown, prefix: string): string[] {
  const parsed = referenceSchema.safeParse(raw);
  if (!parsed.success) return [];
  return (parsed.data?.files ?? []).flatMap((f) => ("path" in f && f.path.startsWith(prefix) ? [f.path] : []));
}

export async function buildReference(
  toolId: string,
  raw: unknown,
  store?: ReferenceStore,
): Promise<{ ok: true; bundle: ReferenceBundle | null } | { ok: false; error: string }> {
  const parsed = referenceSchema.safeParse(raw);
  const stored = parsed.success ? (parsed.data?.files ?? []).flatMap((f) => ("path" in f ? [f.path] : [])) : [];
  try {
    return await readReference(toolId, parsed, store);
  } finally {
    // Uploads are read once; never keep the raw files around.
    if (store && stored.length) await store.remove(stored.filter((p) => p.startsWith(store.prefix))).catch(() => {});
  }
}

async function readReference(
  toolId: string,
  parsed: ReturnType<typeof referenceSchema.safeParse>,
  store: ReferenceStore | undefined,
): Promise<{ ok: true; bundle: ReferenceBundle | null } | { ok: false; error: string }> {
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
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    let bytes: Buffer;
    let sentMime = "";
    if ("path" in file) {
      if (!store || !file.path.startsWith(store.prefix) || file.path.includes("..")) return { ok: false, error: `${file.name}: 파일을 찾을 수 없습니다` };
      const got = await store.download(file.path);
      if (!got) return { ok: false, error: `${file.name}: 올린 파일을 읽지 못했습니다. 다시 올려 주세요` };
      bytes = got;
    } else {
      const match = /^data:([^;]*);base64,([A-Za-z0-9+/=\s]*)$/.exec(file.dataUrl);
      if (!match) return { ok: false, error: `${file.name}: 파일을 읽지 못했습니다` };
      sentMime = match[1];
      bytes = Buffer.from(match[2], "base64");
    }
    const mime = EXT_MIME[ext] ?? sentMime;
    total += bytes.length;
    if (total > REFERENCE_LIMITS.maxTotalBytes) return { ok: false, error: "참고 파일은 합쳐서 30MB까지 올릴 수 있습니다" };

    try {
      if (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp") {
        const img = await shrinkImage(bytes, mime);
        images.push({ mimeType: img.mimeType, data: img.data.toString("base64") });
      } else if (mime === "application/pdf") documents.push({ mimeType: mime, data: bytes.toString("base64") });
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
  const slideCount = (text.match(/^\[슬라이드 \d+\]$/gm) ?? []).length || undefined;
  return { ok: true, bundle: { mode, text, fileNames: files.map((f) => f.name), images, documents, slideCount } };
}

/** What the run row keeps: no file bytes. */
export function referenceForStorage(bundle: ReferenceBundle) {
  return { mode: bundle.mode.id, text: bundle.text.slice(0, 20_000), files: bundle.fileNames };
}
