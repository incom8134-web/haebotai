import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCurrentConsent, safeNext } from "@/lib/consent";
import { formatKoreanPhone, hasProfileName } from "@/lib/member-name";
import { KAKAO_PHONE } from "@/lib/auth-providers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site relative paths; anything else falls back to the Studio.
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
    // A code that's already been used (refreshing this URL, Back, a second
    // tab) fails to exchange even though the first exchange signed them
    // in — go on with the existing session instead of "sign-in failed".
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (error && !user) console.warn("[auth] code exchange failed", error.message);

    if (user) {
      // Data minimisation: Google sends a profile photo URL with every
      // sign-in; the service never shows or needs it, so drop it from the
      // stored profile (it comes back on the next sign-in and is dropped
      // again).
      const meta = user.user_metadata ?? {};
      const scrub =
        meta.avatar_url || meta.picture
          ? createAdminClient()
              .auth.admin.updateUserById(user.id, { user_metadata: { ...meta, avatar_url: null, picture: null } })
              .catch((err: unknown) => console.warn("avatar scrub failed", err))
          : Promise.resolve();
      await scrub;

      // Kakao phone number, when switched on (lib/auth-providers.ts): read
      // once from Kakao with this sign-in's token and kept in app_metadata
      // for /admin. Only when this sign-in was the Kakao one (the identity
      // signed in most recently), so a Google token never goes to Kakao.
      // Best-effort — a failure never blocks the sign-in.
      const providerToken = exchanged?.session?.provider_token;
      if (KAKAO_PHONE && providerToken && latestIdentity(user.identities) === "kakao") {
        await saveKakaoPhone(user.id, user.app_metadata, providerToken).catch((err: unknown) => console.warn("kakao phone read failed", err));
      }

      // New members land on /studio, which sends anyone with no projects
      // and no runs through onboarding (a project, then a first tool).
      const target = next;
      if (!hasCurrentConsent(user.app_metadata) || !hasProfileName(user.app_metadata)) {
        return NextResponse.redirect(`${origin}/auth/consent?next=${encodeURIComponent(target)}`);
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}

/** The provider of the identity that signed in most recently. */
function latestIdentity(identities: { provider: string; last_sign_in_at?: string }[] | undefined): string | null {
  const sorted = [...(identities ?? [])].sort((a, b) => (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? ""));
  return sorted[0]?.provider ?? null;
}

/** Reads the phone number Kakao released for this sign-in and stores it (app_metadata.phone). */
async function saveKakaoPhone(userId: string, appMetadata: Record<string, unknown> | undefined, token: string) {
  const res = await fetch("https://kapi.kakao.com/v2/user/me?property_keys=%5B%22kakao_account.phone_number%22%5D", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return;
  const body = (await res.json().catch(() => null)) as { kakao_account?: { phone_number?: string } } | null;
  const phone = formatKoreanPhone(body?.kakao_account?.phone_number);
  if (!phone || appMetadata?.phone === phone) return;
  await createAdminClient().auth.admin.updateUserById(userId, { app_metadata: { ...(appMetadata ?? {}), phone } });
}
