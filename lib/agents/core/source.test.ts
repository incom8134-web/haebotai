import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import JSZip from "jszip";
import { parseDocx, parsePdf, parsePptx, parseText, docxLines } from "./parse.ts";
import { buildSource, numberingOf, outlineText, renumber } from "./source.ts";
import { buildIndex, retrieve, sourceContext, tokenize } from "./retrieve.ts";
import { analysisGroups } from "./analysis.ts";

// The member's own 26-page 산학공동 기술개발과제 계획서 (docs/), the kind of
// document the source engine exists for.
const pdfPath = () => {
  const name = readdirSync("docs").filter((n) => n.endsWith(".pdf")).find((n) => readFileSync(`docs/${n}`).length > 1_000_000);
  return name ? `docs/${name}` : null;
};

test("a real 26-page PDF becomes its outline, not one blob", async () => {
  const path = pdfPath();
  if (!path) return;
  const doc = await parsePdf("plan.pdf", readFileSync(path));
  assert.equal(doc.pages, 26);
  assert.ok(doc.sections.length >= 15, `sections: ${doc.sections.length}`);
  const titles = doc.sections.map((s) => s.title);
  for (const want of ["산학공동 기술개발과제 계획 요약서", "기대효과", "연구비 사용계획", "총괄책임자 및 참여인력 현황"]) assert.ok(titles.some((t) => t.includes(want)), `missing heading ${want}`);
  // Table-of-contents leader lines are not headings.
  assert.ok(!titles.some((t) => /·{3,}/.test(t)));
  // Late sections keep their page numbers (the end of the document is not dropped).
  assert.ok(doc.sections.some((s) => (s.page ?? 0) >= 24));
  assert.ok(doc.stats.chars > 15_000);
  assert.match(outlineText(doc), /연구비 사용계획 · p\.24/);
});

test("retrieval finds the budget section of the real PDF by meaning, wherever it sits", async () => {
  const path = pdfPath();
  if (!path) return;
  const doc = await parsePdf("plan.pdf", readFileSync(path));
  const index = buildIndex([doc]);
  const hits = retrieve(index, "연구비 사용 계획 예산 인건비", 4000);
  assert.ok(hits.length > 0);
  const budget = doc.sections.find((s) => s.title.includes("연구비"))!;
  assert.ok(hits.some((h) => h.sectionId === budget.id), "budget section retrieved");
  // Results come back in document order.
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].order > hits[i - 1].order);
  // The whole document is returned when it fits the budget.
  assert.equal(sourceContext([doc], index, "anything", 1_000_000).complete, true);
  // Analysis covers every section, in groups when needed.
  const groups = analysisGroups([doc], 8000);
  assert.deepEqual(groups.flatMap((g) => g.sectionIds), doc.sections.map((s) => s.id));
});

test("Word: heading styles, bold headings and tables survive", async () => {
  const zip = new JSZip();
  const p = (text: string, style?: string) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;
  const tbl = `<w:tbl><w:tr><w:tc><w:p><w:r><w:t>항목</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>금액</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>인건비</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12,000</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
  zip.file("word/document.xml", `<w:document><w:body>${p("사업 개요", "1")}${p("본문 첫 문단입니다.")}${p("예산", "1")}${tbl}${p("세부 항목", "2")}${p("내용")}</w:body></w:document>`);
  zip.file("word/styles.xml", `<w:styles><w:style w:type="paragraph" w:styleId="1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="2"><w:name w:val="heading 2"/></w:style></w:styles>`);
  const doc = await parseDocx("a.docx", await zip.generateAsync({ type: "uint8array" }));
  assert.deepEqual(doc.sections.map((s) => [s.title, s.level]), [["사업 개요", 1], ["예산", 1], ["세부 항목", 2]]);
  assert.deepEqual(doc.sections[1].tables[0].rows, [["항목", "금액"], ["인건비", "12,000"]]);
  assert.equal(docxLines(`<w:body>${p("x")}</w:body>`).length, 1);
});

test("PowerPoint: one section per slide, titled by the title placeholder", async () => {
  const zip = new JSZip();
  const slide = (title: string, body: string) => `<p:sld><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:sp><p:sp><a:p><a:r><a:t>${body}</a:t></a:r></a:p></p:sp></p:sld>`;
  zip.file("ppt/slides/slide1.xml", slide("문제", "고객은 시간이 없다"));
  zip.file("ppt/slides/slide2.xml", slide("해결", "10분 안에 끝낸다"));
  const doc = await parsePptx("d.pptx", await zip.generateAsync({ type: "uint8array" }));
  assert.equal(doc.pages, 2);
  assert.deepEqual(doc.sections.map((s) => s.title), ["문제", "해결"]);
  assert.equal(doc.sections[1].text, "10분 안에 끝낸다");
});

test("Markdown, numbering, and documents without headings", () => {
  const md = parseText("n.md", "# 개요\n내용\n## 1. 배경\n배경 내용\n| a | b |\n|---|---|\n| 1 | 2 |");
  assert.deepEqual(md.sections.map((s) => s.title), ["개요", "배경"]);
  assert.deepEqual(md.sections[1].tables[0].rows, [["a", "b"], ["1", "2"]]);
  assert.deepEqual(numberingOf("제3장 사업화 전략"), { number: "제3장", level: 1, title: "사업화 전략" });
  assert.deepEqual(numberingOf("Ⅱ. 시장 분석"), { number: "Ⅱ", level: 1, title: "시장 분석" });
  const flat = buildSource("p", "pasted", Array.from({ length: 30 }, (_, i) => ({ text: `문단 ${i} `.repeat(30) })));
  assert.ok(flat.sections.length > 1, "a long text with no headings is split for retrieval");
  const two = renumber([md, md]);
  assert.deepEqual(two.flatMap((d) => d.sections.map((s) => s.id)), ["s1", "s2", "s3", "s4"]);
});

test("Korean tokenizing matches words with particles attached", () => {
  const t = tokenize("스마트팜을 운영하는");
  assert.ok(t.includes("스마"));
  assert.ok(t.includes("마트"));
  assert.ok(t.includes("트팜"));
});
