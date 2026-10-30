import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOL_REDIRECTS } from "./tool-redirects.ts";
import { CATALOG, CATEGORY_ORDER, modesOf, publicTools, redirectFor, RETIRED, toolNumber, toolSlug, toolsIn } from "./catalog.ts";

// The reference product's tool ids — none may be a public slug again.
const REFERENCE_IDS = ["blog", "sangsepage", "image", "logo", "trend", "calendar", "prompt", "money", "homepage", "proposal", "keyword", "brand-model", "place", "business-plan", "grant"];

test("16 public tools in 5 steps, each step with 2 to 4 tools", () => {
  assert.equal(publicTools().length, 16);
  assert.equal(CATEGORY_ORDER.length, 5);
  for (const c of CATEGORY_ORDER) {
    const n = toolsIn(c).length;
    assert.ok(n >= 2 && n <= 4, `${c}: ${n}`);
  }
});

test("public tools are listed step by step, so their numbers follow the steps", () => {
  const order = publicTools().map((t) => CATEGORY_ORDER.indexOf(t.category));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("every mode belongs to a public tool in the same step", () => {
  for (const t of CATALOG.filter((x) => x.hidden)) {
    const parent = CATALOG.find((x) => x.slug === t.hidden!.parent);
    assert.ok(parent && !parent.hidden, t.slug);
    assert.equal(parent!.category, t.category, t.slug);
  }
});

test("names are plain words: no studio/lab/forge-style jargon", () => {
  for (const t of CATALOG)
    assert.doesNotMatch(t.name.ko, /스튜디오|랩|포지|레이더|렌즈|마이너|아키텍트|팩토리|컴포저|플래너|빌더|디렉터|데스크/, t.name.ko);
});

test("slugs are unique, URL-safe and none reuses a reference tool id", () => {
  const slugs = CATALOG.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) {
    assert.match(s, /^[a-z][a-z0-9-]+$/);
    assert.ok(!REFERENCE_IDS.includes(s), s);
  }
});

test("names don't follow one formula", () => {
  const names = CATALOG.map((t) => t.name.ko);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.filter((n) => n.endsWith("AI")).length === 0, "no '___ AI' names");
  assert.ok(names.filter((n) => n.startsWith("해봇")).length === 0, "no '해봇 ___' names");
});

test("every engine backs at most one entry, and next-tools exist", () => {
  const engines = CATALOG.map((t) => t.engine).filter(Boolean);
  assert.equal(new Set(engines).size, engines.length);
  const slugs = new Set(CATALOG.map((t) => t.slug));
  for (const t of CATALOG) for (const n of t.next) assert.ok(slugs.has(n), `${t.slug} → ${n}`);
});

test("old tool URLs redirect to their successor; retired ones to a replacement or the list", () => {
  assert.equal(redirectFor("blog"), "seo-composer");
  assert.equal(redirectFor("homepage"), "web-builder");
  assert.equal(redirectFor("business-plan"), "doc-studio");
  assert.equal(redirectFor("image"), "ad-photo");
  assert.equal(redirectFor("prompt"), "prompt-maker");
  assert.equal(redirectFor("trend-radar"), "idea-radar", "a retired slug goes to the closest tool");
  assert.equal(redirectFor("mvp-blueprint"), "ops-planner");
  assert.equal(redirectFor("seo-composer"), null, "a current slug never redirects");
  for (const id of Object.keys(RETIRED)) assert.notEqual(redirectFor(id), null);
  for (const id of REFERENCE_IDS) assert.notEqual(redirectFor(id), null, `${id} must redirect`);
  assert.equal(toolSlug("sangsepage"), "sales-page", "past runs link to the new URL");
});

test("the next.config redirect table matches the catalog", () => {
  for (const [from, to] of Object.entries(TOOL_REDIRECTS)) assert.equal(redirectFor(from), to, from);
  for (const t of CATALOG) if (t.engine && t.engine !== t.slug) assert.equal(TOOL_REDIRECTS[t.engine], t.slug, t.engine);
});

test("tools are numbered 1..16 in list order; a mode shares its tool's number", () => {
  publicTools().forEach((t, i) => assert.equal(toolNumber(t.slug), i + 1, t.slug));
  assert.equal(toolNumber("hook-lab"), toolNumber("ad-factory"));
  assert.deepEqual(modesOf("ad-factory").map((t) => t.slug), ["hook-lab", "ad-photo", "ad-model"]);
});
