import { test } from "node:test";
import assert from "node:assert/strict";
import { freeTierAware, isProText } from "./free-tier.ts";

const quota = (limit: number, model: string, retry = 20, quotaId = limit === 0 ? "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" : "GenerateRequestsPerMinutePerProjectPerModel-FreeTier") =>
  new Error(JSON.stringify({ error: { code: 429, message: `Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: ${limit}, model: ${model}. Please retry in ${retry}s.`, status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId }] }] } }));
const daily = (model: string) => quota(20, model, 49, "GenerateRequestsPerDayPerProjectPerModel-FreeTier");
const busy = new Error(JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } }));
const noSleep = async () => {};
let n = 0;
const tag = () => `key-${n++}`;

test("only Pro text models count as Pro", () => {
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
  const opts = { keyTag: tag(), sleep: noSleep };
  assert.equal(await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, opts), "ok");
  assert.deepEqual(seen, ["gemini-3.1-pro-preview", "gemini-3.8-flash"]);
  seen.length = 0;
  await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, opts);
  assert.deepEqual(seen, ["gemini-3.8-flash"]);
  // Another key is not affected.
  seen.length = 0;
  await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, { ...opts, keyTag: tag() });
  assert.deepEqual(seen, ["gemini-3.1-pro-preview", "gemini-3.8-flash"]);
});

test("a free model out of today's quota hands over to the next free model, and stays skipped", async () => {
  const seen: string[] = [];
  const call = async (p: { model: string }) => {
    seen.push(p.model);
    if (p.model.includes("pro")) throw quota(0, p.model);
    if (p.model === "gemini-3.8-flash") throw daily(p.model);
    return p.model;
  };
  const opts = { keyTag: tag(), sleep: noSleep };
  assert.equal(await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, opts), "gemini-3.6-flash");
  assert.deepEqual(seen, ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.6-flash"]);
  seen.length = 0;
  assert.equal(await freeTierAware({ model: "gemini-3.8-flash" }, call, opts), "gemini-3.6-flash");
  assert.deepEqual(seen, ["gemini-3.6-flash"]);
});

test("when every free model is used up, the last error goes up", async () => {
  const call = async (p: { model: string }) => {
    throw p.model.includes("pro") ? quota(0, p.model) : daily(p.model);
  };
  await assert.rejects(freeTierAware({ model: "gemini-3.1-pro-preview" }, call, { keyTag: tag(), sleep: noSleep }), /PerDay/);
});

test("an image model has no free fallback: the error goes up", async () => {
  const seen: string[] = [];
  const call = async (p: { model: string }) => {
    seen.push(p.model);
    throw quota(0, p.model);
  };
  await assert.rejects(freeTierAware({ model: "gemini-3-pro-image" }, call, { keyTag: tag(), sleep: noSleep }), /limit: 0/);
  assert.deepEqual(seen, ["gemini-3-pro-image"]);
});

test("busy: waits 3, 8 and 15 s; a free key then moves to another model, a paid key gets the error", async () => {
  const waits: number[] = [];
  const sleep = async (ms: number) => void waits.push(ms);
  let i = 0;
  const recovers = async () => {
    if (i++ < 2) throw busy;
    return "ok";
  };
  assert.equal(await freeTierAware({ model: "gemini-3.8-flash" }, recovers, { keyTag: tag(), sleep }), "ok");
  assert.deepEqual(waits, [3_000, 8_000]);

  waits.length = 0;
  await assert.rejects(freeTierAware({ model: "gemini-3.8-flash" }, async () => { throw busy; }, { keyTag: tag(), sleep }), /high demand/);
  assert.deepEqual(waits, [3_000, 8_000, 15_000]);

  const freeKey = tag();
  const seen: string[] = [];
  const call = async (p: { model: string }) => {
    seen.push(p.model);
    if (p.model.includes("pro")) throw quota(0, p.model);
    if (p.model === "gemini-3.8-flash") throw busy;
    return p.model;
  };
  assert.equal(await freeTierAware({ model: "gemini-3.1-pro-preview" }, call, { keyTag: freeKey, sleep: noSleep }), "gemini-3.6-flash");
  assert.deepEqual(seen.filter((m) => m === "gemini-3.8-flash").length, 4);
});

test("a short rate-limit wait is honoured once, a long one is not", async () => {
  let k = 0;
  const waits: number[] = [];
  const sleep = async (ms: number) => void waits.push(ms);
  const flaky = async () => {
    if (k++ === 0) throw quota(10, "gemini-3.8-flash", 12);
    return "ok";
  };
  assert.equal(await freeTierAware({ model: "gemini-3.8-flash" }, flaky, { keyTag: tag(), sleep }), "ok");
  assert.deepEqual(waits, [12_250]);
  await assert.rejects(freeTierAware({ model: "gemini-3.8-flash" }, async () => { throw quota(10, "x", 90); }, { keyTag: tag(), sleep }), /retry in 90s/);
});

test("a free key whose Search allowance is used up answers without Search", async () => {
  const bare = Object.assign(new Error(JSON.stringify({ error: { code: 429, message: "You exceeded your current quota, please check your plan and billing details.", status: "RESOURCE_EXHAUSTED" } })), { status: 429 });
  const seen: { model: string; search: boolean }[] = [];
  const call = async (p: { model: string; config?: { tools?: unknown[] } }) => {
    const search = !!p.config?.tools?.length;
    seen.push({ model: p.model, search });
    if (p.model.includes("pro")) throw quota(0, p.model);
    if (search) throw bare;
    return "ok";
  };
  const opts = { keyTag: tag(), sleep: noSleep };
  const params = { model: "gemini-3.1-pro-preview", config: { tools: [{ googleSearch: {} }] } };
  assert.equal(await freeTierAware(params, call, opts), "ok");
  assert.deepEqual(seen.at(-1), { model: "gemini-3.8-flash", search: false });
  seen.length = 0;
  await freeTierAware(params, call, opts);
  assert.deepEqual(seen, [{ model: "gemini-3.8-flash", search: false }]);
  // A paid key (never marked free) keeps Search and gets the error.
  await assert.rejects(freeTierAware({ model: "gemini-3.8-flash", config: { tools: [{ googleSearch: {} }] } }, async () => { throw bare; }, { keyTag: tag(), sleep: noSleep }), /exceeded/);
});
