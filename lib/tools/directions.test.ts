import { test } from "node:test";
import assert from "node:assert/strict";
import { DIRECTIONS, directionPrompt, pickDirection } from "./directions.ts";

test("every pool has several directions with unique ids", () => {
  for (const [tool, pool] of Object.entries(DIRECTIONS)) {
    assert.ok(pool.length >= 4, `${tool} needs variety`);
    assert.equal(new Set(pool.map((d) => d.id)).size, pool.length, `${tool}: duplicate id`);
  }
});

test("never repeats a direction from the user's recent runs while others remain", () => {
  const pool = DIRECTIONS.homepage;
  const recent = pool.slice(0, 4).map((d) => d.id);
  for (let i = 0; i < 200; i++) {
    const d = pickDirection("homepage", recent, () => i / 200);
    assert.ok(d && !recent.includes(d.id));
  }
});

test("a small pool still rotates instead of locking up", () => {
  const pool = DIRECTIONS["brand-model"];
  const d = pickDirection("brand-model", pool.map((x) => x.id));
  assert.ok(d && !pool.slice(0, pool.length - 1).map((x) => x.id).includes(d.id));
});

test("tools without a pool get no direction", () => {
  assert.equal(pickDirection("prompt", []), null);
});

test("the prompt names the direction and puts user rules first", () => {
  const block = directionPrompt(DIRECTIONS.presentation[0]);
  assert.match(block, /이번 결과의 창작 방향: SCQA 구조/);
  assert.match(block, /충돌하면 그쪽을 우선/);
});
