import "server-only";
import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } from "docx";
import { fetchAll, fit, imageSize } from "../images.ts";
import { chartPng } from "../chart-png.ts";
import { designImages, inlineRuns, parseMarkdown, type Block, type Design, type Section } from "./model.ts";

// The designed Word file: the same content as the PDF, laid out with
// Word's own headings, lists and tables so it stays easy to edit (and a
// blog manuscript pastes cleanly into an editor).

const h6 = (hex: string) => hex.replace("#", "").toUpperCase();
function tint(hex: string, t: number): string {
  const n = parseInt(h6(hex), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function readable(hex: string): string {
  const n = parseInt(h6(hex), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "15181E" : "FFFFFF";
}
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "E4E7EC" };

export async function buildDesignedDocx(d: Design): Promise<Buffer> {
  const images = await fetchAll(designImages(d));
  const FONT = d.lang === "en" ? "Calibri" : "Malgun Gothic";
  const A = h6(d.theme.accent);
  const A2 = h6(d.theme.accent2);
  const run = (text: string, o: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) => new TextRun({ text, font: FONT, bold: o.bold, color: o.color, size: o.size, italics: o.italics });
  const richRuns = (text: string, o: { color?: string; size?: number } = {}) => inlineRuns(text).map((r) => run(r.text, { ...o, bold: r.bold }));
  const para = (text: string, o: { color?: string; size?: number; after?: number } = {}) =>
    text
      .split(/\n{2,}/)
      .filter((t) => t.trim())
      .map((t) => new Paragraph({ spacing: { after: o.after ?? 160, line: 340 }, children: t.split("\n").flatMap((line, i) => [...(i ? [new TextRun({ break: 1 })] : []), ...richRuns(line, o)]) }));
  const cell = (children: (Paragraph | Table)[], o: { fill?: string; width?: number; borders?: boolean } = {}) =>
    new TableCell({ children, verticalAlign: VerticalAlign.TOP, margins: { top: 140, bottom: 140, left: 180, right: 180 }, ...(o.fill ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: o.fill } } : {}), ...(o.width ? { width: { size: o.width, type: WidthType.PERCENTAGE } } : {}), ...(o.borders === false ? { borders: { top: NONE, bottom: NONE, left: NONE, right: NONE } } : {}) });
  const grid = (rows: TableCell[][], borders = false, columnWidths?: number[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, ...(columnWidths ? { columnWidths } : {}), rows: rows.map((cells) => new TableRow({ children: cells })), borders: borders ? { top: LINE, bottom: LINE, left: LINE, right: LINE, insideHorizontal: LINE, insideVertical: LINE } : NO_BORDERS });
  // Column shares for a data table: long text gets the room, short labels stay narrow (same rule as the PDF).
  const shares = (header: string[], rows: string[][], n: number) => {
    // Short labels (a name, "작업") get extra room so Word doesn't break them letter by letter.
    const need = (t: string) => (t.length <= 12 ? t.length * 1.8 : t.length);
    const w = Array.from({ length: n }, (_, i) => Math.min(40, Math.max(10, need(header[i] ?? ""), ...rows.map((r) => need(r[i] ?? "")))));
    const total = w.reduce((a, b) => a + b, 0);
    return w.map((x) => (x / total) * 100);
  };
  const space = (after = 160) => new Paragraph({ spacing: { after }, children: [] });
  const imagePara = (url: string, max = 560, caption?: string): Paragraph[] => {
    const img = images.get(url);
    if (!img) return [];
    const size = fit(imageSize(img), max, max * 0.8);
    return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: caption ? 60 : 200 }, children: [new ImageRun({ type: img.type, data: img.data, transformation: size })] }), ...(caption ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(caption, { color: "8A9099", size: 17 })] })] : [])];
  };

  const blocks = (b: Block): (Paragraph | Table)[] => {
    switch (b.t) {
      case "lead":
        return [new Paragraph({ spacing: { after: 240, line: 380 }, children: richRuns(b.text, { size: 26, color: "15181E" }) })];
      case "h2":
        return [new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [run(b.text, { bold: true })] })];
      case "h3":
        return [new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 }, children: [run(b.text, { bold: true })] })];
      case "p":
        return para(b.text);
      case "article": {
        const out: (Paragraph | Table)[] = [];
        const pending = [...(b.photos ?? [])];
        for (const l of parseMarkdown(b.markdown)) {
          if (l.k === "h") {
            out.push(new Paragraph({ heading: l.level === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3, spacing: { before: 280, after: 120 }, children: [run(l.text, { bold: true })] }));
            const i = pending.findIndex((p) => p.after && (l.text.includes(p.after) || p.after.includes(l.text)));
            if (i >= 0) out.push(...imagePara(pending.splice(i, 1)[0].url));
          } else if (l.k === "p") out.push(...para(l.text));
          else if (l.k === "li") out.push(new Paragraph({ ...(l.ordered ? { numbering: undefined } : {}), bullet: { level: 0 }, spacing: { after: 80 }, children: richRuns(l.text) }));
          else if (l.k === "quote") out.push(new Paragraph({ border: { left: { style: BorderStyle.SINGLE, size: 24, color: A, space: 10 } }, indent: { left: 240 }, spacing: { before: 120, after: 160 }, children: richRuns(l.text, { color: "3A4046" }) }));
          else out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [run("* * *", { color: "B0B6C0" })] }));
        }
        for (const p of pending) out.push(...imagePara(p.url, 560, p.caption));
        return out;
      }
      case "image":
        return imagePara(b.url, b.tall ? 600 : 560, b.caption);
      case "bullets":
        return b.items.map((it, i) => new Paragraph({ ...(b.style === "dot" || !b.style ? { bullet: { level: 0 } } : {}), spacing: { after: 90 }, children: [...(b.style === "num" ? [run(`${i + 1}.  `, { bold: true, color: A })] : b.style === "check" ? [run("✓  ", { bold: true, color: A2 })] : []), ...richRuns(it)] }));
      case "quote":
        return [new Paragraph({ border: { left: { style: BorderStyle.SINGLE, size: 36, color: A, space: 12 } }, indent: { left: 280 }, spacing: { before: 160, after: b.by ? 60 : 240, line: 380 }, children: [run(b.text, { bold: true, size: 28, color: "15181E" })] }), ...(b.by ? [new Paragraph({ indent: { left: 280 }, spacing: { after: 240 }, children: [run(`— ${b.by}`, { color: "8A9099" })] })] : [])];
      case "callout": {
        const c = b.tone === "warn" ? "C2410C" : b.tone === "neutral" ? "64748B" : A;
        return [grid([[cell([new Paragraph({ spacing: { after: 60 }, children: [run(b.label, { bold: true, color: c, size: 19 })] }), ...para(b.text, { after: 60 })], { fill: tint(c, 0.92) })]]), space()];
      }
      case "chips":
        return [...(b.label ? [new Paragraph({ spacing: { after: 60 }, children: [run(b.label, { bold: true, color: "8A9099", size: 18 })] })] : []), new Paragraph({ spacing: { after: 200, line: 400 }, children: b.items.flatMap((it, i) => [...(i ? [run("   ")] : []), new TextRun({ text: ` ${it} `, font: FONT, shading: { type: ShadingType.CLEAR, color: "auto", fill: tint(A, 0.86) } })]) })];
      case "swatches": {
        const per = Math.min(3, b.items.length);
        const rows: TableCell[][] = [];
        for (let i = 0; i < b.items.length; i += per) {
          const slice = b.items.slice(i, i + per);
          rows.push(slice.map((it) => cell([new Paragraph({ spacing: { before: 500, after: 500 }, children: [run(" ")] })], { fill: h6(it.hex), width: 100 / per })));
          rows.push(slice.map((it) => cell([new Paragraph({ spacing: { after: 40 }, children: [run(it.name, { bold: true })] }), new Paragraph({ spacing: { after: 40 }, children: [run([it.hex, it.role].filter(Boolean).join("  ·  "), { color: "8A9099", size: 18 })] }), ...(it.usage ? [new Paragraph({ children: [run(it.usage, { size: 18 })] })] : [])], { width: 100 / per })));
        }
        return [grid(rows), space(240)];
      }
      case "type":
        return [grid(b.items.map((it) => [cell([new Paragraph({ spacing: { after: 60 }, children: [run(`${it.role}  ·  ${[it.family, it.weight].filter(Boolean).join(" ")}`, { bold: true, color: A, size: 18 })] }), new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: it.sample, font: it.family || FONT, size: 40, bold: true })] }), ...(it.why ? [new Paragraph({ children: [run(it.why, { color: "6B7280", size: 18 })] })] : [])], { fill: "F5F6F8" })])), space(240)];
      case "dodont":
        return [grid([[cell([new Paragraph({ spacing: { after: 100 }, children: [run(`✓  ${b.doTitle}`, { bold: true, color: "15803D" })] }), ...b.dos.map((x) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [run(x)] }))], { fill: "EEF8F1", width: 50 }), cell([new Paragraph({ spacing: { after: 100 }, children: [run(`✕  ${b.dontTitle}`, { bold: true, color: "B91C1C" })] }), ...b.donts.map((x) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [run(x)] }))], { fill: "FCEFEF", width: 50 })]]), space(240)];
      case "cards": {
        const rows: TableCell[][] = [];
        for (let i = 0; i < b.items.length; i += b.cols) {
          rows.push(
            b.items.slice(i, i + b.cols).map((c) =>
              cell(
                [
                  ...(c.image ? imagePara(c.image, b.cols === 1 ? 520 : b.cols === 2 ? 260 : 170) : []),
                  ...(c.kicker ? [new Paragraph({ spacing: { after: 40 }, children: [run(c.kicker, { bold: true, color: A, size: 18 })] })] : []),
                  new Paragraph({ spacing: { after: 80 }, children: [run(c.title, { bold: true, size: 23 })] }),
                  ...(c.swatches?.length ? [new Paragraph({ spacing: { after: 80 }, children: c.swatches.map((hx) => new TextRun({ text: "   ", font: FONT, shading: { type: ShadingType.CLEAR, color: "auto", fill: h6(hx) } })).flatMap((r, k) => (k ? [run(" "), r] : [r])) })] : []),
                  ...(c.body ? para(c.body, { after: 80 }) : []),
                  ...(c.footer ? [new Paragraph({ children: [run(c.footer, { color: "8A9099", size: 17 })] })] : []),
                ],
                { width: 100 / b.cols },
              ),
            ),
          );
        }
        return [grid(rows, true), space(240)];
      }
      case "post":
        return [grid([[cell([new Paragraph({ spacing: { after: 100 }, children: [run(b.name, { bold: true }), run(`   ${b.platform}`, { color: "8A9099", size: 18 })] }), ...(b.image ? imagePara(b.image, 420) : []), ...para(b.text, { after: 100 }), ...(b.tags?.length ? [new Paragraph({ spacing: { after: 80 }, children: [run(b.tags.join(" "), { color: A })] })] : []), ...(b.cta ? [new Paragraph({ children: [new TextRun({ text: ` ${b.cta} `, font: FONT, bold: true, color: readable(d.theme.accent), shading: { type: ShadingType.CLEAR, color: "auto", fill: A } })] })] : [])], { fill: "FAFAFB" })]], true), ...(b.note ? [new Paragraph({ spacing: { before: 80, after: 240 }, children: [run("NOTE  ", { bold: true, color: "8A9099", size: 17 }), run(b.note, { color: "6B7280", size: 18 })] })] : [space(240)])];
      case "carousel":
        return [grid(b.items.map((c, i) => [cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`${i + 1}/${b.items.length}`, { bold: true, color: readable(d.theme.accent) })] })], { fill: A, width: 12 }), cell([new Paragraph({ spacing: { after: 60 }, children: [run(c.heading, { bold: true })] }), ...para(c.text, { after: 0 })], { width: 88 })]), true), space(240)];
      case "script":
      case "table": {
        const header = b.t === "script" ? [...b.header] : b.header;
        const rows = b.t === "script" ? b.rows.map((r) => [r.time, r.visual, r.voice]) : b.rows;
        const n = Math.max(header.length, ...rows.map((r) => r.length));
        const pct = shares(header, rows, n);
        // 9,506 twips = A4 width (11,906) minus the 1,200 side margins.
        const twips = pct.map((p) => Math.round((p / 100) * 9506));
        const small = n > 4 ? { size: 18 } : {};
        return [grid([...(header.some(Boolean) ? [Array.from({ length: n }, (_, i) => cell([new Paragraph({ children: [run(header[i] ?? "", { bold: true, color: "FFFFFF", ...small })] })], { fill: h6(d.theme.dark), width: pct[i] }))] : []), ...rows.map((r, ri) => Array.from({ length: n }, (_, i) => cell([new Paragraph({ children: [run(r[i] ?? "", { bold: i === 0, ...small })] })], { fill: ri % 2 ? "F7F8FA" : undefined, width: pct[i] })))], true, twips), space(240)];
      }
      case "kv":
        return [grid(b.items.map((it) => [cell([new Paragraph({ children: [run(it.label, { bold: true, color: A })] })], { width: 25 }), cell(para(it.value, { after: 0 }), { width: 75 })]), true), space(240)];
      case "meters":
        return [grid(b.items.map((it) => [cell([new Paragraph({ children: [run(it.label, { bold: true })] })], { width: 30 }), cell([new Paragraph({ children: [run("■".repeat(Math.round(it.value)), { color: A }), run("■".repeat(10 - Math.round(it.value)), { color: "E4E7EC" }), run(`  ${it.value}/10`, { bold: true, color: A })] })], { width: 70 })])), space(240)];
      case "chart": {
        const png = chartPng(b.chart, b.palette);
        if (!png) return [];
        const size = fit({ width: png.width, height: png.height }, 600, 360);
        return [
          ...(b.title ? [new Paragraph({ spacing: { before: 160, after: 60 }, children: [run(b.title, { bold: true }), ...(b.estimated ? [run(`  ${b.estimated}`, { color: "C2410C", size: 18 })] : [])] })] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new ImageRun({ type: "png", data: png.data, transformation: size })] }),
          ...(b.caption ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(b.caption, { color: "8A9099", size: 17 })] })] : [space(200)]),
        ];
      }
      case "kpis":
        return [grid([b.items.map((k) => cell([new Paragraph({ children: [run(k.value, { bold: true, size: 40, color: A })] }), new Paragraph({ children: [run(k.label, { bold: true })] }), ...(k.note ? [new Paragraph({ children: [run(k.note, { color: "8A9099", size: 17 })] })] : [])], { fill: tint(d.theme.accent, 0.9) }))]), space(240)];
    }
  };

  const children: (Paragraph | Table)[] = [];
  // Cover: what this is, the title, and the cover photo.
  children.push(
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: ` ${d.eyebrow} `, font: FONT, bold: true, color: readable(d.theme.accent), shading: { type: ShadingType.CLEAR, color: "auto", fill: A } })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 160 }, children: [run(d.title, { bold: true })] }),
    ...(d.subtitle ? [new Paragraph({ spacing: { after: 160 }, children: [run(d.subtitle, { color: "6B7280", size: 24 })] })] : []),
    ...(d.meta ? [new Paragraph({ spacing: { after: 240 }, children: [run(d.meta, { color: "8A9099", size: 18 })] })] : []),
    // A manuscript (docSections) carries its photos in the text instead.
    ...(d.coverImage && !d.docSections ? imagePara(d.coverImage, 600) : []),
  );
  const sections: Section[] = d.docSections ?? d.sections;
  sections.forEach((s, i) => {
    // The first section continues the cover page unless the cover has a big photo.
    if (i > 0 ? s.newPage : Boolean(d.coverImage && !d.docSections)) children.push(new Paragraph({ children: [new PageBreak()] }));
    if (!(i === 0 && s.title === d.title)) {
      if (s.kicker) children.push(new Paragraph({ spacing: { before: 200, after: 40 }, children: [run(s.kicker.toUpperCase(), { bold: true, color: A, size: 18 })] }));
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: s.kicker ? 0 : 280, after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: A, space: 6 } }, children: [run(s.title, { bold: true })] }));
    }
    if (s.intro) children.push(...para(s.intro, { color: "6B7280" }));
    s.blocks.forEach((b) => children.push(...blocks(b)));
  });

  const file = new Document({
    title: d.title,
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { size: 52, bold: true, color: "15181E", font: FONT } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, color: "15181E", font: FONT } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "15181E", font: FONT } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "2E343D", font: FONT } },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1200, bottom: 1100, left: 1200, right: 1200 } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`${d.footer}   ·   `, { color: "8A9099", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "8A9099" })] })] }) },
        children,
      },
    ],
  });
  return Packer.toBuffer(file);
}
