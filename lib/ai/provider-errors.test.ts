import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGeminiError, isAccessDenied, providerErrorMessage } from "./provider-errors.ts";

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
