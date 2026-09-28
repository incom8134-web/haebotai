import type { z } from "zod";

// Models don't keep JSON keys in schema order (a strategy came back with
// KPIs first), and results render and export in key order. Re-key an
// output in its manifest schema's order — objects and arrays of objects,
// any depth; keys the schema doesn't know stay at the end.

interface Def {
  type?: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
}

const defOf = (schema: z.ZodType): Def | undefined => (schema as unknown as { _zod?: { def?: Def } })._zod?.def;

export function orderLike(schema: z.ZodType, value: unknown): unknown {
  const def = defOf(schema);
  if (!def) return value;
  if (def.type === "object" && def.shape && value && typeof value === "object" && !Array.isArray(value)) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(def.shape)) if (key in src) out[key] = orderLike(def.shape[key], src[key]);
    for (const key of Object.keys(src)) if (!(key in out)) out[key] = src[key];
    return out;
  }
  if (def.type === "array" && def.element && Array.isArray(value)) return value.map((v) => orderLike(def.element!, v));
  if ((def.type === "optional" || def.type === "nullable" || def.type === "default") && def.innerType) return orderLike(def.innerType, value);
  return value;
}
