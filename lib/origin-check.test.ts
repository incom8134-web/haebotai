import { test } from "node:test";
import assert from "node:assert/strict";
import { isCrossSiteWrite } from "./origin-check.ts";

const base = { selfOrigin: "https://haebot.example", siteUrl: "https://haebot.example" };

test("blocks a cross-site POST to the API", () => {
  assert.equal(isCrossSiteWrite({ ...base, method: "POST", path: "/api/account/delete", origin: "https://evil.example" }), true);
  assert.equal(isCrossSiteWrite({ ...base, method: "delete", path: "/api/x", origin: "https://haebot.example.evil.example" }), true);
});

test("allows same-site writes, reads, pages and server-to-server calls", () => {
  assert.equal(isCrossSiteWrite({ ...base, method: "POST", path: "/api/account/delete", origin: "https://haebot.example" }), false);
  assert.equal(isCrossSiteWrite({ ...base, method: "GET", path: "/api/export/1", origin: "https://evil.example" }), false);
  assert.equal(isCrossSiteWrite({ ...base, method: "POST", path: "/studio", origin: "https://evil.example" }), false);
  assert.equal(isCrossSiteWrite({ ...base, method: "POST", path: "/api/payments/toss/webhook", origin: null }), false);
  assert.equal(isCrossSiteWrite({ ...base, method: "POST", path: "/api/csp-report", origin: "https://evil.example" }), false);
});

test("the configured site URL counts as same-site behind a proxy", () => {
  assert.equal(isCrossSiteWrite({ method: "POST", path: "/api/x", origin: "https://haebot.example", selfOrigin: "http://internal:3000", siteUrl: "https://haebot.example" }), false);
});
