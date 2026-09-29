import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConfirm, newOrderId, planReconcile, PRO_ORDER } from "./pro.ts";

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

const order = (o: Partial<import("./pro.ts").LedgerOrder> = {}) => ({ status: "pending" as const, amount: PRO_ORDER.amount, failReason: null, createdAt: new Date(Date.now() - 60_000).toISOString(), ...o });

test("reconcile activates only a DONE payment at the stored amount", () => {
  assert.deepEqual(planReconcile(order(), { found: true, status: "DONE", totalAmount: PRO_ORDER.amount }), { kind: "activate" });
  assert.deepEqual(planReconcile(order(), { found: true, status: "DONE", totalAmount: 100 }), { kind: "amount_mismatch" });
});

test("reconcile never grants Pro while a bank transfer is still waiting", () => {
  assert.deepEqual(planReconcile(order(), { found: true, status: "WAITING_FOR_DEPOSIT", totalAmount: PRO_ORDER.amount }), { kind: "none" });
  assert.deepEqual(planReconcile(order(), { found: true, status: "IN_PROGRESS", totalAmount: PRO_ORDER.amount }), { kind: "none" });
});

test("reconcile retries an order failed only by a network error", () => {
  const failedNet = order({ status: "failed", failReason: "NETWORK_ERROR: 결제사에 연결하지 못했습니다" });
  assert.deepEqual(planReconcile(failedNet, { found: true, status: "DONE", totalAmount: PRO_ORDER.amount }), { kind: "activate" });
  const failedReal = order({ status: "failed", failReason: "REJECT_CARD_COMPANY: 거절" });
  assert.deepEqual(planReconcile(failedReal, { found: true, status: "DONE", totalAmount: PRO_ORDER.amount }), { kind: "none" });
});

test("reconcile leaves finished orders alone", () => {
  assert.deepEqual(planReconcile(order({ status: "done" }), { found: true, status: "DONE", totalAmount: PRO_ORDER.amount }), { kind: "none" });
  assert.deepEqual(planReconcile(order({ status: "canceled" }), { found: true, status: "DONE", totalAmount: PRO_ORDER.amount }), { kind: "none" });
});

test("reconcile closes cancelled, expired and long-abandoned orders", () => {
  assert.deepEqual(planReconcile(order(), { found: true, status: "CANCELED", totalAmount: PRO_ORDER.amount }), { kind: "close", status: "canceled", reason: "canceled_at_toss" });
  assert.deepEqual(planReconcile(order(), { found: true, status: "EXPIRED", totalAmount: PRO_ORDER.amount }), { kind: "close", status: "failed", reason: "expired" });
  assert.deepEqual(planReconcile(order(), { found: false }), { kind: "none" });
  const old = order({ createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() });
  assert.deepEqual(planReconcile(old, { found: false }), { kind: "close", status: "failed", reason: "abandoned" });
});
