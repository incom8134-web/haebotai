import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { orderLike } from "./output-order.ts";

test("re-keys objects and arrays of objects in schema order, unknown keys last", () => {
  const schema = z.object({
    summary: z.string(),
    segments: z.array(z.object({ name: z.string(), need: z.string() })),
    kpis: z.array(z.object({ metric: z.string() })).optional(),
  });
  const out = orderLike(schema, { kpis: [{ metric: "m" }], extra: 1, segments: [{ need: "n", name: "a" }], summary: "s" }) as Record<string, unknown>;
  assert.deepEqual(Object.keys(out), ["summary", "segments", "kpis", "extra"]);
  assert.deepEqual(Object.keys((out.segments as object[])[0]), ["name", "need"]);
});
