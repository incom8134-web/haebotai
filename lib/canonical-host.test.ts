import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalRedirect } from "./canonical-host.ts";

const base = { method: "GET", path: "/auth", search: "?next=%2Fstudio", isProduction: true, siteUrl: "https://haebot.ai" };

test("sends page visits on other hosts to the site host, keeping path and query", () => {
  assert.equal(canonicalRedirect({ ...base, host: "www.haebot.ai" }), "https://haebot.ai/auth?next=%2Fstudio");
  assert.equal(canonicalRedirect({ ...base, host: "haebotai.vercel.app" }), "https://haebot.ai/auth?next=%2Fstudio");
});

test("leaves the site host, API calls, writes, previews and local dev alone", () => {
  assert.equal(canonicalRedirect({ ...base, host: "haebot.ai" }), null);
  assert.equal(canonicalRedirect({ ...base, host: "HAEBOT.AI" }), null);
  assert.equal(canonicalRedirect({ ...base, host: "haebotai.vercel.app", path: "/api/payments/toss/webhook" }), null);
  assert.equal(canonicalRedirect({ ...base, host: "www.haebot.ai", method: "POST" }), null);
  assert.equal(canonicalRedirect({ ...base, host: "www.haebot.ai", isProduction: false }), null);
  assert.equal(canonicalRedirect({ ...base, host: "www.haebot.ai", siteUrl: "http://localhost:3000" }), null);
  assert.equal(canonicalRedirect({ ...base, host: "www.haebot.ai", siteUrl: undefined }), null);
});
