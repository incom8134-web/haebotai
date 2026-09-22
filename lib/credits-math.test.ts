import assert from "node:assert";
import { test } from "node:test";
import { computeSettlement } from "./credits-math.ts";

test("idempotency: an already-settled run is always a no-op, regardless of input", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: 999, alreadySettled: true });
  assert.deepEqual(result, { used: 0, refund: 0, applied: false });
});

test("today's actual usage: creditsUsed always equals reserved, so refund is 0", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: 30, alreadySettled: false });
  assert.deepEqual(result, { used: 30, refund: 0, applied: true });
});

test("a failed run settles with 0 used, refunding the full reservation", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: 0, alreadySettled: false });
  assert.deepEqual(result, { used: 0, refund: 30, applied: true });
});

test("partial usage (future per-token billing) refunds the difference", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: 12, alreadySettled: false });
  assert.deepEqual(result, { used: 12, refund: 18, applied: true });
});

test("refund is never more than what was reserved: creditsUsed clamps at 0, never goes negative", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: -50, alreadySettled: false });
  assert.equal(result.used, 0);
  assert.equal(result.refund, 30);
});

test("refund is never more than what was reserved: creditsUsed clamps at reserved, never over-charges into a negative refund", () => {
  const result = computeSettlement({ reserved: 30, creditsUsed: 999, alreadySettled: false });
  assert.equal(result.used, 30);
  assert.equal(result.refund, 0);
  assert.ok(result.refund >= 0);
});

test("invariant: used + refund always equals reserved when applied", () => {
  for (const creditsUsed of [-100, -1, 0, 1, 15, 30, 31, 500]) {
    const reserved = 30;
    const result = computeSettlement({ reserved, creditsUsed, alreadySettled: false });
    assert.equal(result.used + result.refund, reserved);
    assert.ok(result.refund <= reserved);
    assert.ok(result.refund >= 0);
  }
});

test("zero-cost runs (own key / student) settle cleanly with nothing to refund", () => {
  const result = computeSettlement({ reserved: 0, creditsUsed: 0, alreadySettled: false });
  assert.deepEqual(result, { used: 0, refund: 0, applied: true });
});
