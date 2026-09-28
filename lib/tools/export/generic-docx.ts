import "server-only";
import { AlignmentType, Document, ExternalHyperlink, Footer, HeadingLevel, ImageRun, Packer, PageNumber, Paragraph, TextRun } from "docx";
import { plainMarkdownLines, type ExportDoc } from "./document.ts";
import { fetchAll, fit, imageSize } from "./images.ts";

// Word export for any tool (proposal and business-plan keep their
// bespoke layouts in docx.ts). Headings use Word's built-in heading
// styles so the navigation pane / TOC work.

const KO_FONT = "Malgun Gothic";
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

const run = (text: string, opts: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) =>
  new TextRun({ text, font: KO_FONT, ...opts });

export async function buildGenericDocx(doc: ExportDoc): Promise<Buffer> {
  const images = await fetchAll(doc.blocks.flatMap((b) => (b.type === "image" ? [b.url] : [])));
  const children: Paragraph[] = [
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
