import { test } from "node:test";
import assert from "node:assert/strict";
import { ownsPath, sniffLogoType } from "./brand-logo-check.ts";

test("logo type comes from the bytes", () => {
  assert.equal(sniffLogoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
  assert.equal(sniffLogoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
  assert.equal(sniffLogoType(webp)?.ext, "webp");
  assert.equal(sniffLogoType(new TextEncoder().encode("<svg xmlns=")), null);
  assert.equal(sniffLogoType(new Uint8Array([])), null);
});

test("only the member's own folder counts", () => {
  assert.equal(ownsPath("u1/run/logo.png", "u1"), true);
  assert.equal(ownsPath("u2/run/logo.png", "u1"), false);
  assert.equal(ownsPath("u1/../u2/x.png", "u1"), false);
  assert.equal(ownsPath(42, "u1"), false);
});
