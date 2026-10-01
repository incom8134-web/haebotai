import { test } from "node:test";
import assert from "node:assert/strict";
import { regenerateCost, regeneratableSections, versionTitle } from "./regenerate.ts";

test("only text parts of text tools can be rewritten", () => {
  const out = { core_message: "a", angles: [{ headline: "h", image_url: "https://x/y.png" }], words_to_avoid: ["x"], agent: {}, request_brief: {} };
  assert.deepEqual(regeneratableSections("copy", out), ["core_message", "words_to_avoid"]);
  assert.deepEqual(regeneratableSections("homepage", { html: "<p>" }), []);
  assert.deepEqual(regeneratableSections("hook-lab", { summary: "s", hooks: [{ text: "t" }], best: { text: "b" } }), ["summary", "hooks", "best"]);
});

test("cost is a quarter of the tool, at least 5", () => {
  assert.equal(regenerateCost(40), 10);
  assert.equal(regenerateCost(12), 5);
});

test("a revision is marked once, however deep", () => {
  assert.equal(versionTitle(null), null);
  assert.equal(versionTitle("봄 시즌 보드"), "봄 시즌 보드 · 고친 버전");
  assert.equal(versionTitle("봄 시즌 보드 · 고친 버전"), "봄 시즌 보드 · 고친 버전");
  assert.ok(versionTitle("가".repeat(120))!.length <= 120);
});
