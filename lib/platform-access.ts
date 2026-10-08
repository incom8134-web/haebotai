// Who may run on the platform's own AI key (product decision, 2026-10):
// only the team, for testing. Everyone else brings their own API key
// (계정 → 내 API 키) and pays the provider directly; no one else spends
// our tokens or receives free credits.
//
// PLATFORM_KEY_EMAILS (comma-separated) lists the team; ADMIN_EMAILS is
// read too, so admins never lock themselves out. An entry starting with
// "@" allows a whole domain ("@aihaeba.com").
//
// Pure (tested).

function teamList(env: Record<string, string | undefined>): string[] {
  return [env.PLATFORM_KEY_EMAILS, env.ADMIN_EMAILS]
    .flatMap((v) => (v ?? "").split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Whether this member may run on the platform's key (free, for testing). */
export function canUsePlatformKey(email: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  const domain = e.slice(e.lastIndexOf("@"));
  return teamList(env).some((entry) => (entry.startsWith("@") ? entry === domain : entry === e));
}
