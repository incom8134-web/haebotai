import { test } from "node:test";
import assert from "node:assert/strict";
import { routeBrief } from "./route-brief.ts";
import { CATALOG } from "./catalog.ts";

test("everyday briefs land on the right tool first", () => {
  assert.equal(routeBrief("스마트스토어에 올릴 수제 잼 상세페이지 만들어줘")[0], "sales-page");
  assert.equal(routeBrief("카페 로고가 필요해요")[0], "logo-lab");
  assert.equal(routeBrief("4월 한정 딸기 타르트를 동네 20~30대에게 알리고 싶어요")[0], "campaign-planner");
  assert.equal(routeBrief("정부지원 사업계획서 초안")[0], "doc-studio");
  assert.equal(routeBrief("경쟁사 3곳 비교 분석")[0], "competitor-lens");
  assert.equal(routeBrief("Write a blog post about our bakery for search ranking")[0], "seo-composer");
  assert.equal(routeBrief("투자 유치용 IR 발표 자료")[0], "pitch-director");
});

test("short Latin cues don't fire inside other words", () => {
  assert.ok(!routeBrief("first launch party").includes("pitch-director"));
  assert.ok(!routeBrief("photocopy shop").includes("hook-lab"));
});

test("nothing to go on gives nothing, and the allow-list is respected", () => {
  assert.deepEqual(routeBrief(""), []);
  assert.deepEqual(routeBrief("안녕하세요"), []);
  assert.deepEqual(routeBrief("로고와 상세페이지", ["sales-page"]), ["sales-page"]);
});

test("every routed slug is a real catalog tool", async () => {
  const slugs = new Set(CATALOG.map((t) => t.slug));
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./route-brief.ts", import.meta.url), "utf8");
  for (const m of src.matchAll(/^\s+"([a-z-]+)": \[/gm)) assert.ok(slugs.has(m[1]), m[1]);
});
