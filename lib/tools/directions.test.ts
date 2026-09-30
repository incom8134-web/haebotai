import { test } from "node:test";
import assert from "node:assert/strict";
import { DIRECTIONS } from "./directions.ts";

test("every pool has several directions with unique ids", () => {
  for (const [tool, pool] of Object.entries(DIRECTIONS)) {
    assert.ok(pool.length >= 4, `${tool} needs variety`);
    assert.equal(new Set(pool.map((d) => d.id)).size, pool.length, `${tool}: duplicate id`);
  }
});

test("the homepage menu covers calm, traditional, tech and shop tones, not only loud ones", () => {
  const ids = DIRECTIONS.homepage.map((d) => d.id);
  for (const id of ["calm-trust", "heritage", "product-tech", "catalog", "playful", "dark-luxe"]) assert.ok(ids.includes(id), id);
});
