// What a public share page (/share/<token>) may show of a run's input:
// the plain answers result views read (brand name, product…), never
// uploads, stored file paths, reference material or internal keys.

const PRIVATE_KEYS = new Set(["reference", "product_photos", "photos", "images", "files", "attachments", "logo", "audio", "document"]);

function isFileish(v: unknown): boolean {
  if (typeof v === "string") return v.startsWith("data:") || /^[0-9a-f-]{36}\//i.test(v) || v.length > 4000;
  if (Array.isArray(v)) return v.some(isFileish);
  if (v && typeof v === "object") return "path" in v || "asset_id" in v || "dataUrl" in v;
  return false;
}

export function publicInput(input: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (k.startsWith("_") || PRIVATE_KEYS.has(k) || isFileish(v)) continue;
    out[k] = v;
  }
  return out;
}

export const SHARE_TOKEN = /^[A-Za-z0-9_-]{22,64}$/;
