const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** A state-changing /api request whose browser Origin isn't this site. Missing Origin (server-to-server) passes. */
export function isCrossSiteWrite(req: { method: string; path: string; origin: string | null; selfOrigin: string; siteUrl?: string }): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase()) || !req.path.startsWith("/api/")) return false;
  if (!req.origin || req.path === "/api/csp-report") return false;
  const allowed = new Set([req.selfOrigin]);
  if (req.siteUrl) {
    try {
      allowed.add(new URL(req.siteUrl).origin);
    } catch {
      /* ignore a malformed NEXT_PUBLIC_SITE_URL */
    }
  }
  return !allowed.has(req.origin);
}
