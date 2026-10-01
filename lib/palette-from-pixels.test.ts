import { test } from "node:test";
import assert from "node:assert/strict";
import { paletteFromPixels } from "./palette-from-pixels.ts";

function px(...colors: [number, number, number, number, number][]) {
  const out: number[] = [];
  for (const [r, g, b, a, n] of colors) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return out;
}

test("picks the logo's colours, most common first, skipping white and transparent", () => {
  const data = px([255, 255, 255, 255, 500], [0, 0, 0, 0, 300], [37, 99, 235, 255, 200], [250, 204, 21, 255, 80]);
  assert.deepEqual(paletteFromPixels(data), ["#2563EB", "#FACC15"]);
});

test("near-identical shades collapse into one colour", () => {
  const data = px([37, 99, 235, 255, 100], [40, 102, 238, 255, 100], [220, 38, 38, 255, 50]);
  const out = paletteFromPixels(data);
  assert.equal(out.length, 2);
  assert.equal(out[1], "#DC2626");
});

test("empty or all-background images give nothing", () => {
  assert.deepEqual(paletteFromPixels([]), []);
  assert.deepEqual(paletteFromPixels(px([255, 255, 255, 255, 10])), []);
});
