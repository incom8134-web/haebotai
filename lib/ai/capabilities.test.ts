import assert from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { PROVIDER_CAPS, TOOL_CAPABILITIES } from "./capabilities.ts";

// Parses manifest sources as text (same technique as content.test.ts /
// experience.test.ts) so this runs without the app's module graph
// (lucide, zod path aliases) — plain `node --test` can't resolve those.
const dir = new URL("../tools/registry/", import.meta.url);
const IMAGE_TOOLS = new Set(["image", "brand-model"]);

interface ManifestFacts {
  id: string;
  needsWebSearch: boolean;
  needsImages: boolean;
}

const manifests = new Map<string, ManifestFacts>();
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".ts") || ["index.ts", "shared.ts", "categories.ts"].includes(file)) continue;
  const src = readFileSync(new URL(file, dir), "utf8");
  const id = src.match(/\n {2}id: "([^"]+)"/)?.[1];
  if (!id) continue;
  const needsWebSearch = /webSearch: true/.test(src);
  manifests.set(id, { id, needsWebSearch, needsImages: IMAGE_TOOLS.has(id) });
}

test("every tool has a capability entry and every entry maps to a real tool", () => {
  assert.deepEqual([...manifests.keys()].sort(), Object.keys(TOOL_CAPABILITIES).sort());
});

test("every capability entry defaults to google, includes google, and has no duplicate providers", () => {
  for (const [toolId, cap] of Object.entries(TOOL_CAPABILITIES)) {
    assert.equal(cap.default, "google", `${toolId}: default must be google`);
    assert.ok(cap.providers.includes("google"), `${toolId}: google must always be offered`);
    assert.equal(new Set(cap.providers).size, cap.providers.length, `${toolId}: duplicate provider listed`);
  }
});

test("no tool offers a provider lacking a capability it needs", () => {
  for (const [toolId, cap] of Object.entries(TOOL_CAPABILITIES)) {
    const facts = manifests.get(toolId)!;
    for (const provider of cap.providers) {
      const caps = PROVIDER_CAPS[provider];
      if (facts.needsImages) assert.ok(caps.images, `${toolId}: ${provider} can't generate images`);
      if (facts.needsWebSearch) assert.ok(caps.webSearch, `${toolId}: ${provider} can't web search`);
    }
  }
});
