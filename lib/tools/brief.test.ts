import assert from "node:assert";
import { test } from "node:test";
import { briefField, seedFromBrief } from "./brief.ts";
import type { ToolField } from "./types.ts";

test("prefers the first required text field", () => {
  const inputs: ToolField[] = [
    { kind: "text", id: "audience", label: "a" },
    { kind: "textarea", id: "topic", label: "b", required: true },
  ];
  assert.equal(briefField({ inputs })?.id, "topic");
});

test("falls back to any text field, and null for structured-only tools", () => {
  assert.equal(briefField({ inputs: [{ kind: "url", id: "u", label: "u" }, { kind: "text", id: "t", label: "t" }] })?.id, "t");
  assert.equal(briefField({ inputs: [{ kind: "select", id: "s", label: "s", options: [] }] }), null);
});

test("seedFromBrief trims and respects max", () => {
  const inputs: ToolField[] = [{ kind: "text", id: "name", label: "n", required: true, max: 5 }];
  assert.deepEqual(seedFromBrief({ inputs }, "  abcdefgh "), { name: "abcde" });
  assert.deepEqual(seedFromBrief({ inputs }, "   "), {});
  assert.deepEqual(seedFromBrief({ inputs }, undefined), {});
});
