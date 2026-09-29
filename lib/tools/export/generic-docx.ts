import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { chartPng } from "./chart-png.ts";
import { plainMarkdownLines, type ExportDoc } from "./document.ts";
import { fetchAll, fit, imageSize } from "./images.ts";

// Word export for any tool (proposal and business-plan keep their
// bespoke layouts in docx.ts). Headings use Word's built-in heading
// styles so the navigation pane / TOC work.

const KO_FONT = "Malgun Gothic";
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

const run = (text: string, opts: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) =>
  new TextRun({ text, font: KO_FONT, ...opts });

const ALIGN = { l: AlignmentType.LEFT, r: AlignmentType.RIGHT, c: AlignmentType.CENTER } as const;
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "E1E4E8" };

/** A tinted version of a hex color (t = share of white), for soft fills. */
function tint(hex: string, t: number): string {
  const c = hex.replace("#", "");
  return [0, 2, 4].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) + (255 - parseInt(c.slice(i, i + 2), 16)) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function dataTable(header: string[], rows: string[][], accent: string, align: ("l" | "r" | "c")[] = [], totalRow = false): Table {
  const cell = (text: string, i: number, opts: { head?: boolean; fill?: string; bold?: boolean }) =>
    new TableCell({
      shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      borders: { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: LINE },
      children: [new Paragraph({ alignment: ALIGN[align[i] ?? "l"], children: [run(text, { bold: opts.head || opts.bold || i === 0, color: opts.head ? "FFFFFF" : i === 0 ? "16181A" : "3A4046", size: header.length > 4 ? 17 : 19 })] })],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, { head: true, fill: accent })) }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            children: header.map((_, i) => cell(r[i] ?? "", i, { fill: totalRow && ri === rows.length - 1 ? "EEF1F6" : ri % 2 ? "F8F9FB" : undefined, bold: totalRow && ri === rows.length - 1 })),
          }),
      ),
    ],
  });
}

function kpiTable(items: { label: string; value: string; note?: string }[], accent: string): Table {
  const soft = tint(accent, 0.9);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: items.slice(0, 4).map(
          (k) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, color: "auto", fill: soft },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: { top: { style: BorderStyle.SINGLE, size: 18, color: "FFFFFF" }, bottom: { style: BorderStyle.SINGLE, size: 18, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 18, color: "FFFFFF" }, right: { style: BorderStyle.SINGLE, size: 18, color: "FFFFFF" } },
              children: [
                new Paragraph({ children: [run(k.label, { color: "6B7075", size: 16 })] }),
                new Paragraph({ spacing: { before: 40 }, children: [run(k.value, { bold: true, color: accent, size: k.value.length > 12 ? 22 : 30 })] }),
                ...(k.note ? [new Paragraph({ children: [run(k.note, { color: "6B7075", size: 15 })] })] : []),
              ],
            }),
        ),
      }),
    ],
  });
}

export async function buildGenericDocx(doc: ExportDoc): Promise<Buffer> {
  const images = await fetchAll(doc.blocks.flatMap((b) => (b.type === "image" ? [b.url] : [])));
  const accent = (doc.report?.palette[0] ?? "#4D7CFE").replace("#", "").toUpperCase();
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(doc.title, { bold: true })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(doc.subtitle, { color: "666666" })] }),
  ];

  for (const b of doc.blocks) {
    if (b.type === "heading") {
      children.push(
        new Paragraph({
          heading: HEADINGS[b.level - 1],
          spacing: { before: b.level === 1 ? 320 : 200, after: 100 },
          children: [run(b.text, { bold: true }), ...(b.estimated ? [run("  추정", { color: "B7791F", size: 18 })] : [])],
        }),
      );
    } else if (b.type === "paragraph") {
      for (const line of b.text.split("\n").filter((l) => l.trim())) children.push(new Paragraph({ spacing: { after: 120 }, children: [run(line)] }));
    } else if (b.type === "field") {
      children.push(new Paragraph({ spacing: { after: 80 }, children: [run(`${b.label}: `, { bold: true }), run(b.value)] }));
    } else if (b.type === "bullets") {
      for (const item of b.items) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [run(item)] }));
    } else if (b.type === "markdown") {
      for (const line of plainMarkdownLines(b.text)) {
        children.push(
          line.heading
            ? new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 }, children: [run(line.text, { bold: true })] })
            : new Paragraph({ bullet: line.bullet ? { level: 0 } : undefined, spacing: { after: 100 }, children: [run(line.text)] }),
        );
      }
    } else if (b.type === "kpis") {
      for (let i = 0; i < b.items.length; i += 4) children.push(kpiTable(b.items.slice(i, i + 4), accent));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    } else if (b.type === "table") {
      if (b.title) children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [run(b.title, { bold: true })] }));
      children.push(dataTable(b.header, b.rows, accent, b.align, b.totalRow));
      children.push(new Paragraph({ spacing: { after: 160 }, children: b.caption ? [run(b.caption, { color: "888888", size: 16 })] : [] }));
    } else if (b.type === "chart") {
      const png = chartPng(b.chart, b.palette);
      if (!png) continue;
      if (b.title) children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [run(b.title, { bold: true }), ...(b.estimated ? [run("  추정", { color: "B7791F", size: 16 })] : [])] }));
      const size = fit({ width: png.width, height: png.height }, 600, 420);
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new ImageRun({ type: "png", data: png.data, transformation: size })] }));
      if (b.caption) children.push(new Paragraph({ spacing: { after: 160 }, children: [run(b.caption, { color: "888888", size: 16 })] }));
    } else if (b.type === "callout") {
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: tint(accent, 0.9) },
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 8 } },
          spacing: { before: 120, after: 0 },
          indent: { left: 160, right: 160 },
          children: [run(b.label, { bold: true, color: accent, size: 17 })],
        }),
        new Paragraph({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: tint(accent, 0.9) },
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 8 } },
          spacing: { after: 160 },
          indent: { left: 160, right: 160 },
          children: [run(b.text, { bold: true })],
        }),
      );
    } else if (b.type === "image") {
      const img = images.get(b.url);
      if (!img) continue;
      const size = fit(imageSize(img), 460, 460);
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: img.type, data: img.data, transformation: size })] }));
      if (b.caption) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run(b.caption, { color: "888888", size: 18 })] }));
    }
  }

  if (doc.sources.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 100 }, children: [run("출처", { bold: true })] }));
    for (const s of doc.sources) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new ExternalHyperlink({ link: s.url, children: [new TextRun({ text: s.title, style: "Hyperlink", font: KO_FONT })] })],
        }),
      );
    }
  }

  const file = new Document({
    styles: { default: { document: { run: { font: KO_FONT, size: 21 } } } },
    sections: [
      {
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: KO_FONT, size: 16, color: "888888" })] })] }),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(file);
}
