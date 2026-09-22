import assert from "node:assert";
import { test } from "node:test";
import { buildProposalDocx, buildBusinessPlanDocx } from "./docx.ts";

// docx has no real "load and inspect" API (it's a writer), so this
// checks what's checkable without hand-rolling a ZIP reader: the output
// is a well-formed OOXML zip (PK magic, plausible size) and, critically,
// that the empty-array edge cases the model can legitimately return
// (0 execution steps, 0 competitors, 0 P&L rows) don't throw instead of
// producing a document with a fallback line — both code paths have an
// explicit `.length > 0 ? table(...) : body(...)` branch worth guarding.

const PROPOSAL_SAMPLE = {
  cover: "테스트 제안서",
  executive_summary: "요약",
  problem: "문제",
  solution: "해결책",
  execution_plan: ["1단계"],
  timeline: [{ phase: "설계", weeks: 2, deliverable: "설계안" }],
  pricing_table: [{ item: "항목", amount_krw: 1000000 }],
  company_intro: "회사 소개",
};

const BUSINESS_PLAN_SAMPLE = {
  sections: { summary: "요약", team: "팀", product: "제품" },
  market_analysis: { size: "1000억", growth: "10%", sources: [{ url: "https://x.com", title: "출처" }] },
  competitor_matrix: [
    ["구분", "가격"],
    ["A사", "1만원"],
  ],
  financials: { pl_3yr: [[1, 2, 3]], assumptions: ["가정1"], breakeven_month: 6 },
};

function assertValidDocx(buffer: Buffer) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), "PK", "docx is a zip container — must start with the PK magic bytes");
  assert.ok(buffer.length > 1000, "a real document should be well over 1KB");
}

test("buildProposalDocx produces a valid docx for a normal proposal", async () => {
  assertValidDocx(await buildProposalDocx(PROPOSAL_SAMPLE));
});

test("buildProposalDocx does not throw when the model returns empty list fields", async () => {
  const buffer = await buildProposalDocx({
    ...PROPOSAL_SAMPLE,
    execution_plan: [],
    timeline: [],
    pricing_table: [],
  });
  assertValidDocx(buffer);
});

test("buildBusinessPlanDocx produces a valid docx for a normal plan", async () => {
  assertValidDocx(await buildBusinessPlanDocx(BUSINESS_PLAN_SAMPLE));
});

test("buildBusinessPlanDocx falls back to a text line instead of throwing on an empty competitor_matrix / pl_3yr", async () => {
  const buffer = await buildBusinessPlanDocx({
    ...BUSINESS_PLAN_SAMPLE,
    competitor_matrix: [],
    financials: { ...BUSINESS_PLAN_SAMPLE.financials, pl_3yr: [] },
  });
  assertValidDocx(buffer);
});
