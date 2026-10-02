import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGeminiError, freeTierBlocked, isAccessDenied, providerErrorMessage, retryAfterSeconds } from "./provider-errors.ts";

const raw = (code: number, status: string) =>
  new Error(JSON.stringify({ error: { code, message: "…", status } }));

test("reads the status from an SDK error's status field", () => {
  const err = Object.assign(new Error("x"), { status: 503 });
  assert.equal(classifyGeminiError(err), "retry-same");
});

test("reads the status from the raw upstream JSON message", () => {
  assert.equal(classifyGeminiError(raw(429, "RESOURCE_EXHAUSTED")), "next-key");
  assert.equal(classifyGeminiError(raw(503, "UNAVAILABLE")), "retry-same");
  assert.equal(classifyGeminiError(raw(400, "INVALID_ARGUMENT")), "fail");
  assert.equal(classifyGeminiError(new Error("모델 응답을 받지 못했습니다")), "fail");
});

test("maps quota and overload errors to a readable message, leaves our own messages alone", () => {
  assert.match(providerErrorMessage(raw(429, "RESOURCE_EXHAUSTED"))!, /사용 한도/);
  assert.match(providerErrorMessage(raw(503, "UNAVAILABLE"))!, /요청이 많아/);
  assert.equal(providerErrorMessage(new Error("크레딧이 부족합니다")), null);
});

test("a refused key (billing in arrears, revoked, invalid) gets its own message and never raw JSON", () => {
  const dunning = new Error(JSON.stringify({ error: { code: 403, message: "Lightning dunning decision is deny for project: projects/1", status: "PERMISSION_DENIED" } }));
  assert.equal(isAccessDenied(dunning), true);
  assert.match(providerErrorMessage(dunning)!, /운영팀에 알렸어요/);
  assert.match(providerErrorMessage(dunning, { ownKey: true })!, /등록한 API 키/);
  assert.equal(isAccessDenied(new Error(JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }))), true);
  assert.equal(isAccessDenied(raw(429, "RESOURCE_EXHAUSTED")), false);
  // Any other upstream JSON is replaced, not shown.
  assert.match(providerErrorMessage(raw(400, "INVALID_ARGUMENT"))!, /AI 엔진에서 오류/);
  assert.doesNotMatch(providerErrorMessage(raw(500, "INTERNAL"))!, /\{/);
});

test("a free-tier key asking for a paid-only model is told apart from a rate limit", () => {
  const paidOnly = new Error(JSON.stringify({ error: { code: 429, message: "You exceeded your current quota. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image. Please retry in 31.2s.", status: "RESOURCE_EXHAUSTED" } }));
  const rateLimited = new Error(JSON.stringify({ error: { code: 429, message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, model: gemini-3.8-flash. Please retry in 23.4s.", status: "RESOURCE_EXHAUSTED" } }));
  assert.equal(freeTierBlocked(paidOnly), true);
  assert.equal(freeTierBlocked(rateLimited), false);
  assert.equal(freeTierBlocked(raw(429, "RESOURCE_EXHAUSTED")), false);
  assert.match(providerErrorMessage(paidOnly)!, /무료 Gemini 키/);
  assert.equal(retryAfterSeconds(rateLimited), 23.4);
  assert.equal(retryAfterSeconds(new Error('{"error":{"code":429,"details":[{"retryDelay": "17s"}]}}')), 17);
  assert.equal(retryAfterSeconds(raw(503, "UNAVAILABLE")), null);
});

test("a free model's daily quota is told apart from a paid-only refusal", async () => {
  const { freeTierDailyQuotaHit } = await import("./provider-errors.ts");
  const perDay = new Error(JSON.stringify({ error: { code: 429, message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }));
  const paidOnly = new Error(JSON.stringify({ error: { code: 429, message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }));
  assert.equal(freeTierDailyQuotaHit(perDay), true);
  assert.equal(freeTierDailyQuotaHit(paidOnly), false);
});
