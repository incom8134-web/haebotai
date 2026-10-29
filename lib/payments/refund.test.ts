import { test } from "node:test";
import assert from "node:assert/strict";
import { earlierCreditsFrom, quoteRefund, runRefund, type OrderQuote, type RefundDeps } from "./refund.ts";
import { PRODUCTS } from "./pro.ts";

const plus = { amount: PRODUCTS.plus.amount, productCredits: PRODUCTS.plus.credits };

test("unused credits within 7 days: full refund", () => {
  assert.deepEqual(quoteRefund({ ...plus, creditsUsedSince: 0, daysSincePayment: 1 }), { ok: true, refundAmount: 29_900, full: true, usedFromOrder: 0, unusedCredits: 2_000 });
  const topup = quoteRefund({ amount: PRODUCTS.topup.amount, productCredits: PRODUCTS.topup.credits, creditsUsedSince: 0, daysSincePayment: 0 });
  assert.equal(topup.ok && topup.refundAmount, 5_900);
});

test("partly used: pro-rated by unused credits, rounded down (the policy's own example)", () => {
  assert.deepEqual(quoteRefund({ ...plus, creditsUsedSince: 500, daysSincePayment: 3 }), { ok: true, refundAmount: 22_425, full: false, usedFromOrder: 500, unusedCredits: 1_500 });
  // 59,900 × 5,999 / 6,000 = 59,890.01… → 59,890
  const pro = quoteRefund({ amount: PRODUCTS.pro.amount, productCredits: PRODUCTS.pro.credits, creditsUsedSince: 1, daysSincePayment: 2 });
  assert.equal(pro.ok && pro.refundAmount, 59_890);
});

test("credits from an earlier payment count as used first", () => {
  // 300 left from before; 300 used → none of this order's credits used.
  assert.equal(quoteRefund({ ...plus, creditsUsedSince: 300, earlierCredits: 300, daysSincePayment: 1 }).ok, true);
  const full = quoteRefund({ ...plus, creditsUsedSince: 300, earlierCredits: 300, daysSincePayment: 1 });
  assert.equal(full.ok && full.full, true);
  // 800 used, 300 from before → 500 from this order.
  const part = quoteRefund({ ...plus, creditsUsedSince: 800, earlierCredits: 300, daysSincePayment: 1 });
  assert.equal(part.ok && part.refundAmount, 22_425);
});

test("all of the order's credits used: nothing to refund", () => {
  assert.deepEqual(quoteRefund({ ...plus, creditsUsedSince: 2_000, daysSincePayment: 1 }), { ok: false, reason: "fully_used", usedFromOrder: 2_000 });
  assert.deepEqual(quoteRefund({ ...plus, creditsUsedSince: 9_999, daysSincePayment: 1 }), { ok: false, reason: "fully_used", usedFromOrder: 2_000 });
});

test("the 7-day window: day 7 is in, past it is out", () => {
  assert.equal(quoteRefund({ ...plus, creditsUsedSince: 0, daysSincePayment: 7 }).ok, true);
  assert.deepEqual(quoteRefund({ ...plus, creditsUsedSince: 0, daysSincePayment: 7.01 }), { ok: false, reason: "window_passed", usedFromOrder: 0 });
});

test("bad input is refused, never refunded", () => {
  for (const bad of [
    { ...plus, amount: 0, creditsUsedSince: 0, daysSincePayment: 0 },
    { ...plus, amount: 100.5, creditsUsedSince: 0, daysSincePayment: 0 },
    { ...plus, productCredits: 0, creditsUsedSince: 0, daysSincePayment: 0 },
    { ...plus, creditsUsedSince: -1, daysSincePayment: 0 },
    { ...plus, creditsUsedSince: NaN, daysSincePayment: 0 },
    { ...plus, creditsUsedSince: 0, daysSincePayment: -1 },
    { ...plus, creditsUsedSince: 0, daysSincePayment: 0, earlierCredits: -5 },
  ]) {
    assert.equal(quoteRefund(bad).ok, false, JSON.stringify(bad));
  }
});

test("earlier credits are worked out from today's balance", () => {
  // Had 300, bought 2,000, used 800 → balance 1,500.
  assert.equal(earlierCreditsFrom({ balanceNow: 1_500, creditsUsedSince: 800, productCredits: 2_000, laterOrderCredits: 0 }), 300);
  // A later top-up of 500 is in the balance too and doesn't count as earlier.
  assert.equal(earlierCreditsFrom({ balanceNow: 2_000, creditsUsedSince: 800, productCredits: 2_000, laterOrderCredits: 500 }), 300);
  // Never below 0 (hand fixes, or credits already taken back).
  assert.equal(earlierCreditsFrom({ balanceNow: 0, creditsUsedSince: 100, productCredits: 2_000, laterOrderCredits: 0 }), 0);
});

// ── runRefund: the action's order of checks ────────────────────────────

const ORDER = { orderId: "plus_abc123", userId: "u1", paymentKey: "pk_1", amount: 29_900, status: "done", paidAt: "2026-10-28T00:00:00Z", product: { id: "plus", credits: 2_000, days: 30 } };

function fakeDeps(over: Partial<RefundDeps> & { quoteResult?: OrderQuote } = {}) {
  const calls: string[] = [];
  const logs: { action: string; detail: Record<string, unknown> }[] = [];
  const deps: RefundDeps = {
    getStaff: async () => ({ id: "staff1" }),
    quote: async () => over.quoteResult ?? { order: ORDER, quote: quoteRefund({ amount: 29_900, productCredits: 2_000, creditsUsedSince: 500, daysSincePayment: 1 }) },
    cancelAtToss: async (p) => {
      calls.push(`toss:${p.cancelAmount}`);
      return { ok: true, raw: { status: "PARTIAL_CANCELED" } };
    },
    applyRefund: async (p) => {
      calls.push(`ledger:${p.refundAmount}:${p.credits}:${p.days}`);
      return true;
    },
    log: async (_s, action, _t, _id, detail) => {
      logs.push({ action, detail });
    },
    ...over,
  };
  return { deps, calls, logs };
}

test("refund: non-staff callers are refused before anything is read or charged", async () => {
  let quoted = false;
  const { deps, calls, logs } = fakeDeps({ getStaff: async () => null, quote: async () => ((quoted = true), { order: null, reason: "unknown_order" }) });
  assert.deepEqual(await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 22_425 }), { ok: false, message: "not_admin" });
  assert.equal(quoted, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(logs, []);
});

test("refund: cancels at Toss for the quoted amount, then takes back the unused credits and the days, then logs", async () => {
  const { deps, calls, logs } = fakeDeps();
  assert.deepEqual(await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 22_425 }), { ok: true, message: "refunded", userId: "u1" });
  assert.deepEqual(calls, ["toss:22425", "ledger:22425:1500:30"]);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, "refund_payment");
  assert.equal(logs[0].detail.amount, 22_425);
});

test("refund: a stale preview amount is refused (credits used since it was shown)", async () => {
  const { deps, calls } = fakeDeps();
  assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 29_900 })).message, "refund_changed");
  assert.deepEqual(calls, []);
});

test("refund: outside the policy nothing reaches Toss", async () => {
  for (const [quote, message] of [
    [quoteRefund({ amount: 29_900, productCredits: 2_000, creditsUsedSince: 0, daysSincePayment: 8 }), "refund_window_passed"],
    [quoteRefund({ amount: 29_900, productCredits: 2_000, creditsUsedSince: 2_000, daysSincePayment: 1 }), "refund_fully_used"],
  ] as const) {
    const { deps, calls } = fakeDeps({ quoteResult: { order: ORDER, quote } });
    assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 29_900 })).message, message);
    assert.deepEqual(calls, []);
  }
  const { deps } = fakeDeps({ quoteResult: { order: null, reason: "not_refundable" } });
  assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 1 })).message, "refund_not_refundable");
  assert.equal((await runRefund(deps, { orderId: "bad id!", expectedAmount: 1 })).message, "refund_not_refundable");
});

test("refund: a Toss error leaves our ledger alone and is logged", async () => {
  const { deps, calls, logs } = fakeDeps({ cancelAtToss: async () => ({ ok: false, code: "ALREADY_CANCELED_PAYMENT", message: "x" }) });
  assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 22_425 })).message, "refund_toss_failed");
  assert.deepEqual(calls, []);
  assert.equal(logs[0].action, "refund_payment_failed");
  assert.equal(logs[0].detail.step, "toss");
});

test("refund: a ledger failure after Toss refunded is reported and logged for a hand fix", async () => {
  const { deps, logs } = fakeDeps({ applyRefund: async () => Promise.reject(new Error("db down")) });
  assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 22_425 })).message, "refund_ledger_failed");
  assert.equal(logs[0].action, "refund_payment_failed");
  assert.equal(logs[0].detail.step, "ledger");
});

test("refund: a payment with no Toss key can't be cancelled", async () => {
  const { deps, calls } = fakeDeps({ quoteResult: { order: { ...ORDER, paymentKey: null }, quote: quoteRefund({ amount: 29_900, productCredits: 2_000, creditsUsedSince: 0, daysSincePayment: 1 }) } });
  assert.equal((await runRefund(deps, { orderId: ORDER.orderId, expectedAmount: 29_900 })).message, "refund_no_payment_key");
  assert.deepEqual(calls, []);
});
