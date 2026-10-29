import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRunAccess } from "./run-access.ts";

const base = { saas: true, provider: "google" as const, team: false, plan: "plus", estimatedCredits: 40 };

test("SaaS: Plus and Pro run on the platform key for the tool's credits", () => {
  assert.deepEqual(decideRunAccess(base), { ok: true, cost: 40, ownKey: false });
  assert.deepEqual(decideRunAccess({ ...base, plan: "pro" }), { ok: true, cost: 40, ownKey: false });
});

test("SaaS: free and old student accounts can't run", () => {
  for (const plan of ["free", "student"]) {
    const r = decideRunAccess({ ...base, plan });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.code, "plan_required");
    assert.equal(!r.ok && r.status, 402);
  }
});

test("SaaS: the team runs free; Claude isn't offered", () => {
  assert.deepEqual(decideRunAccess({ ...base, plan: "free", team: true }), { ok: true, cost: 0, ownKey: false });
  const r = decideRunAccess({ ...base, provider: "anthropic" });
  assert.equal(!r.ok && r.code, "engine_unavailable");
});

test("own-key mode keeps the old rule", () => {
  assert.equal(decideRunAccess({ ...base, saas: false, ownKeyError: "add a key" }).ok, false);
  assert.deepEqual(decideRunAccess({ ...base, saas: false, hasUsableKey: true }), { ok: true, cost: 0, ownKey: true });
});
