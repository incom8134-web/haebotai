import assert from "node:assert";
import { test } from "node:test";
import { ownKeyRequiredError, resolveCost, resolveRequestedProvider } from "./resolve-provider.ts";

// grant: permanently google-only — it's a static placeholder that never
// reaches any adapter (lib/tools/generate.ts), so it never gets a second
// provider. A stable "still google-only" fixture, unlike a text tool
// that's only *not yet* enabled.

test("no provider requested: resolves to the tool's default (google)", () => {
  const result = resolveRequestedProvider("grant", undefined);
  assert.deepEqual(result, { ok: true, provider: "google" });
});

test("google is always allowed, even for a tool with no explicit override", () => {
  const result = resolveRequestedProvider("grant", "google");
  assert.deepEqual(result, { ok: true, provider: "google" });
});

test("rejects a provider the capability map disallows for this tool", () => {
  const result = resolveRequestedProvider("grant", "anthropic");
  assert.equal(result.ok, false);
});

test("allows anthropic for a tool the capability map has enabled it for (strategy)", () => {
  const result = resolveRequestedProvider("strategy", "anthropic");
  assert.deepEqual(result, { ok: true, provider: "anthropic" });
});

test("rejects garbage input, not just unsupported providers", () => {
  const result = resolveRequestedProvider("grant", "not-a-real-provider");
  assert.equal(result.ok, false);
});

test("rejects an unknown tool id the same as a disallowed provider (falls back to google-only default)", () => {
  const result = resolveRequestedProvider("no-such-tool", "openai");
  assert.equal(result.ok, false);
});

test("ownKeyRequiredError: google never requires an own key", () => {
  assert.equal(ownKeyRequiredError("google", { hasAnyKey: false, hasUsableKey: false }), null);
});

test("ownKeyRequiredError: anthropic/openai with a usable key need no error", () => {
  assert.equal(ownKeyRequiredError("anthropic", { hasAnyKey: true, hasUsableKey: true }), null);
});

test("ownKeyRequiredError: never registered a key points at registering one", () => {
  const message = ownKeyRequiredError("anthropic", { hasAnyKey: false, hasUsableKey: false });
  assert.ok(message);
  assert.match(message, /등록/);
});

test("ownKeyRequiredError: registered but every slot is broken/exhausted names that, not 'register a key'", () => {
  const message = ownKeyRequiredError("openai", { hasAnyKey: true, hasUsableKey: false });
  assert.ok(message);
  assert.match(message, /한도 초과|인증 실패/);
  assert.doesNotMatch(message, /먼저 등록/);
});

test("resolveCost: google charges the estimate unless own-key or student", () => {
  assert.equal(resolveCost("google", false, false, 30), 30);
  assert.equal(resolveCost("google", true, false, 30), 0);
  assert.equal(resolveCost("google", false, true, 30), 0);
});

test("resolveCost: anthropic/openai are always 0, plan and key status aside", () => {
  assert.equal(resolveCost("anthropic", true, false, 30), 0);
  assert.equal(resolveCost("anthropic", false, false, 30), 0);
  assert.equal(resolveCost("openai", false, true, 30), 0);
});
