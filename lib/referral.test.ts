import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReferralCode } from "./referral.ts";

test("referral codes are 8 uppercase letters/digits", () => {
  assert.equal(normalizeReferralCode("ab3de7gh"), "AB3DE7GH");
  assert.equal(normalizeReferralCode(" AB3DE7GH "), "AB3DE7GH");
  assert.equal(normalizeReferralCode("AB3DE7G"), null);
  assert.equal(normalizeReferralCode("AB3DE7GH'; drop"), null);
  assert.equal(normalizeReferralCode(null), null);
});
