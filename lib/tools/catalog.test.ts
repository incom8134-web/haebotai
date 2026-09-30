import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOL_REDIRECTS } from "./tool-redirects.ts";
import { CATALOG, CATEGORY_ORDER, publicTools, redirectFor, RETIRED, toolSlug, toolsIn } from "./catalog.ts";

// The reference product's tool ids — none may be a public slug again.
const REFERENCE_IDS = ["blog", "sangsepage", "image", "logo", "trend", "calendar", "prompt", "money", "homepage", "proposal", "keyword", "brand-model", "place", "business-plan", "grant"];

test("exactly 25 public tools, 5 in each of the 5 categories", () => {
  assert.equal(publicTools().length, 25);
  assert.equal(CATEGORY_ORDER.length, 5);
  for (const c of CATEGORY_ORDER) assert.equal(toolsIn(c).length, 5, c);
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
  const names = publicTools().map((t) => t.name.ko);
  assert.equal(new Set(names).size, 25);
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
  assert.equal(redirectFor("prompt"), "");
  assert.equal(redirectFor("seo-composer"), null, "a current slug never redirects");
  for (const id of Object.keys(RETIRED)) assert.notEqual(redirectFor(id), null);
  for (const id of REFERENCE_IDS) assert.notEqual(redirectFor(id), null, `${id} must redirect`);
  assert.equal(toolSlug("sangsepage"), "sales-page", "past runs link to the new URL");
});

test("the next.config redirect table matches the catalog", () => {
  for (const [from, to] of Object.entries(TOOL_REDIRECTS)) assert.equal(redirectFor(from), to, from);
  for (const t of CATALOG) if (t.engine && t.engine !== t.slug) assert.equal(TOOL_REDIRECTS[t.engine], t.slug, t.engine);
});
