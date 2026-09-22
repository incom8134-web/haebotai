import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2 — "real styles, TOC, page numbers,
// not HTML-to-PDF." TOC is skipped: docx's TableOfContents field only
// populates after Word runs "Update Field" on open, which would look
// broken (empty) on first view for most viewers — a real page-number
// footer works everywhere immediately, so that's the win kept.
// ponytail: no TOC. Upgrade path if that's wanted — TableOfContents with
// beginDirty: true, plus a note telling the user to update fields.

const KO_FONT = "Malgun Gothic";

function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } });
}

function body(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, font: KO_FONT })],
    spacing: { after: 120 },
  });
}

function bullet(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, font: KO_FONT })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function cell(text: string, opts: { header?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: KO_FONT, bold: opts.header })],
      }),
    ],
  });
}

function table(headerRow: string[], rows: string[][]) {
  const colWidth = 100 / headerRow.length;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerRow.map((h) => cell(h, { header: true, width: colWidth })) }),
      ...rows.map((r) => new TableRow({ children: r.map((v) => cell(v, { width: colWidth })) })),
    ],
  });
}

function pageNumberFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], font: KO_FONT, size: 18 }),
        ],
      }),
    ],
  });
}

function krw(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

interface ProposalOutput {
  cover: string;
  executive_summary: string;
  problem: string;
  solution: string;
  execution_plan: string[];
  timeline: { phase: string; weeks: number; deliverable: string }[];
  pricing_table: { item: string; amount_krw: number }[];
  company_intro: string;
}

export async function buildProposalDocx(output: ProposalOutput): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        footers: { default: pageNumberFooter() },
        children: [
          new Paragraph({
            children: [new TextRun({ text: output.cover, font: KO_FONT, bold: true, size: 36 })],
            spacing: { after: 240 },
          }),
          heading("개요"),
          body(output.executive_summary),
          heading("문제 정의"),
          body(output.problem),
          heading("해결 방안"),
          body(output.solution),
          heading("실행 계획"),
          ...output.execution_plan.map(bullet),
          heading("일정"),
          table(
            ["단계", "기간(주)", "산출물"],
            output.timeline.map((t) => [t.phase, String(t.weeks), t.deliverable]),
          ),
          heading("가격"),
          table(
            ["항목", "금액"],
            output.pricing_table.map((p) => [p.item, krw(p.amount_krw)]),
          ),
          heading("회사 소개"),
          body(output.company_intro),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

interface BusinessPlanOutput {
  sections: { summary: string; team: string; product: string };
  market_analysis: { size: string; growth: string; sources: { url: string; title: string }[] };
  competitor_matrix: string[][];
  financials: { pl_3yr: number[][]; assumptions: string[]; breakeven_month: number };
}

export async function buildBusinessPlanDocx(output: BusinessPlanOutput): Promise<Buffer> {
  const pl = output.financials.pl_3yr;
  const doc = new Document({
    sections: [
      {
        footers: { default: pageNumberFooter() },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "사업계획서", font: KO_FONT, bold: true, size: 36 })],
            spacing: { after: 240 },
          }),
          heading("사업 개요"),
          body(output.sections.summary),
          heading("팀 구성"),
          body(output.sections.team),
          heading("제품"),
          body(output.sections.product),
          heading("시장 분석"),
          body(`시장 규모: ${output.market_analysis.size}`),
          body(`성장률: ${output.market_analysis.growth}`),
          ...output.market_analysis.sources.map((s) => bullet(`${s.title} — ${s.url}`)),
          heading("경쟁사 분석"),
          output.competitor_matrix.length > 0
            ? table(output.competitor_matrix[0], output.competitor_matrix.slice(1))
            : body("데이터 없음"),
          heading("재무 계획"),
          ...output.financials.assumptions.map(bullet),
          body(`손익분기 시점: ${output.financials.breakeven_month}개월차`),
          pl.length > 0
            ? table(
                ["구분", ...pl[0].map((_, i) => `연도 ${i + 1}`)],
                pl.map((row, i) => [`행 ${i + 1}`, ...row.map((n) => n.toLocaleString("ko-KR"))]),
              )
            : body("재무 데이터 없음"),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
