import "server-only";
import PDFDocument from "pdfkit";
import { plainMarkdownLines, type ExportDoc } from "./document.ts";
import { pretendard } from "./fonts.ts";
import { fetchAll, fit, imageSize } from "./images.ts";

// PDF export for any tool. pdfkit's built-in fonts have no Hangul, so
// Pretendard is embedded (subset) for every run of text.

const INK = "#16181A";
const MUTED = "#6B7075";
const ACCENT = "#4D7CFE";
const WARN = "#B7791F";
const SIZES = { 1: 16, 2: 13, 3: 11.5 } as const;

export async function buildPdf(doc: ExportDoc): Promise<Buffer> {
  const images = await fetchAll(doc.blocks.flatMap((b) => (b.type === "image" ? [b.url] : [])));
  const { regular, bold } = pretendard();
  const pdf = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 56, right: 56 }, bufferPages: true, info: { Title: doc.title, Producer: "해봇 AI" } });
  pdf.registerFont("ko", regular);
  pdf.registerFont("ko-bold", bold);
  const width = pdf.page.width - 112;

  const chunks: Buffer[] = [];
  pdf.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks))));

  const para = (text: string, opts: { font?: string; size?: number; color?: string; gap?: number; indent?: number } = {}) => {
    pdf.font(opts.font ?? "ko").fontSize(opts.size ?? 10.5).fillColor(opts.color ?? INK);
    pdf.text(text, 56 + (opts.indent ?? 0), undefined, { width: width - (opts.indent ?? 0), lineGap: 3 });
    pdf.moveDown(opts.gap ?? 0.45);
  };
  const bulletLine = (text: string) => {
    const y = pdf.y;
    pdf.font("ko").fontSize(10.5).fillColor(ACCENT).text("•", 58, y, { width: 10 });
    pdf.fillColor(INK).text(text, 72, y, { width: width - 16, lineGap: 3 });
    pdf.moveDown(0.25);
  };

  pdf.font("ko-bold").fontSize(22).fillColor(INK).text(doc.title, { width });
  pdf.moveDown(0.3);
  para(doc.subtitle, { color: MUTED, size: 10, gap: 1.2 });

  for (const b of doc.blocks) {
    if (b.type === "heading") {
      if (pdf.y > pdf.page.height - 140) pdf.addPage();
      pdf.moveDown(b.level === 1 ? 0.6 : 0.3);
      pdf.font("ko-bold").fontSize(SIZES[b.level]).fillColor(b.level === 1 ? ACCENT : INK).text(b.text, 56, undefined, { width, continued: Boolean(b.estimated) });
      // Same size as the heading so the next line's spacing stays right.
      if (b.estimated) pdf.font("ko").fillColor(WARN).text("  (추정)");
      pdf.moveDown(0.35);
    } else if (b.type === "paragraph") {
      para(b.text);
    } else if (b.type === "field") {
      pdf.font("ko-bold").fontSize(10.5).fillColor(INK).text(`${b.label}: `, 56, undefined, { width, continued: true, lineGap: 3 });
      pdf.font("ko").text(b.value, { lineGap: 3 });
      pdf.moveDown(0.3);
    } else if (b.type === "bullets") {
      b.items.forEach(bulletLine);
      pdf.moveDown(0.2);
    } else if (b.type === "markdown") {
      for (const line of plainMarkdownLines(b.text)) {
        if (line.heading) para(line.text, { font: "ko-bold", size: 12, gap: 0.3 });
        else if (line.bullet) bulletLine(line.text);
        else para(line.text);
      }
    } else if (b.type === "image") {
      const img = images.get(b.url);
      if (!img) continue;
      const size = fit(imageSize(img), width, 360);
      if (pdf.y + size.height > pdf.page.height - 80) pdf.addPage();
      pdf.image(img.data, 56 + (width - size.width) / 2, pdf.y, size);
      pdf.y += size.height + 6;
      if (b.caption) para(b.caption, { size: 9, color: MUTED, gap: 0.8 });
    }
  }

  if (doc.sources.length) {
    pdf.moveDown(0.6);
    pdf.font("ko-bold").fontSize(SIZES[1]).fillColor(ACCENT).text("출처", 56, undefined, { width });
    pdf.moveDown(0.35);
    for (const s of doc.sources) {
      pdf.font("ko").fontSize(9.5).fillColor(INK).text(s.title, 56, undefined, { width, lineGap: 2 });
      pdf.fillColor(ACCENT).text(s.url, { width, link: s.url, underline: false, lineGap: 2 });
      pdf.moveDown(0.3);
    }
  }

  const range = pdf.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    pdf.switchToPage(range.start + i);
    // Writing inside the bottom margin would otherwise start a new page.
    pdf.page.margins.bottom = 0;
    pdf.font("ko").fontSize(8).fillColor(MUTED).text(`${doc.title} · ${i + 1}/${range.count}`, 56, pdf.page.height - 36, { width, align: "center", lineBreak: false });
  }
  pdf.end();
  return done;
}
