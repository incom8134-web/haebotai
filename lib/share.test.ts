import { test } from "node:test";
import assert from "node:assert/strict";
import { publicInput, SHARE_TOKEN } from "./share.ts";

test("keeps plain answers, drops uploads, paths and internal keys", () => {
  const out = publicInput({
    brand_name: "달빛 베이커리",
    channels: ["인스타그램", "블로그"],
    _research: { findings: "…" },
    reference: { mode: "refresh" },
    product_photos: ["data:image/png;base64,AAAA"],
    some_upload: "data:image/png;base64,AAAA",
    stored: "0b6c3c1e-1f2a-4b3c-8d4e-5f6a7b8c9d0e/run/a.png",
    file_field: [{ path: "u/x.png" }],
  });
  assert.deepEqual(out, { brand_name: "달빛 베이커리", channels: ["인스타그램", "블로그"] });
  assert.deepEqual(publicInput(null), {});
});

test("share tokens are long random URL-safe strings", () => {
  assert.ok(SHARE_TOKEN.test("aB3_-xYz0123456789AbCd"));
  assert.ok(!SHARE_TOKEN.test("short"));
  assert.ok(!SHARE_TOKEN.test("../../etc/passwd/aaaaaaaaaaaaa"));
});
