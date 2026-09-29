import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUsageCsv } from "./usage-csv.ts";

const row = { createdAt: "2026-09-01T00:00:00Z", tool: "블로그 글", provider: "google", status: "done", creditsUsed: 40, inputTokens: 1200, outputTokens: 800, runId: "r1" };

test("writes a BOM, a header and one line per run", () => {
  const csv = buildUsageCsv([row]);
  assert.ok(csv.startsWith("﻿date,tool,engine,"));
  assert.equal(csv.trim().split("\r\n").length, 2);
  assert.ok(csv.includes("2026-09-01T00:00:00Z,블로그 글,google,done,40,1200,800,r1"));
});

test("quotes commas/quotes and neutralizes formula-looking cells", () => {
  const csv = buildUsageCsv([{ ...row, tool: 'a,"b"', runId: "=HYPERLINK(1)" }]);
  assert.ok(csv.includes('"a,""b"""'));
  assert.ok(csv.includes("'=HYPERLINK(1)"));
});

test("empty values stay empty", () => {
  const csv = buildUsageCsv([{ ...row, provider: null, creditsUsed: null }]);
  assert.ok(csv.includes("블로그 글,,done,,1200"));
});
