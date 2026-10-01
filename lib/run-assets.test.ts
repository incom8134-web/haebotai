import { test } from "node:test";
import assert from "node:assert/strict";
import { assetPaths, withSignedUrls } from "./run-assets.ts";

const output = {
  images: [
    { asset_id: "u1/run/a.png", url: "https://old/a" },
    { asset_id: "u1/run/b.png", url: "https://old/b" },
  ],
  concepts: [{ image: { asset_id: "u1/run/c.png", url: "https://old/c" }, symbol_image: { asset_id: "u2/x.png", url: "https://other" } }],
  note: "u1/run/not-an-asset.png",
};

test("finds the member's own image paths anywhere in the output", () => {
  assert.deepEqual(assetPaths(output, "u1").sort(), ["u1/run/a.png", "u1/run/b.png", "u1/run/c.png"]);
  assert.deepEqual(assetPaths(null, "u1"), []);
  assert.deepEqual(assetPaths({ asset_id: "u1/../u2/x.png" }, "u1"), []);
});

test("swaps in fresh URLs without touching the original or others' assets", () => {
  const fresh = withSignedUrls(output, "u1", new Map([["u1/run/a.png", "https://new/a"], ["u1/run/c.png", "https://new/c"], ["u2/x.png", "https://hijack"]]));
  assert.equal(fresh.images[0].url, "https://new/a");
  assert.equal(fresh.images[1].url, "https://old/b");
  assert.equal(fresh.concepts[0].image.url, "https://new/c");
  assert.equal(fresh.concepts[0].symbol_image.url, "https://other");
  assert.equal(output.images[0].url, "https://old/a");
});
