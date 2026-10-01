import { test } from "node:test";
import assert from "node:assert/strict";
import { contractBlock, detectExplicit, mergeContract, parseContract } from "./contract.ts";
import { workflowFor } from "./doc-agent.ts";

const contractFor = (text: string, opts: { referenceMode?: string; hasSource?: boolean; model?: Record<string, unknown> } = {}) => {
  const hasSource = opts.hasSource ?? true;
  const explicit = detectExplicit(text, { referenceMode: opts.referenceMode, hasSource });
  return mergeContract(opts.model ? parseContract(opts.model) : null, explicit, { hasSource, sourcePages: hasSource ? 30 : undefined });
};

test("the spec's preservation-plus-enhancement example reads as polish, not a rewrite or pure design", () => {
  const c = contractFor("Do not change the uploaded proposal. Keep the order and content, but polish it, make it professional, improve the wording, and make the document beautiful.");
  assert.equal(c.mode, "polish");
  assert.equal(c.preserve.order, true);
  assert.equal(c.preserve.structure, true);
  assert.equal(c.preserve.meaning, true);
  assert.equal(c.preserve.facts, true);
  assert.equal(c.preserve.wording, false, "wording may improve");
  assert.ok(c.prohibit.some((p) => /순서/.test(p)));
  assert.equal(c.research.need, "none");
});

test("'don't change the document, make it beautiful' is a design task: every word frozen", () => {
  for (const text of ["Don't change the document. Make the document itself beautiful.", "문서 내용은 바꾸지 말고 디자인만 예쁘게 해 줘", "Preserve everything, only beautify."]) {
    const c = contractFor(text);
    assert.equal(c.mode, "beautify", text);
    assert.equal(c.preserve.wording, true, text);
    assert.equal(c.preserve.order, true, text);
  }
});

test("eight proposal requests become eight contracts, and the workflows differ where the work differs", () => {
  const cases = {
    technical: contractFor("이 30페이지 기술 자료로 30페이지 제안서를 만들어 줘", { referenceMode: "reference" }),
    government: contractFor("이 공고문에 맞춰 정부 지원사업 제안서를 써 줘", { referenceMode: "rfp" }),
    investor: contractFor("이 사업 제안서를 투자자용 제안서로 바꿔 줘", { model: { mode: "transform" } }),
    beautify: contractFor("Preserve everything, only beautify."),
    rewrite: contractFor("구성은 그대로 두고 전문적으로 다시 써 줘"),
    inspire: contractFor("이 문서는 영감으로만 쓰고 완전히 새로운 제안서를 만들어 줘"),
    research: contractFor("현재 시장을 조사해서 반영한 제안서를 만들어 줘", { model: { mode: "create_from_source", research_questions: ["2026 국내 스마트팜 교육 시장 규모"] } }),
    noSource: contractFor("완전히 다른 업종인 반려동물 호텔 제안서를 만들어 줘", { hasSource: false }),
  };
  assert.equal(cases.technical.mode, "create_from_source");
  assert.equal(cases.technical.length.target, 30);
  assert.equal(cases.technical.length.unit, "pages");
  assert.equal(cases.government.mode, "answer_requirements");
  assert.equal(cases.government.sourceRole, "requirements");
  assert.equal(cases.investor.mode, "transform");
  assert.equal(cases.beautify.mode, "beautify");
  assert.equal(cases.rewrite.mode, "rewrite");
  assert.equal(cases.inspire.mode, "inspire");
  assert.equal(cases.inspire.sourceRole, "inspiration");
  assert.equal(cases.research.research.need, "required");
  assert.equal(cases.noSource.mode, "create");
  assert.equal(cases.noSource.sourceRole, "none");

  const flows = Object.fromEntries(Object.entries(cases).map(([k, c]) => [k, workflowFor(c, k !== "noSource").stages.join(">")]));
  // A design task never writes; a polish never plans from scratch; research only where asked.
  assert.ok(!flows.beautify.includes("write"));
  assert.ok(flows.beautify.includes("design"));
  assert.ok(!flows.rewrite.includes("strategize"));
  assert.ok(flows.research.includes("research"));
  assert.ok(!flows.technical.includes("research"));
  assert.ok(!flows.noSource.includes("analyze"));
  assert.ok(new Set(Object.values(flows)).size >= 4, JSON.stringify(flows, null, 1));
});

test("explicit instructions beat the model's reading", () => {
  // The model thought it could rewrite freely; the member said keep the order.
  const c = contractFor("순서는 그대로 유지하고 문장을 매끄럽게 다듬어 줘", { model: { mode: "create_from_source", preserve_order: false } });
  assert.equal(c.preserve.order, true);
  assert.ok(["rewrite", "polish"].includes(c.mode));
  // A length the member wrote wins over the model's guess.
  const d = contractFor("40쪽 분량으로", { model: { mode: "create_from_source", length_unit: "pages", length_target: 10 } });
  assert.equal(d.length.target, 40);
});

test("no source means nothing to preserve, and facts are never invented", () => {
  const c = contractFor("내용은 그대로 두고 예쁘게", { hasSource: false });
  assert.equal(c.mode, "create");
  assert.equal(c.preserve.wording, false);
  assert.equal(c.preserve.facts, true);
  assert.ok(c.prohibit.some((p) => /지어내기/.test(p)));
});

test("visual instructions and research opt-outs are read", () => {
  const e = detectExplicit("이미지는 줄이고 도표를 더 넣어 줘. 조사는 하지 말고", { hasSource: false });
  assert.deepEqual(e.visualsAvoid, ["사진·이미지"]);
  assert.deepEqual(e.visualsPrefer, ["도표·다이어그램"]);
  assert.equal(e.research, undefined);
});

test("the contract block states requirements as requirements", () => {
  const block = contractBlock(contractFor("Preserve everything, only beautify."));
  assert.match(block, /작업 계약/);
  assert.match(block, /원문 문장 그대로/);
  assert.match(block, /하면 안 되는 것/);
});
