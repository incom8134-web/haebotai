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
    // A required text field must say something — "" or spaces don't count.
    if (required && s instanceof z.ZodString) s = s.refine((v) => v.trim().length > 0, { message: "empty" });
    shape[f.id] = required ? s : s.optional();
  }
  return z.object(shape);
}

/** A member-facing message for failed input validation, naming the fields by their labels. */
export function inputErrorMessage(fields: ToolField[], issues: readonly { path: readonly PropertyKey[]; code: string; message: string }[]): string {
  const parts = issues.slice(0, 3).map((i) => {
    const field = fields.find((f) => f.id === i.path[0]);
    const label = field?.label ?? String(i.path[0] ?? "입력");
    if (i.code === "invalid_type" || i.message === "empty") return `'${label}' 칸을 채워 주세요`;
    if (i.code === "too_big") return `'${label}' 값이 너무 커요`;
    if (i.code === "too_small") return `'${label}' 값이 너무 작아요`;
    return `'${label}' 값을 확인해 주세요`;
  });
  return parts.join(" · ");
}
