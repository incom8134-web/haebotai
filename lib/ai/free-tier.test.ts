import { test } from "node:test";
import assert from "node:assert/strict";
import { freeTierAware, isProText } from "./free-tier.ts";

const quota = (limit: number, model: string, retry = 20) =>
  new Error(JSON.stringify({ error: { code: 429, message: `Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: ${limit}, model: ${model}. Please retry in ${retry}s.`, status: "RESOURCE_EXHAUSTED" } }));
const noSleep = async () => {};

test("only Pro text models fall back", () => {
  assert.equal(isProText("gemini-3.1-pro-preview"), true);
  assert.equal(isProText("gemini-3-pro-image"), false);
  assert.equal(isProText("gemini-3.8-flash"), false);
});

test("a Pro call refused as paid-only is re-sent on Flash, and the key stays on Flash", async () => {
  const seen: string[] = [];
  const call = async (p: { model: string }) => {
    seen.push(p.model);
    if (p.model.includes("pro")) throw quota(0, p.model);
    return "ok";
  };
  const opts = { keyTag: "free-1", flashModel: "gemini-3.8-flash", sleep: noSleep };
  assert.equal(await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, opts), "ok");
  assert.deepEqual(seen, ["gemini-3.1-pro-preview", "gemini-3.8-flash"]);
  seen.length = 0;
  await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, opts);
  assert.deepEqual(seen, ["gemini-3.8-flash"]);
  // Another key is not affected.
  seen.length = 0;
  await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, { ...opts, keyTag: "paid-1" });
  assert.deepEqual(seen, ["gemini-3.1-pro-preview", "gemini-3.8-flash"]);
});

test("an image model has no free fallback: the error goes up", async () => {
  const call = async (p: { model: string }) => {
    throw quota(0, p.model);
  };
  await assert.rejects(freeTierAware({ model: "gemini-3-pro-image" }, call, { keyTag: "free-2", flashModel: "gemini-3.8-flash", sleep: noSleep }), /limit: 0/);
});

test("a short rate-limit wait is honoured once, a long one is not", async () => {
  let n = 0;
  const waits: number[] = [];
  const sleep = async (ms: number) => void waits.push(ms);
  const flaky = async () => {
    if (n++ === 0) throw quota(10, "gemini-3.8-flash", 12);
    return "ok";
  };
  assert.equal(await freeTierAware({ model: "gemini-3.8-flash" }, flaky, { keyTag: "k", flashModel: "f", sleep }), "ok");
  assert.deepEqual(waits, [12_250]);
  const always = async () => {
    throw quota(10, "gemini-3.8-flash", 12);
  };
  await assert.rejects(freeTierAware({ model: "gemini-3.8-flash" }, always, { keyTag: "k", flashModel: "f", sleep }), /limit: 10/);
  await assert.rejects(freeTierAware({ model: "gemini-3.8-flash" }, async () => { throw quota(10, "x", 90); }, { keyTag: "k", flashModel: "f", sleep }), /retry in 90s/);
});
