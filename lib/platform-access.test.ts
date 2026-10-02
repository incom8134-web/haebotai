import { test } from "node:test";
import assert from "node:assert/strict";
import { canUsePlatformKey } from "./platform-access.ts";

const env = { PLATFORM_KEY_EMAILS: " Tester@Example.com, @team.co.kr ", ADMIN_EMAILS: "boss@example.com" };

test("only the team may use the platform key", () => {
  assert.equal(canUsePlatformKey("tester@example.com", env), true);
  assert.equal(canUsePlatformKey("TESTER@example.com", env), true);
  assert.equal(canUsePlatformKey("boss@example.com", env), true);
  assert.equal(canUsePlatformKey("anyone@team.co.kr", env), true);
  assert.equal(canUsePlatformKey("member@gmail.com", env), false);
  assert.equal(canUsePlatformKey("x@notteam.co.kr", env), false);
  assert.equal(canUsePlatformKey("team.co.kr", env), false);
  assert.equal(canUsePlatformKey(null, env), false);
});

test("with no list configured, nobody uses the platform key", () => {
  assert.equal(canUsePlatformKey("tester@example.com", {}), false);
});
