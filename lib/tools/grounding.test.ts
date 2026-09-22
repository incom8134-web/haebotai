import assert from "node:assert";
import { checkGrounding } from "./grounding.ts";
import type { ToolManifest } from "./types.ts";

// Adversarial check for HAEBOT_A_TOOLS_SPEC.md Part 6 T3: "A tool with
// requireSources cannot emit an unsourced statistic." Run with:
//   node lib/tools/grounding.test.ts
// Fixture manifests instead of real registry entries — checkGrounding
// only reads `.grounding.requireSources`, so this stays hermetic.

const ungrounded = { grounding: { requireSources: false, webSearch: false, estimateBadge: false } } as ToolManifest;
const grounded = { grounding: { requireSources: true, webSearch: true, estimateBadge: true } } as ToolManifest;

// A tool that doesn't require sources always passes, sources or not.
assert.equal(checkGrounding(ungrounded, []).ok, true);

// requireSources: true — the adversarial case, an empty source list must
// be rejected, not silently accepted.
assert.equal(checkGrounding(grounded, []).ok, false);

// A source with an empty url or title doesn't count as grounded.
assert.equal(checkGrounding(grounded, [{ url: "", title: "x" }]).ok, false);
assert.equal(checkGrounding(grounded, [{ url: "https://x.com", title: "" }]).ok, false);

// A real-looking source is accepted.
assert.equal(checkGrounding(grounded, [{ url: "https://x.com", title: "Report" }]).ok, true);

console.log("grounding guard: all checks passed");
