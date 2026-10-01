// Images a run saved to the `exports` bucket are referenced from its
// output as { asset_id: "<user id>/…", url: "<signed url>" }. These walk
// an output to find them (to delete with the run) and to swap in fresh
// signed URLs when a stored one may have expired.

type Json = unknown;

function walk(node: Json, visit: (o: Record<string, unknown>) => void, depth = 0) {
  if (depth > 12 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) walk(x, visit, depth + 1);
    return;
  }
  const o = node as Record<string, unknown>;
  visit(o);
  for (const v of Object.values(o)) walk(v, visit, depth + 1);
}

const owned = (p: unknown, userId: string): p is string => typeof p === "string" && p.startsWith(`${userId}/`) && !p.includes("..");

/** Every exports path in the output that belongs to the member. */
export function assetPaths(output: Json, userId: string): string[] {
  const out = new Set<string>();
  walk(output, (o) => {
    if (owned(o.asset_id, userId)) out.add(o.asset_id);
  });
  return [...out];
}

/** A copy of the output with each owned asset's url replaced from `signed` (path → url). */
export function withSignedUrls<T>(output: T, userId: string, signed: Map<string, string>): T {
  if (!signed.size) return output;
  const copy = structuredClone(output);
  walk(copy, (o) => {
    if (owned(o.asset_id, userId) && typeof o.url === "string") {
      const url = signed.get(o.asset_id);
      if (url) o.url = url;
    }
  });
  return copy;
}
