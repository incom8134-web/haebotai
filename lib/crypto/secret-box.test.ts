import assert from "node:assert";
import { test } from "node:test";
import { looksLikeAnthropicKey, looksLikeGoogleKey, looksLikeOpenAIKey, open, seal } from "./secret-box.ts";

const secret = "test-secret-at-least-16-chars";

test("round-trips and uses a fresh IV each time", () => {
  const a = seal("AIzaExample", secret);
  const b = seal("AIzaExample", secret);
  assert.notEqual(a, b);
  assert.equal(open(a, secret), "AIzaExample");
});

test("rejects tampering and wrong secrets", () => {
  const sealed = seal("hello", secret);
  const [iv, tag, ct] = sealed.split(".");
  const flipped = Buffer.from(ct, "base64");
  flipped[0] ^= 1;
  assert.throws(() => open([iv, tag, flipped.toString("base64")].join("."), secret));
  assert.throws(() => open(sealed, "another-secret-of-16+chars"));
});

test("refuses short secrets and validates key shape", () => {
  assert.throws(() => seal("x", "short"));
  assert.ok(looksLikeGoogleKey("AIza" + "a".repeat(35)));
  assert.ok(!looksLikeGoogleKey("sk-not-a-google-key"));
  assert.ok(looksLikeAnthropicKey("sk-ant-" + "a".repeat(20)));
  assert.ok(!looksLikeAnthropicKey("sk-" + "a".repeat(20)));
  assert.ok(looksLikeOpenAIKey("sk-" + "a".repeat(20)));
  assert.ok(!looksLikeOpenAIKey("AIza" + "a".repeat(35)));
});
