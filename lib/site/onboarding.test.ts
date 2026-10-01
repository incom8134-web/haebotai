import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TOOLS,
  ONBOARDING_GOALS,
  recommendTools,
} from "./onboarding.ts";
import { catalogTool } from "../tools/catalog.ts";

test("every onboarding and default tool is a live public tool", () => {
  for (const slug of [
    ...ONBOARDING_GOALS.flatMap((g) => g.tools),
    ...DEFAULT_TOOLS,
  ]) {
    const t = catalogTool(slug);
    assert.ok(t && t.engine && !t.hidden, slug);
  }
});

test("recommendations follow the last result, then the goal, skipping used tools", () => {
  const next = catalogTool("brand-dna")!.next;
  assert.deepEqual(
    recommendTools({ lastTool: "brand-dna", usedTools: ["brand-dna"] }),
    next.slice(0, 3),
  );
  assert.deepEqual(recommendTools({ goal: "sell" }), [
    "offer-architect",
    "sales-page",
    "ad-factory",
  ]);
  assert.deepEqual(
    recommendTools({ goal: "sell", usedTools: ["offer-architect"], limit: 2 }),
    ["sales-page", "ad-factory"],
  );
  assert.deepEqual(recommendTools({}), DEFAULT_TOOLS.slice(0, 3));
});

test("used tools come back only when nothing new is left", () => {
  const all = recommendTools({ usedTools: DEFAULT_TOOLS, limit: 4 });
  assert.deepEqual(all, DEFAULT_TOOLS);
});
