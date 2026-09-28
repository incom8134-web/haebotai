import { test } from "node:test";
import assert from "node:assert/strict";
import { redactInventedPrices } from "./price-guard.ts";

const input = "꽃다발 35,000원부터, 정기구독 월 59,000원, 체험 3만 원";
const page = (body: string) => `<html><head><style>.a{width:65000px}</style></head><body>${body}</body></html>`;

test("keeps prices the user typed, in any common format", () => {
  const html = page("<p>35,000원 ~</p><p>월 59000 원</p><p>체험 30,000원</p>");
  assert.equal(redactInventedPrices(html, input), html);
});

test("replaces a price the user never gave", () => {
  const out = redactInventedPrices(page("<h3>풍성한 꽃다발</h3><p>65,000원 ~</p>"), input);
  assert.match(out, /<p>\[입력 필요\] ~<\/p>/);
  assert.doesNotMatch(out, /65,000원/);
});

test("leaves CSS, scripts and markup alone", () => {
  const html = page('<script>const price = "99,000원";</script><a href="#">예약</a>');
  assert.equal(redactInventedPrices(html, input), html);
});
