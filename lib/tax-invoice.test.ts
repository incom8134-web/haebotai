import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBusinessNo, normalizeBusinessNo } from "./tax-invoice.ts";

test("business registration numbers: format and check digit", () => {
  assert.equal(normalizeBusinessNo("528-88-00923"), "5288800923");
  assert.equal(normalizeBusinessNo("528 88 00923"), "5288800923");
  assert.equal(normalizeBusinessNo("528-88-00924"), null);
  assert.equal(normalizeBusinessNo("12345"), null);
  assert.equal(formatBusinessNo("5288800923"), "528-88-00923");
});
