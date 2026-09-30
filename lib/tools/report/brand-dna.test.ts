import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, normHex, readPalette, textOn } from "./brand-dna.ts";

test("contrast matches WCAG reference values", () => {
  assert.equal(Math.round(contrast("#000000", "#FFFFFF")), 21);
  assert.equal(contrast("#767676", "#FFFFFF").toFixed(2), "4.54");
  assert.equal(textOn("#FFF8EE").color, "#111111");
  assert.equal(textOn("#1F4E79").color, "#FFFFFF");
});

test("palette keeps only real hex colours, normalised", () => {
  assert.equal(normHex("fff8ee"), "#FFF8EE");
  assert.equal(normHex("blue"), null);
  const p = readPalette({ palette: [{ name: "a", hex: "#3b6e8f", role: "primary" }, { name: "b", hex: "blue" }] });
  assert.deepEqual(p.map((c) => c.hex), ["#3B6E8F"]);
});
