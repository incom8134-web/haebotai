// Hosts: who may run on the platform's own AI key free, with no plan or
// credits — the team, and anyone staff add in /admin/hosts (product
// decision, 2026-10-29). Everyone else needs Plus or Pro (lib/run-access.ts).
// Host runs still count toward the daily platform budget
// (lib/spend-guard-core.ts).
//
// Two sources, merged:
//   - Vercel env: PLATFORM_KEY_EMAILS (comma-separated) and ADMIN_EMAILS,
//     so admins never lock themselves out. Changed in Vercel + redeploy.
//   - The admin list: site_settings "host_emails" (lib/admin-ops.ts),
//     changed in /admin/hosts and live within 15 s.
// An entry starting with "@" allows a whole domain ("@aihaeba.com").
//
// Pure (tested); lib/platform-access-server.ts reads the admin list.

/** Host entries from the Vercel environment. */
export function envHostList(env: Record<string, string | undefined> = process.env): string[] {
  return [env.PLATFORM_KEY_EMAILS, env.ADMIN_EMAILS]
    .flatMap((v) => (v ?? "").split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** A typed host entry as stored: a lower-cased email or "@domain", or null if it is neither. */
export function normalizeHostEntry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s.length > 254) return null;
  if (/^@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return s;
  if (/^[^\s@,]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return s;
  return null;
}

/** Whether an email matches any host entry. */
export function matchesHost(email: string | null | undefined, entries: string[]): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  const domain = e.slice(e.lastIndexOf("@"));
  return entries.some((entry) => (entry.startsWith("@") ? entry === domain : entry === e));
}

/** Whether this member may run on the platform's key free: env hosts plus `extra` (the admin list). */
export function canUsePlatformKey(email: string | null | undefined, env: Record<string, string | undefined> = process.env, extra: string[] = []): boolean {
  return matchesHost(email, [...envHostList(env), ...extra]);
}
