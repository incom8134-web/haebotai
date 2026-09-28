import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConfirm, newOrderId, PRO_ORDER } from "./pro.ts";

test("order ids fit Toss's 6-64 [A-Za-z0-9_-] rule", () => {
  const id = newOrderId();
  assert.match(id, /^[A-Za-z0-9_-]{6,64}$/);
  assert.equal(newOrderId(() => "a-b-c"), "pro_abc");
});

test("confirm accepts only a pending order at its stored amount", () => {
  assert.deepEqual(checkConfirm({ amount: PRO_ORDER.amount, status: "pending" }, PRO_ORDER.amount), { ok: true });
  assert.deepEqual(checkConfirm({ amount: PRO_ORDER.amount, status: "pending" }, 100), { ok: false, reason: "amount_mismatch" });
  assert.deepEqual(checkConfirm({ amount: PRO_ORDER.amount, status: "pending" }, 19_900.5), { ok: false, reason: "amount_mismatch" });
});

test("a finished or failed order is never confirmed again", () => {
  assert.deepEqual(checkConfirm({ amount: PRO_ORDER.amount, status: "done" }, PRO_ORDER.amount), { ok: false, reason: "already_done" });
  assert.deepEqual(checkConfirm({ amount: PRO_ORDER.amount, status: "failed" }, PRO_ORDER.amount), { ok: false, reason: "not_pending" });
});
