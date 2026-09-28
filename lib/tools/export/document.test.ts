import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExportDoc, splitSections } from "./document.ts";
import { buildMarkdown } from "./markdown.ts";

const doc = (output: unknown, toolId = "copy") =>
  buildExportDoc({ toolName: "해봇 캠페인 카피", toolId, output, sources: [{ url: "https://a.example", title: "A" }], brandName: "달빛 딸기공방", createdAt: "2026-09-28T00:00:00Z" });

test("top-level fields become sections, short item fields become label: value", () => {
  const d = doc({ core_message: "퇴근길 한 조각", angles: [{ motivation: "희소성", headline: "4월까지만", cta: "확인하기" }] });
  assert.deepEqual(d.blocks[0], { type: "heading", level: 1, text: "핵심 메시지" });
  assert.deepEqual(d.blocks[1], { type: "paragraph", text: "퇴근길 한 조각" });
  assert.ok(d.blocks.some((b) => b.type === "heading" && b.level === 2 && b.text === "4월까지만"), "item titled by its headline");
  assert.ok(d.blocks.some((b) => b.type === "field" && b.label === "고객 동기" && b.value === "희소성"));
  assert.equal(splitSections(d.blocks).map((s) => s.title).join("|"), "핵심 메시지|동기별 카피");
});

test("nested sources are collected once, machine fields and estimates handled", () => {
  const d = doc({
    market_size: { band: "5조 원", data_source: "estimated", sources: [{ url: "https://a.example", title: "A" }, { url: "https://b.example", title: "B" }] },
    images: [{ url: "https://x.example/0.png", asset_id: "u/0.png", seed: "1" }],
  });
  assert.deepEqual(d.sources.map((s) => s.url), ["https://a.example", "https://b.example"]);
  assert.ok(d.blocks.some((b) => b.type === "heading" && b.text === "시장 규모" && b.estimated));
  assert.ok(d.blocks.some((b) => b.type === "image" && b.url === "https://x.example/0.png"));
  assert.ok(!JSON.stringify(d.blocks).includes("asset_id") && !JSON.stringify(d.blocks).includes("u/0.png"));
});

test("presentation keeps its own slides for pptx", () => {
  const d = doc({ slides: [{ title: "왜 지금인가", points: ["딸기 시즌"], speaker_notes: "시즌성" }] }, "presentation");
  assert.deepEqual(d.slides, [{ title: "왜 지금인가", points: ["딸기 시즌"], notes: "시즌성" }]);
});

test("markdown export reads as a document", () => {
  const md = buildMarkdown(doc({ core_message: "퇴근길 한 조각", words_to_avoid: ["최고"], first_30_days: [{ day: 1, title: "공지" }] }));
  assert.match(md, /^# 해봇 캠페인 카피\n\n_달빛 딸기공방 · /);
  assert.match(md, /## 핵심 메시지\n\n퇴근길 한 조각/);
  assert.match(md, /- 최고/);
  assert.match(md, /- 1일차 공지/);
  assert.match(md, /## 출처\n\n- \[A\]\(https:\/\/a\.example\)/);
});
