import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSENT_VERSION, hasCurrentConsent, nextConsentState, parseConsentInput, safeNext } from "./consent.ts";

test("every required item must be agreed", () => {
  const r = parseConsentInput({ age14: true, terms: true, privacy: true, overseas: false, marketing: true });
  assert.equal(r.ok, false);
  assert.deepEqual(!r.ok && r.missing, ["overseas"]);
  assert.equal(parseConsentInput({ age14: "yes", terms: true, privacy: true, overseas: true }).ok, false);
  assert.equal(parseConsentInput(null).ok, false);
});

test("marketing is optional and defaults to off", () => {
  const r = parseConsentInput({ age14: true, terms: true, privacy: true, overseas: true });
  assert.ok(r.ok && r.value.marketing === false);
});

test("the gate needs the current version and every required timestamp", () => {
  const input = { age14: true, terms: true, privacy: true, overseas: true, marketing: false } as const;
  const state = nextConsentState(null, input, "2026-09-29T00:00:00Z");
  assert.equal(hasCurrentConsent({ consent: state }), true);
  assert.equal(hasCurrentConsent({ consent: { ...state, v: "2020-01-01" } }), false);
  assert.equal(hasCurrentConsent({ consent: { ...state, overseas_at: "" } }), false);
  assert.equal(hasCurrentConsent({}), false);
  assert.equal(hasCurrentConsent(null), false);
  assert.equal(state.v, CONSENT_VERSION);
});

test("marketing time only moves when the choice changes", () => {
  const input = { age14: true, terms: true, privacy: true, overseas: true, marketing: true } as const;
  const first = nextConsentState(null, input, "2026-01-01T00:00:00Z");
  const again = nextConsentState(first, input, "2026-06-01T00:00:00Z");
  assert.equal(again.marketing_at, "2026-01-01T00:00:00Z");
  const off = nextConsentState(again, { ...input, marketing: false }, "2026-07-01T00:00:00Z");
  assert.equal(off.marketing_at, "2026-07-01T00:00:00Z");
});

test("next redirects stay on this site", () => {
  assert.equal(safeNext("/library?x=1"), "/library?x=1");
  assert.equal(safeNext("//evil.example"), "/studio");
  assert.equal(safeNext("/\\evil.example"), "/studio");
  assert.equal(safeNext("https://evil.example"), "/studio");
  assert.equal(safeNext(null), "/studio");
});
