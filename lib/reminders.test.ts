import { test } from "node:test";
import assert from "node:assert/strict";
import { planReminders } from "./reminders.ts";

test("reminders: plan ending soon and low credits, paid plans only", () => {
  const plus = { plan: "plus", expiresAt: "2026-11-05T00:00:00Z", daysLeft: 3 };
  assert.deepEqual(planReminders({ ...plus, plan: "free" }, 0), []);
  assert.deepEqual(planReminders({ ...plus, daysLeft: 10 }, 1500), []);
  assert.deepEqual(planReminders(plus, 1500).map((r) => r.id), ["r:ending:2026-11-05"]);
  assert.deepEqual(planReminders({ ...plus, daysLeft: 10 }, 150).map((r) => r.id), ["r:low:2026-11-05"]);
  assert.equal(planReminders(plus, 150).length, 2);
  assert.match(planReminders({ ...plus, daysLeft: 1 }, 1500)[0].title.ko, /오늘/);
});
