import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { PLAYBOOKS } from "./playbooks.ts";
import { buildImageSystemInstruction, buildSystemInstruction } from "./generate-prompt.ts";
import type { ToolManifest } from "./types.ts";

// Registry files are tool ids (lib/tools/registry/<id>.ts); grant is a
// static placeholder that never reaches a model.
const toolIds = readdirSync(new URL("./registry/", import.meta.url))
  .filter((f) => f.endsWith(".ts") && !["index.ts", "shared.ts", "categories.ts"].includes(f))
  .map((f) => f.replace(/\.ts$/, ""));

test("every generating tool has an expert playbook", () => {
  for (const id of toolIds.filter((id) => id !== "grant")) {
    const p = PLAYBOOKS[id];
    assert.ok(p, `missing playbook: ${id}`);
    assert.ok(p.role && p.method.length > 0 && p.bar.length > 0, `incomplete playbook: ${id}`);
  }
});

const manifest = (id: string) =>
  ({ id, name_ko: "해봇 브랜드 전략", summary: "요약", grounding: { requireSources: false, webSearch: false, estimateBadge: false } }) as unknown as ToolManifest;

test("text prompts carry the role, house rules, method and bar", () => {
  const s = buildSystemInstruction(manifest("strategy"));
  assert.match(s, /당신은 대기업 브랜드 컨설팅 출신/);
  assert.match(s, /\[작업 원칙\]/);
  assert.match(s, /\[작업 방식\]\n1\. /);
  assert.match(s, /\[완성 기준\]/);
  assert.match(s, /반드시 한국어로/);
});

test("image prompts skip the text-only house rules", () => {
  const s = buildImageSystemInstruction(manifest("image"));
  assert.match(s, /커머셜 포토그래퍼/);
  assert.doesNotMatch(s, /\[작업 원칙\]/);
});
