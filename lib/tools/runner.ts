import { z } from "zod";
import type { ToolField } from "./types";

// HAEBOT_A_TOOLS_SPEC.md §3.2 — shared input validation, one code path
// for every tool. The actual run (reserve → persist → stream → settle)
// lives in app/api/tools/[toolId]/run/route.ts (T2), since a Server
// Action can't stream a response the way a Route Handler can.

export function buildInputSchema(fields: ToolField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    if (f.kind === "number") {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      s = n;
    } else if (f.kind === "multiselect" || f.kind === "chips" || f.kind === "image") {
      // "image" values arrive as base64 data URLs — tool-runner.tsx
      // converts uploaded Files before the request ever leaves the browser.
      s = z.array(z.string());
    } else {
      s = z.string();
    }
    const required = "required" in f && f.required;
    shape[f.id] = required ? s : s.optional();
  }
  return z.object(shape);
}
