import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { labelAiImage } from "./ai-label.ts";

const TYPE = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";
const img = (fmt: "png" | "jpeg") => sharp({ create: { width: 8, height: 6, channels: 3, background: "#3366cc" } })[fmt]().toBuffer();

for (const fmt of ["png", "jpeg"] as const) {
  test(`${fmt}: label is readable, pixels untouched`, async () => {
    const before = await img(fmt);
    const after = labelAiImage(before);
    assert.ok(after.length > before.length);
    const meta = await sharp(after).metadata();
    assert.equal(meta.width, 8);
    assert.ok(meta.xmp && meta.xmp.toString("utf8").includes(TYPE), "XMP carries the IPTC digital source type");
    const [a, b] = await Promise.all([sharp(before).raw().toBuffer(), sharp(after).raw().toBuffer()]);
    assert.ok(a.equals(b), "same decoded pixels");
    assert.equal(labelAiImage(after), after, "labelling twice is a no-op");
  });
}

test("composite source and pass-through", async () => {
  const png = labelAiImage(await img("png"), "compositeWithTrainedAlgorithmicMedia");
  assert.ok((await sharp(png).metadata()).xmp!.toString("utf8").includes("compositeWithTrainedAlgorithmicMedia"));
  const webp = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } }).webp().toBuffer();
  assert.equal(labelAiImage(webp), webp);
  const junk = Buffer.from("not an image");
  assert.equal(labelAiImage(junk), junk);
});
