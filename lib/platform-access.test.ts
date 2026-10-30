import { test } from "node:test";
import assert from "node:assert/strict";
import { canUsePlatformKey, normalizeHostEntry } from "./platform-access.ts";

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

test("hosts added in /admin run free too", () => {
  assert.equal(canUsePlatformKey("guest@studio.kr", {}, ["guest@studio.kr"]), true);
  assert.equal(canUsePlatformKey("Anyone@Partner.co.kr", {}, ["@partner.co.kr"]), true);
  assert.equal(canUsePlatformKey("other@gmail.com", {}, ["guest@studio.kr"]), false);
});

test("host entries are cleaned up or refused", () => {
  assert.equal(normalizeHostEntry("  Guest@Studio.KR "), "guest@studio.kr");
  assert.equal(normalizeHostEntry("@Partner.co.kr"), "@partner.co.kr");
  for (const bad of ["", "guest", "a@b", "@", "a@b@c.com", "x y@z.com", "a@b.com,c@d.com", 42]) assert.equal(normalizeHostEntry(bad), null, String(bad));
});
