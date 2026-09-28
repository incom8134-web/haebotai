import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGeminiError, providerErrorMessage } from "./provider-errors.ts";

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

test("maps quota and overload errors to a readable message, leaves others alone", () => {
  assert.match(providerErrorMessage(raw(429, "RESOURCE_EXHAUSTED"))!, /사용 한도/);
  assert.match(providerErrorMessage(raw(503, "UNAVAILABLE"))!, /요청이 많아/);
  assert.equal(providerErrorMessage(raw(400, "INVALID_ARGUMENT")), null);
  assert.equal(providerErrorMessage(new Error("크레딧이 부족합니다")), null);
});
