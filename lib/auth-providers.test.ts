import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAuthProviders } from "./auth-providers.ts";

test("Google is always offered; Kakao only when listed", () => {
  assert.deepEqual(parseAuthProviders(undefined), ["google"]);
  assert.deepEqual(parseAuthProviders(""), ["google"]);
  assert.deepEqual(parseAuthProviders("google, Kakao"), ["google", "kakao"]);
  assert.deepEqual(parseAuthProviders("kakao"), ["google", "kakao"]);
  assert.deepEqual(parseAuthProviders("naver"), ["google"]);
});
