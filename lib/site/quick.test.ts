import { test } from "node:test";
import assert from "node:assert/strict";
import { QUICK_MAIN, QUICK_MORE, QUICK_TOOLS, quickHref, quickSeed, quickTool } from "./quick.ts";
import { catalogTool } from "../tools/catalog.ts";
import { briefField } from "../tools/brief.ts";
import type { ToolManifest } from "../tools/types.ts";
import { contentTransformer } from "../tools/registry/content-transformer.ts";
import { copy } from "../tools/registry/copy.ts";
import { hookLab } from "../tools/registry/hook-lab.ts";
import { blog } from "../tools/registry/blog.ts";
import { image } from "../tools/registry/image.ts";
import { strategy } from "../tools/registry/strategy.ts";
import { insightMiner } from "../tools/registry/insight-miner.ts";

const MANIFESTS: Record<string, ToolManifest> = Object.fromEntries(
  [contentTransformer, copy, hookLab, blog, image, strategy, insightMiner].map((m) => [m.id, m]),
);

test("three main tools, a few more, no duplicates", () => {
  assert.equal(QUICK_MAIN.length, 3);
  assert.ok(QUICK_MORE.length >= 3 && QUICK_MORE.length <= 5);
  assert.equal(new Set(QUICK_TOOLS.map((t) => t.id)).size, QUICK_TOOLS.length);
  assert.equal(new Set(QUICK_TOOLS.map((t) => t.slug)).size, QUICK_TOOLS.length);
});

test("each quick tool opens a real tool on the engine it names", () => {
  for (const t of QUICK_TOOLS) {
    const c = catalogTool(t.slug);
    assert.ok(c, `${t.id}: no catalog entry for ${t.slug}`);
    assert.equal(c!.engine, t.engine, `${t.id}: ${t.slug} runs on ${c!.engine}, not ${t.engine}`);
    assert.ok(MANIFESTS[t.engine], `${t.id}: manifest for ${t.engine} not loaded in this test`);
  }
});

test("the owner's line lands in a text field, and seeds are valid choices", () => {
  for (const t of QUICK_TOOLS) {
    const m = MANIFESTS[t.engine];
    const field = briefField(m);
    assert.ok(field, `${t.id}: ${t.engine} has no text field for the line`);
    for (const [id, value] of Object.entries(t.seed)) {
      const f = m.inputs.find((x) => x.id === id);
      assert.ok(f, `${t.id}: ${t.engine} has no field "${id}"`);
      assert.notEqual(id, field!.id, `${t.id}: a seed would overwrite the owner's line`);
      if (f!.kind === "select") assert.ok(typeof value === "string" && f!.options.some((o) => o.value === value), `${t.id}: "${value}" is not an option of ${id}`);
      else if (f!.kind === "multiselect") {
        assert.ok(Array.isArray(value), `${t.id}: ${id} takes a list`);
        for (const v of value as string[]) assert.ok(f!.options.some((o) => o.value === v), `${t.id}: "${v}" is not an option of ${id}`);
        if (f!.max) assert.ok((value as string[]).length <= f!.max);
      } else assert.fail(`${t.id}: only select/multiselect fields are seeded (got ${f!.kind} for ${id})`);
    }
  }
});

test("examples fit the field they land in, in both languages", () => {
  for (const t of QUICK_TOOLS) {
    const field = briefField(MANIFESTS[t.engine])!;
    assert.ok(t.examples.length >= 1);
    for (const e of t.examples) {
      assert.ok(e.ko.trim() && e.en.trim(), `${t.id}: empty example`);
      if (field.max) assert.ok(e.ko.length <= field.max, `${t.id}: example longer than ${field.id}`);
    }
  }
});

test("helpers: lookup, seed by slug, simple-mode link", () => {
  assert.equal(quickTool("social")?.slug, "content-transformer");
  assert.equal(quickTool("nope"), undefined);
  assert.deepEqual(quickSeed("hook-lab"), { platforms: ["reels", "shorts"], goal: "awareness" });
  assert.deepEqual(quickSeed("logo-lab"), {});
  const href = quickHref(QUICK_MAIN[0], "  동네 빵집 & 카페  ");
  assert.ok(href.startsWith("/tools/content-transformer/run?"));
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("quick"), "1");
  assert.equal(q.get("brief"), "동네 빵집 & 카페");
});
