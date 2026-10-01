import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW, PERSONAS, BEFORE_AFTER } from "./landing.ts";
import { publicTools, catalogTool } from "../tools/catalog.ts";

test("the homepage flow shows every public tool exactly once", () => {
  const inFlow = FLOW.flatMap((s) => s.tools);
  assert.equal(new Set(inFlow).size, inFlow.length, "a tool appears twice");
  assert.deepEqual(
    [...inFlow].sort(),
    publicTools()
      .map((t) => t.slug)
      .sort(),
  );
});

test("persona and before/after tools are live public tools", () => {
  for (const slug of [...PERSONAS.flatMap((p) => p.tools), BEFORE_AFTER.tool]) {
    const t = catalogTool(slug);
    assert.ok(t && t.engine && !t.hidden, slug);
  }
});
