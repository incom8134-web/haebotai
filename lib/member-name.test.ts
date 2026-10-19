import { test } from "node:test";
import assert from "node:assert/strict";
import { formatKoreanPhone, hasProfileName, normalizeName, profileNameOf, suggestedName } from "./member-name.ts";

test("normalizeName trims, collapses spaces and drops control characters", () => {
  assert.equal(normalizeName("  김  민지 "), "김 민지");
  assert.equal(normalizeName("Jun​ Park\n"), "Jun Park");
  assert.equal(normalizeName(""), null);
  assert.equal(normalizeName("   "), null);
  assert.equal(normalizeName(42), null);
});

test("normalizeName caps the length at 40 characters", () => {
  assert.equal(normalizeName("가".repeat(40)), "가".repeat(40));
  assert.equal(normalizeName("가".repeat(41)), null);
});

test("profileNameOf / hasProfileName read app_metadata.name", () => {
  assert.equal(profileNameOf({ name: "  이성웅 " }), "이성웅");
  assert.equal(profileNameOf({ name: "" }), null);
  assert.equal(profileNameOf(null), null);
  assert.equal(hasProfileName({ name: "A" }), true);
  assert.equal(hasProfileName({ provider: "google" }), false);
});

test("suggestedName prefers the provider's full name", () => {
  assert.equal(suggestedName({ full_name: "Minji Kim", name: "minji" }), "Minji Kim");
  assert.equal(suggestedName({ user_name: "카카오닉" }), "카카오닉");
  assert.equal(suggestedName(undefined), "");
});

test("formatKoreanPhone turns Kakao's +82 format into a local number", () => {
  assert.equal(formatKoreanPhone("+82 10-1234-5678"), "010-1234-5678");
  assert.equal(formatKoreanPhone("+82 2-123-4567"), "02-123-4567");
  assert.equal(formatKoreanPhone("010-1111-2222"), "010-1111-2222");
  assert.equal(formatKoreanPhone(""), null);
  assert.equal(formatKoreanPhone(undefined), null);
});
