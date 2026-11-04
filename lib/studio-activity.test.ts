import assert from "node:assert";
import { test } from "node:test";
import { activitySeries, areaCounts, halfOverHalf } from "./studio-activity.ts";

const now = new Date("2026-11-04T03:00:00Z"); // 12:00 in Seoul

test("the series has one zeroed entry per day, oldest first, ending today in Seoul", () => {
  const s = activitySeries([], now, 7);
  assert.equal(s.length, 7);
  assert.equal(s[6].date, "2026-11-04");
  assert.equal(s[0].date, "2026-10-29");
  assert.ok(s.every((d) => d.runs === 0 && d.credits === 0));
});

test("runs land on their Korean day, credits add up, old rows are ignored", () => {
  const s = activitySeries(
    [
      { created_at: "2026-11-03T16:30:00Z", credits_used: 40, tool_id: "a" }, // 11-04 01:30 KST
      { created_at: "2026-11-04T01:00:00Z", credits_used: 25, tool_id: "a" },
      { created_at: "2026-11-03T10:00:00Z", credits_used: null, tool_id: "b" },
      { created_at: "2026-09-01T10:00:00Z", credits_used: 99, tool_id: "b" },
    ],
    now,
    7,
  );
  assert.deepEqual(s[6], { date: "2026-11-04", runs: 2, credits: 65 });
  assert.deepEqual(s[5], { date: "2026-11-03", runs: 1, credits: 0 });
  assert.equal(s.reduce((n, d) => n + d.runs, 0), 3);
});

test("area counts keep the given order and skip unknown tools", () => {
  const areaOf = (id: string) => ({ x: "brand", y: "campaign" } as Record<string, "brand" | "campaign">)[id];
  const rows = [{ tool_id: "x" }, { tool_id: "y" }, { tool_id: "y" }, { tool_id: "zz" }, { tool_id: null }].map((r) => ({ ...r, created_at: "", credits_used: 0 }));
  assert.deepEqual(areaCounts(rows, ["campaign", "brand"] as const, areaOf), [
    { area: "campaign", runs: 2 },
    { area: "brand", runs: 1 },
  ]);
});

test("half over half: percent change, null without an earlier base", () => {
  assert.equal(halfOverHalf([1, 1, 2, 2]), 100);
  assert.equal(halfOverHalf([2, 2, 1, 1]), -50);
  assert.equal(halfOverHalf([0, 0, 3, 1]), null);
});
