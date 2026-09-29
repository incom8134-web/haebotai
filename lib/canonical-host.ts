// One host for the whole app in production. Sign-in keeps a PKCE verifier
// and the session in cookies scoped to the host that started it, so
// starting on www.… or the *.vercel.app address and coming back to the
// main domain loses them — the first sign-in "fails" and the second works.
// Page requests on any other host are sent to NEXT_PUBLIC_SITE_URL's host.
// /api is left alone (webhooks and cron may call the platform address).

export function canonicalRedirect(req: { method: string; host: string | null; path: string; search: string; isProduction: boolean; siteUrl?: string }): string | null {
  if (!req.isProduction || !req.siteUrl || !req.host) return null;
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  if (req.path.startsWith("/api/")) return null;
  let site: URL;
  try {
    site = new URL(req.siteUrl);
  } catch {
    return null;
  }
  if (site.hostname === "localhost" || req.host.toLowerCase() === site.host.toLowerCase()) return null;
  return `${site.origin}${req.path}${req.search}`;
}
