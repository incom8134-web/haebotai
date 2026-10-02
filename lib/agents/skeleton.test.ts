import { test } from "node:test";
import assert from "node:assert/strict";
import { skeletonOf, skeletonSignature, skeletonSimilarity } from "./skeleton.ts";

const deck = (layouts: string[]) => ({
  title: "t",
  subtitle: "s",
  storyline: "x",
  slides: layouts.map((layout, i) => ({ layout, headline: `h${i}`, points: [], visual: "", speaker_notes: "" })),
  closing_ask: "c",
  agent: { anything: true },
});

test("skeleton ignores words and run metadata", () => {
  const a = skeletonOf(deck(["statement", "chart", "points"]));
  const b = skeletonOf({ ...deck(["statement", "chart", "points"]), title: "완전히 다른 제목", agent: undefined });
  assert.equal(skeletonSimilarity(a, b), 1);
  assert.ok(!a.facts.some((f) => f.includes("agent")));
});

test("same layouts in another order score below identical", () => {
  const a = skeletonOf(deck(["statement", "chart", "points", "quote"]));
  const b = skeletonOf(deck(["quote", "points", "chart", "statement"]));
  const s = skeletonSimilarity(a, b);
  assert.ok(s < 1 && s > 0.5, String(s));
});

test("different decks score clearly lower than template twins", () => {
  const template = skeletonSimilarity(skeletonOf(deck(["points", "points", "points", "points"])), skeletonOf(deck(["points", "points", "points", "points"])));
  const varied = skeletonSimilarity(
    skeletonOf(deck(["statement", "big_number", "chart", "comparison", "quote", "photo", "process", "table", "points", "statement", "chart"])),
    skeletonOf(deck(["points", "points", "points", "points"])),
  );
  assert.equal(template, 1);
  assert.ok(varied < 0.6, String(varied));
});

test("markdown headings and html sections become the sequence", () => {
  const md = skeletonOf({ body_markdown: `# T\n\n${"글 ".repeat(200)}\n\n## A\n\n## B\n\n### c` });
  assert.deepEqual(md.sequence, ["body_markdown:h1", "body_markdown:h2", "body_markdown:h2", "body_markdown:h3"]);
  const html = skeletonOf({ html: `<header class="top"></header>${"x".repeat(400)}<section class="hero2"></section><section id="faq"></section>` });
  assert.deepEqual(html.sequence, ["html:header.top", "html:section.hero", "html:section.faq"]);
});

test("signature compresses runs", () => {
  assert.deepEqual(skeletonSignature(skeletonOf(deck(["points", "points", "points", "chart"]))), ["slides:layout=points×3", "slides:layout=chart"]);
});
