import assert from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";

// Guards the presets in content.json against drifting from the manifests:
// every preset key must be a real field id, and select/multiselect values
// must be real option values. Parses the manifest sources as text so the
// test runs without the app's module graph (lucide, zod aliases).

const content = JSON.parse(readFileSync(new URL("./content.json", import.meta.url), "utf8"));
const dir = new URL("./registry/", import.meta.url);

function manifestFields(src: string) {
  const inputs = src.slice(src.indexOf("inputs: ["), src.indexOf("usesProfile"));
  const fields = new Map<string, { kind: string; options: string[] }>();
  const re = /kind: "(\w+)",\s*id: "([\w_]+)"([\s\S]*?)(?=\n    \{ kind|\n    \{\n|\n  \],)/g;
  for (const m of inputs.matchAll(re)) {
    fields.set(m[2], { kind: m[1], options: [...m[3].matchAll(/value: "([^"]+)"/g)].map((o) => o[1]) });
  }
  return fields;
}

const manifests = new Map<string, Map<string, { kind: string; options: string[] }>>();
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".ts") || ["index.ts", "shared.ts", "categories.ts"].includes(file)) continue;
  const src = readFileSync(new URL(file, dir), "utf8");
  const id = src.match(/\n  id: "([^"]+)"/)?.[1];
  if (id) manifests.set(id, manifestFields(src));
}

test("every tool has content and every content entry has a tool", () => {
  assert.deepEqual([...manifests.keys()].sort(), Object.keys(content).sort());
});

test("preset values match manifest field ids and options", () => {
  for (const [toolId, c] of Object.entries<{ presets: { values: Record<string, unknown> }[] }>(content)) {
    const fields = manifests.get(toolId)!;
    for (const preset of c.presets) {
      for (const [key, value] of Object.entries(preset.values)) {
        const field = fields.get(key);
        assert.ok(field, `${toolId}: unknown field "${key}"`);
        if (field.kind === "select") assert.ok(field.options.includes(value as string), `${toolId}.${key}: bad option ${value}`);
        if (field.kind === "multiselect")
          for (const v of value as string[]) assert.ok(field.options.includes(v), `${toolId}.${key}: bad option ${v}`);
        if (field.kind === "number") assert.equal(typeof value, "number", `${toolId}.${key} must be a number`);
        if (field.kind === "chips" || field.kind === "multiselect") assert.ok(Array.isArray(value), `${toolId}.${key} must be an array`);
      }
    }
  }
});
