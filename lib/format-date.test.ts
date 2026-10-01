import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateTime } from "./format-date.ts";

test("result dates are in Korea time, 24-hour, with no locale day periods", () => {
  assert.equal(formatDateTime("2026-10-01T02:09:30Z", "ko"), "2026. 10. 1. 11:09");
  assert.equal(formatDateTime("2026-10-01T15:30:00Z", "ko"), "2026. 10. 2. 00:30");
  assert.equal(formatDateTime("2026-10-01T02:09:30Z", "en"), "Oct 1, 2026, 11:09");
});
