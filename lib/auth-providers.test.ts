import { test } from "node:test";
import assert from "node:assert/strict";
import { oauthScopes, parseAuthProviders } from "./auth-providers.ts";

test("Google is always offered; Kakao only when listed", () => {
  assert.deepEqual(parseAuthProviders(undefined), ["google"]);
  assert.deepEqual(parseAuthProviders(""), ["google"]);
  assert.deepEqual(parseAuthProviders("google, Kakao"), ["google", "kakao"]);
  assert.deepEqual(parseAuthProviders("kakao"), ["google", "kakao"]);
  assert.deepEqual(parseAuthProviders("naver"), ["google"]);
});

test("oauthScopes asks Kakao for the phone number only when switched on", () => {
  assert.equal(oauthScopes("kakao", true), "phone_number");
  assert.equal(oauthScopes("kakao", false), undefined);
  assert.equal(oauthScopes("google", true), undefined);
});
