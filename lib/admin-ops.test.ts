import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyError, computeFunnel, failureAlerts, isLive, parseSettings, runBlock, safeLink } from "./admin-ops.ts";

test("classifyError sorts the real failure messages", () => {
  assert.equal(classifyError("등록한 API 키가 거부되었습니다 — 계정 → 내 API 키에서 키와 결제 상태를 확인해주세요"), "key_refused");
  assert.equal(classifyError("AI 엔진 요청이 많아 지금은 응답할 수 없습니다 — 잠시 후 다시 시도해주세요"), "overloaded");
  assert.equal(classifyError("AI 엔진 사용 한도를 초과했습니다 — 잠시 후 다시 시도해주세요"), "quota");
  assert.equal(classifyError("무료 Gemini 키로는 이미지를 만들 수 없습니다 — Google AI Studio에서 결제를 켠 키를 등록해주세요"), "free_tier");
  assert.equal(classifyError('{"error":{"code":403,"message":"Lightning dunning decision is deny for project","status":"PERMISSION_DENIED"}}'), "billing");
  assert.equal(classifyError("실제 전화번호는 생성할 수 없습니다. [입력 필요]로 표시하세요."), "guard");
  assert.equal(classifyError("홈페이지 HTML을 만들지 못했습니다"), "output");
  assert.equal(classifyError("something new"), "other");
  assert.equal(classifyError(null), "other");
});

test("failureAlerts stays quiet on small numbers and flags high rates and spikes", () => {
  assert.deepEqual(failureAlerts({ runs: 2, failed: 2 }, { runs: 10, failed: 0 }), []);
  assert.equal(failureAlerts({ runs: 6, failed: 3 }, { runs: 70, failed: 0 })[0].level, "critical");
  assert.equal(failureAlerts({ runs: 12, failed: 3 }, { runs: 70, failed: 70 })[0].level, "warning");
  const spike = failureAlerts({ runs: 40, failed: 6 }, { runs: 280, failed: 7 });
  assert.equal(spike.length, 1);
  assert.match(spike[0].message.en, /6× the usual/);
});

test("computeFunnel counts each step and who's stuck", () => {
  const members = [
    { id: "a", createdAt: "2026-10-01T00:00:00Z", onboarded: true, hasKey: true },
    { id: "b", createdAt: "2026-10-02T00:00:00Z", onboarded: true, hasKey: true },
    { id: "c", createdAt: "2026-10-03T00:00:00Z", onboarded: true, hasKey: false },
    { id: "d", createdAt: "2026-10-04T00:00:00Z", onboarded: false, hasKey: false },
  ];
  const runs = [
    { userId: "a", status: "done", createdAt: "2026-10-05T01:00:00Z" },
    { userId: "a", status: "done", createdAt: "2026-10-07T01:00:00Z" },
    { userId: "b", status: "error", createdAt: "2026-10-05T01:00:00Z" },
  ];
  const f = computeFunnel(members, runs);
  assert.deepEqual(f.steps.map((s) => s.count), [4, 3, 2, 2, 1, 1]);
  assert.equal(f.steps[2].ofPrevious, 2 / 3);
  assert.deepEqual(f.stuckAt.onboarded, ["c"]);
  assert.deepEqual(f.stuckAt.signed_up, ["d"]);
  assert.deepEqual(f.stuckAt.first_run, ["b"]);
});

test("parseSettings and runBlock", () => {
  const s = parseSettings([
    { key: "maintenance", value: { on: false, message: "" } },
    { key: "paused_tools", value: { "seo-composer": { message: "점검 중", at: "2026-10-19" }, "BAD SLUG": {} } },
  ]);
  assert.deepEqual(Object.keys(s.pausedTools), ["seo-composer"]);
  assert.deepEqual(runBlock(s, "seo-composer", false), { blocked: true, reason: "paused", message: "점검 중" });
  assert.deepEqual(runBlock(s, "hook-lab", false), { blocked: false });
  assert.deepEqual(runBlock(s, "seo-composer", true), { blocked: false });
  const m = parseSettings([{ key: "maintenance", value: { on: true } }]);
  assert.equal(runBlock(m, "hook-lab", false).blocked, true);
});

test("safeLink keeps same-site paths only", () => {
  assert.equal(safeLink("/account/api-key"), "/account/api-key");
  assert.equal(safeLink("https://evil.example"), null);
  assert.equal(safeLink("//evil.example"), null);
  assert.equal(safeLink(""), null);
});

test("isLive respects publish and the time window", () => {
  const now = Date.parse("2026-10-19T00:00:00Z");
  assert.equal(isLive({ published: true, starts_at: null, ends_at: null }, now), true);
  assert.equal(isLive({ published: false, starts_at: null, ends_at: null }, now), false);
  assert.equal(isLive({ published: true, starts_at: "2026-10-20T00:00:00Z", ends_at: null }, now), false);
  assert.equal(isLive({ published: true, starts_at: null, ends_at: "2026-10-18T00:00:00Z" }, now), false);
});

test("host list: clean entries kept, junk dropped", () => {
  const s = parseSettings([{ key: "host_emails", value: { "Guest@Studio.kr": { addedAt: "2026-10-29T00:00:00Z", by: "boss@x.com", note: "partner" }, "not an email": {}, "@team.co.kr": {} } }]);
  assert.deepEqual(s.hostEmails, ["guest@studio.kr", "@team.co.kr"]);
  assert.equal(s.hostMeta["guest@studio.kr"].note, "partner");
});
