import "server-only";
import PptxGenJS from "pptxgenjs";
import { plainMarkdownLines, splitSections, type Block, type ExportDoc } from "./document.ts";
import { fetchAll, fit, imageSize } from "./images.ts";

// PowerPoint export for any tool: a title slide, then one or more slides
// per top-level section (long sections continue on "(계속)" slides). The
// presentation tool's own slide list is used as-is, with its speaker
// notes as slide notes.

const FONT = "Malgun Gothic";
const INK = "16181A";

const ACCENT = "4D7CFE";
// Rough capacity of the 16:9 body box at 14pt before text shrinks too far.
const CHARS_PER_SLIDE = 700;

type Line = { text: string; bold?: boolean; bullet?: boolean; indent?: number };

function linesOf(blocks: Block[]): (Line | { image: string; caption?: string })[] {
  const out: (Line | { image: string; caption?: string })[] = [];
  for (const b of blocks) {
    if (b.type === "heading") out.push({ text: b.estimated ? `${b.text} (추정)` : b.text, bold: true });
    else if (b.type === "paragraph") b.text.split("\n").filter((l) => l.trim()).forEach((l) => out.push({ text: l }));
    else if (b.type === "field") out.push({ text: `${b.label}: ${b.value}` });
    else if (b.type === "bullets") b.items.forEach((i) => out.push({ text: i, bullet: true }));
    else if (b.type === "markdown") plainMarkdownLines(b.text).forEach((l) => out.push({ text: l.text, bold: l.heading, bullet: l.bullet }));
    else if (b.type === "image") out.push({ image: b.url, caption: b.caption });
  }
  return out;
}

export async function buildPptx(doc: ExportDoc): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = doc.title;
  pptx.company = "해봇 AI";

  const title = pptx.addSlide();
  title.background = { color: "0E1116" };
  title.addText(doc.title, { x: 0.8, y: 2.6, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 40, bold: true, color: "FFFFFF" });
  title.addText(doc.subtitle, { x: 0.8, y: 3.9, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 16, color: "AEB4BB" });

  const addTextSlide = (heading: string, lines: Line[], notes?: string) => {
    const slide = pptx.addSlide();
    slide.addText(heading, { x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontFace: FONT, fontSize: 26, bold: true, color: INK });
    slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.25, w: 1.2, h: 0.06, fill: { color: ACCENT }, line: { color: ACCENT } });
    if (lines.length) {
      slide.addText(
        lines.map((l) => ({ text: l.text, options: { bold: l.bold, bullet: l.bullet ? { indent: 18 } : false, breakLine: true, color: l.bold ? INK : "30353A", paraSpaceAfter: 6 } })),
        { x: 0.6, y: 1.5, w: 12.1, h: 5.5, fontFace: FONT, fontSize: 14, valign: "top", fit: "shrink" },
      );
    }
    if (notes) slide.addNotes(notes);
  };

  if (doc.slides?.length) {
    for (const s of doc.slides) addTextSlide(s.title, s.points.map((p) => ({ text: p, bullet: true })), s.notes);
  } else {
    const images = await fetchAll(doc.blocks.flatMap((b) => (b.type === "image" ? [b.url] : [])));
    for (const section of splitSections(doc.blocks)) {
      let batch: Line[] = [];
      let size = 0;
      let part = 0;
      const flush = () => {
        if (!batch.length) return;
        addTextSlide(part++ ? `${section.title} (계속)` : section.title || doc.title, batch);
        batch = [];
        size = 0;
      };
      for (const item of linesOf(section.blocks)) {
        if ("image" in item) {
          flush();
          const img = images.get(item.image);
          if (!img) continue;
          const slide = pptx.addSlide();
          slide.addText(item.caption ?? section.title, { x: 0.6, y: 0.4, w: 12.1, h: 0.8, fontFace: FONT, fontSize: 22, bold: true, color: INK });
          const box = fit(imageSize(img), 11.5 * 96, 5.6 * 96);
          const w = box.width / 96;
          const h = box.height / 96;
          slide.addImage({ data: `data:image/${img.type === "png" ? "png" : "jpeg"};base64,${img.data.toString("base64")}`, x: (13.33 - w) / 2, y: 1.4, w, h });
          part++;
          continue;
        }
        if (size + item.text.length > CHARS_PER_SLIDE && batch.length) flush();
        batch.push(item);
        size += item.text.length + 20;
      }
      flush();
    }
  }

  if (doc.sources.length) {
    addTextSlide("출처", doc.sources.slice(0, 14).map((s) => ({ text: `${s.title} — ${s.url}`, bullet: true })));
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

