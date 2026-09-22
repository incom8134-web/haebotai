import assert from "node:assert";
import { test } from "node:test";
import { checkRateLimit, type Limiter } from "./rate-limit-check.ts";

// No real Upstash credentials in dev — these test checkRateLimit's own
// logic (success/blocked/error/timeout handling) against a fake limiter,
// not the real Redis round trip. Verified separately, live, that the
// fail-open path actually returns quickly (bounded by CHECK_TIMEOUT_MS)
// against the current dummy UPSTASH_REDIS_REST_URL instead of hanging.

function fakeLimiter(impl: (id: string) => Promise<{ success: boolean; reset: number }>): Limiter {
  return { limit: impl };
}

test("allows the request when under the limit", async () => {
  const limiter = fakeLimiter(async () => ({ success: true, reset: Date.now() + 60_000 }));
  const result = await checkRateLimit(limiter, "user-1");
  assert.deepEqual(result, { ok: true });
});

test("blocks and reports a sane retry-after when over the limit", async () => {
  const reset = Date.now() + 12_000;
  const limiter = fakeLimiter(async () => ({ success: false, reset }));
  const result = await checkRateLimit(limiter, "user-1");
  assert.equal(result.ok, false);
  assert.ok(result.retryAfterSeconds! >= 11 && result.retryAfterSeconds! <= 12, "should be ~12s away");
});

test("retryAfterSeconds is never zero or negative even if reset is in the past", async () => {
  const limiter = fakeLimiter(async () => ({ success: false, reset: Date.now() - 5000 }));
  const result = await checkRateLimit(limiter, "user-1");
  assert.equal(result.ok, false);
  assert.equal(result.retryAfterSeconds, 1);
});

test("fails open when the limiter throws (Redis unreachable)", async () => {
  const limiter = fakeLimiter(async () => {
    throw new Error("ECONNREFUSED");
  });
  const result = await checkRateLimit(limiter, "user-1");
  assert.deepEqual(result, { ok: true });
});

test("fails open when the limiter hangs past the timeout", async () => {
  const limiter = fakeLimiter(() => new Promise(() => {})); // never resolves
  const start = Date.now();
  const result = await checkRateLimit(limiter, "user-1");
  assert.deepEqual(result, { ok: true });
  assert.ok(Date.now() - start < 2500, "must not wait indefinitely for a hung Redis");
});
