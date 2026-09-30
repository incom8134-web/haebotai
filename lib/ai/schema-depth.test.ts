import { test } from "node:test";
import assert from "node:assert/strict";
import { zodToJsonSchema } from "./schema.ts";
import ideaRadar from "../tools/schemas/idea-radar.ts";
import revenueMapper from "../tools/schemas/revenue-mapper.ts";
import offerArchitect from "../tools/schemas/offer-architect.ts";
import marketGap from "../tools/schemas/market-gap.ts";
import mvpBlueprint from "../tools/schemas/mvp-blueprint.ts";
import brandDna from "../tools/schemas/brand-dna.ts";
import hookLab from "../tools/schemas/hook-lab.ts";
import contentTransformer from "../tools/schemas/content-transformer.ts";

// Gemini's structured output answers 400 "invalid argument" to schemas it
// finds too complex. Found live on hook-lab: arrays nested three deep, and
// a list of rich objects allowed up to 20 items, were both rejected; two
// levels and maxItems ≤ 16 were accepted. The new tools' schemas stay
// inside those limits.
function maxItems(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as Record<string, unknown>;
  let most = typeof n.maxItems === "number" ? n.maxItems : 0;
  for (const v of Object.values(n)) {
    if (Array.isArray(v)) for (const x of v) most = Math.max(most, maxItems(x));
    else most = Math.max(most, maxItems(v));
  }
  return most;
}

function arrayDepth(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as Record<string, unknown>;
  const here = n.type === "array" ? 1 : 0;
  let deepest = 0;
  for (const v of Object.values(n)) {
    if (Array.isArray(v)) for (const x of v) deepest = Math.max(deepest, arrayDepth(x));
    else deepest = Math.max(deepest, arrayDepth(v));
  }
  return here + deepest;
}

const NEW_TOOLS = { "idea-radar": ideaRadar, "revenue-mapper": revenueMapper, "offer-architect": offerArchitect, "market-gap": marketGap, "mvp-blueprint": mvpBlueprint, "brand-dna": brandDna, "hook-lab": hookLab, "content-transformer": contentTransformer };

test("new tool schemas stay inside what Gemini accepts", () => {
  for (const [id, schema] of Object.entries(NEW_TOOLS)) {
    const json = zodToJsonSchema(schema);
    assert.ok(arrayDepth(json) <= 2, `${id}: arrays nested ${arrayDepth(json)} deep`);
    assert.ok(maxItems(json) <= 16, `${id}: a list allows ${maxItems(json)} items`);
  }
});
