import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedImageUrl } from "./document.ts";

const origin = "https://abcd.supabase.co";

test("allows signed URLs from our own storage", () => {
  assert.equal(isAllowedImageUrl(`${origin}/storage/v1/object/sign/exports/u/1.png?token=x`, origin), true);
});

test("rejects other hosts, internal addresses and non-storage paths", () => {
  assert.equal(isAllowedImageUrl("https://evil.example/a.png", origin), false);
  assert.equal(isAllowedImageUrl("http://169.254.169.254/latest/meta-data/x.png", origin), false);
  assert.equal(isAllowedImageUrl("http://abcd.supabase.co/storage/v1/object/sign/a.png", origin), false);
  assert.equal(isAllowedImageUrl(`${origin}/rest/v1/users.png`, origin), false);
  assert.equal(isAllowedImageUrl("https://abcd.supabase.co.evil.example/storage/v1/a.png", origin), false);
  assert.equal(isAllowedImageUrl("not a url", origin), false);
});

test("rejects everything when storage origin is unset", () => {
  assert.equal(isAllowedImageUrl(`${origin}/storage/v1/object/sign/a.png`, undefined), false);
});
