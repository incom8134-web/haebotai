import "server-only";
import PDFDocument from "pdfkit";
import { plainMarkdownLines, type ExportDoc } from "./document.ts";
import { pretendard } from "./fonts.ts";
import { chartPng } from "./chart-png.ts";
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
  const pdf = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 56, right: 56 }, bufferPages: true, info: { Title: doc.title } });
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
  const accent = doc.report?.palette[0] ?? ACCENT;
  const bottom = () => pdf.page.height - 70;
  const ensure = (h: number) => {
    if (pdf.y + h > bottom()) pdf.addPage();
  };
  const smallTitle = (title?: string, estimated?: boolean) => {
    if (!title && !estimated) return;
    ensure(40);
    pdf.font("ko-bold").fontSize(11).fillColor(INK).text(title ?? "", 56, undefined, { width, continued: Boolean(estimated) });
    if (estimated) pdf.font("ko").fontSize(9).fillColor(WARN).text("  추정");
    pdf.moveDown(0.3);
  };

  const kpiRow = (items: { label: string; value: string; note?: string }[]) => {
    const cols = Math.min(4, items.length);
    const gap = 8;
    const w = (width - gap * (cols - 1)) / cols;
    for (let r = 0; r < items.length; r += cols) {
      const row = items.slice(r, r + cols);
      const h = 58;
      ensure(h + 8);
      const y = pdf.y;
      row.forEach((k, i) => {
        const x = 56 + i * (w + gap);
        pdf.roundedRect(x, y, w, h, 8).fillOpacity(0.08).fill(accent).fillOpacity(1);
        pdf.font("ko").fontSize(8.5).fillColor(MUTED).text(k.label, x + 10, y + 9, { width: w - 20, lineBreak: false, ellipsis: true });
        pdf.font("ko-bold").fontSize(k.value.length > 12 ? 11 : 15).fillColor(accent).text(k.value, x + 10, y + 23, { width: w - 20, height: 20, lineBreak: false, ellipsis: true });
        if (k.note) pdf.font("ko").fontSize(8).fillColor(MUTED).text(k.note, x + 10, y + 43, { width: w - 20, lineBreak: false, ellipsis: true });
      });
      pdf.x = 56;
      pdf.y = y + h + 8;
    }
    pdf.moveDown(0.4);
  };

  const drawTable = (header: string[], rows: string[][], align: ("l" | "r" | "c")[] = [], totalRow = false) => {
    const n = header.length;
    // Column widths follow content length (header counts double), clamped.
    const weight = header.map((h, i) => Math.min(40, Math.max(6, h.length * 2, ...rows.map((r) => (r[i] ?? "").length))));
    const total = weight.reduce((a, b) => a + b, 0);
    const widths = weight.map((w) => (w / total) * width);
    const pad = 6;
    const size = n > 4 ? 8.5 : 9.5;
    const rowHeight = (cells: string[], bold = false) => {
      pdf.font(bold ? "ko-bold" : "ko").fontSize(size);
      return Math.max(...cells.map((c, i) => pdf.heightOfString(c || " ", { width: widths[i] - pad * 2, lineGap: 1.5 }))) + pad * 2;
    };
    const drawRow = (cells: string[], y: number, h: number, opts: { head?: boolean; fill?: string; bold?: boolean }) => {
      if (opts.fill) pdf.rect(56, y, width, h).fill(opts.fill);
      let x = 56;
      cells.forEach((c, i) => {
        const a = align[i] === "r" ? "right" : align[i] === "c" ? "center" : "left";
        pdf.font(opts.head || opts.bold ? "ko-bold" : "ko").fontSize(size).fillColor(opts.head ? "#FFFFFF" : i === 0 ? INK : "#3A4046");
        pdf.text(c, x + pad, y + pad, { width: widths[i] - pad * 2, align: a, lineGap: 1.5 });
        x += widths[i];
      });
      pdf.moveTo(56, y + h).lineTo(56 + width, y + h).lineWidth(0.5).strokeColor("#E1E4E8").stroke();
    };
    const headH = rowHeight(header, true);
    ensure(headH + 30);
    let y = pdf.y;
    drawRow(header, y, headH, { head: true, fill: accent });
    y += headH;
    rows.forEach((r, ri) => {
      const cells = header.map((_, i) => r[i] ?? "");
      const isTotal = totalRow && ri === rows.length - 1;
      const h = rowHeight(cells, isTotal);
      if (y + h > bottom()) {
        pdf.addPage();
        y = pdf.y;
        drawRow(header, y, headH, { head: true, fill: accent });
        y += headH;
      }
      drawRow(cells, y, h, { fill: isTotal ? "#EEF1F6" : ri % 2 ? "#F8F9FB" : undefined, bold: isTotal });
      y += h;
    });
    pdf.x = 56;
    pdf.y = y + 10;
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
      // A section heading needs room for what follows it, or it's left alone at the page foot.
      if (pdf.y > pdf.page.height - (b.level === 1 ? 240 : 140)) pdf.addPage();
      pdf.moveDown(b.level === 1 ? 0.6 : 0.3);
      pdf.font("ko-bold").fontSize(SIZES[b.level]).fillColor(b.level === 1 ? accent : INK).text(b.text, 56, undefined, { width, continued: Boolean(b.estimated) });
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
    } else if (b.type === "kpis") {
      kpiRow(b.items);
    } else if (b.type === "table") {
      smallTitle(b.title);
      drawTable(b.header, b.rows, b.align, b.totalRow);
      if (b.caption) para(b.caption, { size: 8.5, color: MUTED, gap: 0.6 });
    } else if (b.type === "chart") {
      const png = chartPng(b.chart, b.palette);
      if (!png) continue;
      const size = fit({ width: png.width, height: png.height }, width, 330);
      ensure(size.height + (b.title ? 30 : 10));
      smallTitle(b.title, b.estimated);
      ensure(size.height + 6);
      pdf.image(png.data, 56 + (width - size.width) / 2, pdf.y, size);
      pdf.y += size.height + 6;
      if (b.caption) para(b.caption, { size: 8.5, color: MUTED, gap: 0.6 });
      pdf.moveDown(0.3);
    } else if (b.type === "callout") {
      pdf.font("ko-bold").fontSize(10.5);
      const h = pdf.heightOfString(b.text, { width: width - 28, lineGap: 3 }) + 34;
      ensure(h + 8);
      const y = pdf.y;
      pdf.rect(56, y, width, h).fillOpacity(0.08).fill(accent).fillOpacity(1);
      pdf.rect(56, y, 3, h).fill(accent);
      pdf.font("ko-bold").fontSize(8.5).fillColor(accent).text(b.label, 70, y + 9, { width: width - 28 });
      pdf.font("ko-bold").fontSize(10.5).fillColor(INK).text(b.text, 70, y + 23, { width: width - 28, lineGap: 3 });
      pdf.x = 56;
      pdf.y = y + h + 10;
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
    for (const [i, s] of doc.sources.entries()) {
      // Search-grounding links are long redirect URLs: show the site, keep the link.
      const site = s.domain ?? (() => { try { return new URL(s.url).hostname; } catch { return ""; } })();
      pdf.font("ko").fontSize(9.5).fillColor(INK).text(`[${i + 1}] ${s.title}`, 56, undefined, { width, lineGap: 2, link: s.url });
      if (site && site !== s.title && !site.includes("vertexaisearch")) pdf.fillColor(accent).fontSize(8.5).text(site, { width, link: s.url, lineGap: 2 });
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
