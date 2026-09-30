import { test } from "node:test";
import assert from "node:assert/strict";
import { DIRECTIONS } from "./directions.ts";
import { briefBlock, briefPrompt, briefSchema, parseBrief } from "./request-brief.ts";
import { buildContext } from "./generate-prompt.ts";
import type { ToolManifest } from "./types.ts";

const pool = DIRECTIONS.homepage;
const raw = { subject: "김앤리 법률사무소", uses_profile: false, tone: "차분하고 신뢰감 있는", audience: "상담이 필요한 개인", formality: "formal", energy: "calm", avoid: ["장난스러운 스티커"], direction_id: "calm-trust", direction_reason: "법률 상담은 신뢰가 먼저" };

test("the chosen direction must be one of the tool's own", () => {
  const b = parseBrief(raw, pool);
  assert.equal(b?.direction?.id, "calm-trust");
  assert.equal(parseBrief({ ...raw, direction_id: "made-up" }, pool)?.direction, null);
  assert.equal(parseBrief({ ...raw, direction_id: "" }, pool)?.direction, null);
});

test("junk answers are rejected or normalised, never trusted blindly", () => {
  assert.equal(parseBrief(null, pool), null);
  assert.equal(parseBrief({ ...raw, tone: "" }, pool), null);
  const b = parseBrief({ ...raw, formality: "shouty", energy: 7, avoid: "x" }, pool)!;
  assert.equal(b.formality, "neutral");
  assert.equal(b.energy, "balanced");
  assert.deepEqual(b.avoid, []);
});

test("a request about another business says so and keeps the profile out", () => {
  const block = briefBlock(parseBrief(raw, pool)!);
  assert.match(block, /김앤리 법률사무소/);
  assert.match(block, /저장 프로필과 다른 사업/);
  assert.match(block, /차분하고 신뢰감 있는/);
  assert.match(block, /피할 것: 장난스러운 스티커/);
  assert.match(block, /톤에 맞춰 고른 창작 방향: 차분한 신뢰/);
});

test("uses_profile defaults to true only when the model didn't say false", () => {
  assert.equal(parseBrief({ ...raw, uses_profile: undefined }, pool)?.usesProfile, true);
  assert.equal(parseBrief(raw, pool)?.usesProfile, false);
});

test("the prompt forbids tone clashes and only uses recency as a tie-breaker", () => {
  const p = briefPrompt({ toolName: "홈페이지", requestText: "- 사이트에 담을 내용: 법률사무소", profileText: "- 브랜드명: 해봇 AI", directions: pool, recentIds: ["editorial"] });
  assert.match(p, /어울리지 않는 방향/);
  assert.match(p, /똑같이 잘 맞을 때만/);
  assert.match(p, /editorial/);
  const schema = briefSchema(pool.map((d) => d.id));
  assert.ok(schema.properties.direction_id.enum.includes(""));
});

test("prompts carry the analysis block and label the profile as conditional", () => {
  const manifest = { id: "blog", inputs: [{ kind: "text", id: "topic", label: "주제" }], usesProfile: ["brand_name"] } as unknown as ToolManifest;
  const brief = parseBrief(raw, [])!;
  const ctx = buildContext(manifest, { topic: "상속 상담", _brief: brief }, { brand_name: "해봇 AI" } as never);
  assert.match(ctx, /요청의 대상과 같은 사업일 때만 참고/);
  assert.match(ctx, /요청 분석/);
});
