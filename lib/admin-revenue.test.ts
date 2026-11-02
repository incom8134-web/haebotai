import { test } from "node:test";
import assert from "node:assert/strict";
import { revenueSummary } from "./admin-revenue.ts";

test("revenue: refunds, VAT, fees, AI cost and referral shares come off", () => {
  const s = revenueSummary({
    payments: [
      { amount: 29_900, refunded: 0, status: "done", plan: "plus", approved: true },
      { amount: 59_900, refunded: 9_900, status: "done", plan: "pro", approved: true },
      { amount: 5_900, refunded: 0, status: "canceled", plan: "topup", approved: true }, // refunded before 0025
      { amount: 29_900, refunded: 0, status: "canceled", plan: "plus", approved: false }, // never paid
      { amount: 29_900, refunded: 0, status: "pending", plan: "plus", approved: false },
    ],
    creditsUsed: 1_000,
    referralShares: 5_436,
  });
  assert.equal(s.orders, 3);
  assert.equal(s.gross, 95_700);
  assert.equal(s.refunds, 15_800);
  assert.equal(s.net, 79_900);
  assert.equal(s.vat, 7_264);
  assert.equal(s.tossFee, 2_717);
  assert.equal(s.aiCost, 5_000);
  assert.equal(s.margin, 79_900 - 7_264 - 2_717 - 5_000 - 5_436);
  assert.deepEqual(s.byPlan.pro, { orders: 1, net: 50_000 });
  assert.deepEqual(s.byPlan.topup, { orders: 1, net: 0 });
});
