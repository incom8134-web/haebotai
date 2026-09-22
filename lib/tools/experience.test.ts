import assert from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";

// Every tool has an experience; its sections cover each manifest input
// exactly once; ui keys and option keys exist in the manifest.

const exp = {
  ...JSON.parse(readFileSync(new URL("./experience-a.json", import.meta.url), "utf8")),
  ...JSON.parse(readFileSync(new URL("./experience-b.json", import.meta.url), "utf8")),
};
const dir = new URL("./registry/", import.meta.url);
const manifests = new Map<string, Map<string, string[]>>();
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".ts") || ["index.ts", "shared.ts", "categories.ts"].includes(file)) continue;
  const src = readFileSync(new URL(file, dir), "utf8");
  const id = src.match(/\n  id: "([^"]+)"/)?.[1];
  if (!id) continue;
  const inputs = src.slice(src.indexOf("inputs: ["), src.indexOf("usesProfile"));
  const fields = new Map<string, string[]>();
  for (const m of inputs.matchAll(/kind: "(\w+)",\s*id: "([\w_]+)"([\s\S]*?)(?=\n    \{ kind|\n    \{\n|\n  \],)/g)) {
    fields.set(m[2], [...m[3].matchAll(/value: "([^"]+)"/g)].map((o) => o[1]));
  }
  manifests.set(id, fields);
}

test("every tool has an experience", () => {
  assert.deepEqual([...manifests.keys()].sort(), Object.keys(exp).sort());
});

test("sections cover every input exactly once", () => {
  for (const [id, fields] of manifests) {
    const listed = exp[id].sections.flatMap((s: { fields: string[] }) => s.fields);
    assert.deepEqual([...listed].sort(), [...fields.keys()].sort(), `${id}: sections vs inputs`);
    assert.equal(new Set(listed).size, listed.length, `${id}: duplicate field in sections`);
  }
});

test("ui keys and option keys exist", () => {
  for (const [id, fields] of manifests) {
    for (const [fid, ui] of Object.entries<{ options?: Record<string, unknown> }>(exp[id].ui)) {
      assert.ok(fields.has(fid), `${id}: ui for unknown field ${fid}`);
      for (const v of Object.keys(ui.options ?? {})) assert.ok(fields.get(fid)!.includes(v), `${id}.${fid}: unknown option ${v}`);
    }
  }
});
