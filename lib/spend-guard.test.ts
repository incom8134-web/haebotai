import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, kstDay, limitsFromEnv } from "./spend-guard-core.ts";

const limits = { platformDailyCredits: 1000, userDailyRuns: 3 };

test("runs pass under every ceiling", () => {
  assert.deepEqual(decide({ killswitch: false, platform: true, cost: 100, platformSpent: 100, userRuns: 1, limits }), { ok: true, alerts: [] });
});

test("the daily platform budget stops platform runs, not own-key runs", () => {
  assert.equal(decide({ killswitch: false, platform: true, cost: 100, platformSpent: 1050, userRuns: 1, limits }).ok, false);
  assert.equal(decide({ killswitch: false, platform: false, cost: 0, platformSpent: 5000, userRuns: 1, limits }).ok, true);
});

test("alerts fire once, on the run that crosses each level", () => {
  assert.deepEqual(decide({ killswitch: false, platform: true, cost: 100, platformSpent: 500, userRuns: 1, limits }).alerts, [50]);
  assert.deepEqual(decide({ killswitch: false, platform: true, cost: 100, platformSpent: 700, userRuns: 1, limits }).alerts, []);
  assert.deepEqual(decide({ killswitch: false, platform: true, cost: 700, platformSpent: 1000, userRuns: 1, limits }).alerts, [50, 80, 100]);
});

test("per-member daily cap and the kill switch", () => {
  const r = decide({ killswitch: false, platform: false, cost: 0, platformSpent: 0, userRuns: 4, limits });
  assert.ok(!r.ok && r.reason === "user_daily_runs");
  const k = decide({ killswitch: true, platform: true, cost: 10, platformSpent: 10, userRuns: 1, limits });
  assert.ok(!k.ok && k.reason === "killswitch");
  assert.equal(decide({ killswitch: true, platform: false, cost: 0, platformSpent: 0, userRuns: 1, limits }).ok, true);
});

test("limits from env fall back to defaults on junk", () => {
  assert.deepEqual(limitsFromEnv({ PLATFORM_DAILY_CREDIT_CAP: "5000", USER_DAILY_RUN_CAP: "abc" }), { platformDailyCredits: 5000, userDailyRuns: 60 });
});

test("days roll over at midnight Korea time", () => {
  assert.equal(kstDay(new Date("2026-09-29T14:59:00Z")), "2026-09-29");
  assert.equal(kstDay(new Date("2026-09-29T15:00:00Z")), "2026-09-30");
});
