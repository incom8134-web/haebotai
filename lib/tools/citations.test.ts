import { test } from "node:test";
import assert from "node:assert/strict";
import { splitCitations, stripCitations } from "./citations.ts";

test("splits marks into citation numbers, keeping the text", () => {
  assert.deepEqual(splitCitations("시장 규모는 3조 원이다 [1]. 성장률은 8% [2, 3]", 3), [
    { text: "시장 규모는 3조 원이다" },
    { cite: 1 },
    { text: ". 성장률은 8%" },
    { cite: 2 },
    { cite: 3 },
  ]);
});

test("numbers with no matching source are dropped", () => {
  assert.deepEqual(splitCitations("주장 [7]", 2), [{ text: "주장" }]);
  assert.deepEqual(splitCitations("주장 [1]", 0), [{ text: "주장" }]);
});

test("text without marks comes back whole", () => {
  assert.deepEqual(splitCitations("평범한 문장", 3), [{ text: "평범한 문장" }]);
  assert.deepEqual(splitCitations("", 3), [{ text: "" }]);
  assert.equal(stripCitations("A [1] and B [2, 3]."), "A and B.");
});
