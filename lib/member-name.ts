// The member's name — asked once on /auth/consent and required from then
// on (the gate in lib/supabase/middleware.ts). It lives in app_metadata,
// not user_metadata: Google and Kakao rewrite user_metadata on every
// sign-in, and only the server (service role) can write app_metadata, so
// what the member typed, or staff corrected in /admin, stays put. It also
// rides in the session JWT, so the gate needs no database call.

export const NAME_MAX = 40;

/** The name typed on a form, cleaned up; null when it can't be used. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Control characters and zero-width marks out, runs of spaces collapsed.
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || [...cleaned].length > NAME_MAX) return null;
  return cleaned;
}

/** The saved name in a user's app_metadata, or null. */
export function profileNameOf(appMetadata: unknown): string | null {
  const v = (appMetadata as { name?: unknown } | null | undefined)?.name;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** True once the member has a saved name. */
export function hasProfileName(appMetadata: unknown): boolean {
  return profileNameOf(appMetadata) !== null;
}

/** A starting value for the name field: the name the sign-in provider sent, if any. */
export function suggestedName(userMetadata: unknown): string {
  const m = (userMetadata ?? {}) as Record<string, unknown>;
  for (const v of [m.full_name, m.name, m.user_name, m.preferred_username]) {
    const n = normalizeName(v);
    if (n) return n;
  }
  return "";
}

/** "+82 10-1234-5678" (Kakao's format) → "010-1234-5678"; anything else as given. */
export function formatKoreanPhone(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  const m = s.match(/^\+82\s*0?(\d{1,2})[-\s]?(\d{3,4})[-\s]?(\d{4})$/);
  if (m) return `0${m[1]}-${m[2]}-${m[3]}`;
  return s.slice(0, 20);
}
