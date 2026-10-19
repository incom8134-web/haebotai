import { test } from "node:test";
import assert from "node:assert/strict";
import { tierFromResponse } from "./key-tier.ts";

test("a Pro answer means a paid key", () => {
  assert.equal(tierFromResponse(200, "{}"), "paid");
});

test("a free_tier 429 means a free key, whether blocked or out of today's quota", () => {
  assert.equal(tierFromResponse(429, "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3.1-pro"), "free");
  assert.equal(tierFromResponse(429, "generate_content_free_tier_requests PerDay limit: 20"), "free");
});

test("a plain 429 is a paid key hitting its rate limit", () => {
  assert.equal(tierFromResponse(429, "Resource has been exhausted (e.g. check quota)."), "rate_limited");
});

test("rejected keys", () => {
  assert.equal(tierFromResponse(400, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'), "invalid");
  assert.equal(tierFromResponse(403, "PERMISSION_DENIED"), "invalid");
  assert.equal(tierFromResponse(500, "internal"), "unknown");
  assert.equal(tierFromResponse(400, "bad request"), "unknown");
});
