import { test } from "node:test";
import assert from "node:assert/strict";
import { hasConsent, safeNext } from "./consent.ts";

test("consent needs both the age and the terms confirmation", () => {
  assert.equal(hasConsent({ consent: { age14: true, terms: true, termsVersion: "v1", at: "x" } }), true);
  assert.equal(hasConsent({ consent: { age14: true, termsVersion: "v1" } }), false);
  assert.equal(hasConsent({ consent: { terms: true, termsVersion: "v1" } }), false);
  assert.equal(hasConsent({ consent: { age14: "true", terms: true, termsVersion: "v1" } }), false);
  assert.equal(hasConsent({}), false);
  assert.equal(hasConsent(null), false);
});

test("next redirects stay on this site", () => {
  assert.equal(safeNext("/library?x=1"), "/library?x=1");
  assert.equal(safeNext("//evil.example"), "/studio");
  assert.equal(safeNext("/\\evil.example"), "/studio");
  assert.equal(safeNext("https://evil.example"), "/studio");
  assert.equal(safeNext(null), "/studio");
});
