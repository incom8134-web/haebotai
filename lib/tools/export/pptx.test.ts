import assert from "node:assert";
import { test } from "node:test";
import { buildPresentationPptx } from "./pptx.ts";

// Same "load and inspect" limits as docx.test.ts — pptxgenjs has no
// real read-back API either, so this checks what's checkable: a
// well-formed OOXML zip, and that the model's legitimate edge cases
// (0 slides, a slide with 0 bullet points, no visual/notes text) don't
// throw instead of producing a deck.

const SAMPLE = {
  title: "테스트 발표",
  storyline: "문제에서 해결까지",
  slides: [
    { headline: "문제", points: ["첫 번째 포인트", "두 번째 포인트"], visual: "그래프", speaker_notes: "여기서 강조" },
  ],
  closing_ask: "함께해요",
};

function assertValidPptx(buffer: Buffer) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), "PK", "pptx is a zip container — must start with the PK magic bytes");
  assert.ok(buffer.length > 1000, "a real deck should be well over 1KB");
}

test("buildPresentationPptx produces a valid pptx for a normal presentation", async () => {
  assertValidPptx(await buildPresentationPptx(SAMPLE));
});

test("buildPresentationPptx does not throw with zero slides", async () => {
  assertValidPptx(await buildPresentationPptx({ ...SAMPLE, slides: [] }));
});

test("buildPresentationPptx does not throw when a slide has no bullet points, visual, or notes", async () => {
  assertValidPptx(
    await buildPresentationPptx({
      ...SAMPLE,
      slides: [{ headline: "빈 슬라이드", points: [], visual: "", speaker_notes: "" }],
    }),
  );
});
