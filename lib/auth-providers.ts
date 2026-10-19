// Which sign-in buttons /auth shows. Google is always on; Kakao appears
// only once it's enabled in Supabase (Auth → Providers → Kakao) and listed
// here, e.g. NEXT_PUBLIC_AUTH_PROVIDERS="google,kakao". Inlined at build
// time, so changing it needs a redeploy.
export type AuthProvider = "google" | "kakao";

export function parseAuthProviders(raw: string | undefined): AuthProvider[] {
  const listed = (raw ?? "").split(",").map((p) => p.trim().toLowerCase());
  const out: AuthProvider[] = ["google"];
  if (listed.includes("kakao")) out.push("kakao");
  return out;
}

export const AUTH_PROVIDERS = parseAuthProviders(process.env.NEXT_PUBLIC_AUTH_PROVIDERS);

// Kakao phone number (카카오 로그인 → 휴대전화번호). Kakao only releases it
// to a business-verified app with the "phone_number" consent item turned
// on (Kakao Developers → 카카오 로그인 → 동의항목), so it's off until
// NEXT_PUBLIC_KAKAO_PHONE="1". When on, the sign-in asks for the scope and
// the callback reads the number once from Kakao's API (app/auth/callback).
// Turning it on adds an item to collect: update the privacy policy
// (lib/site/legal.ts) and bump CONSENT_VERSION (lib/consent.ts) with it.
export const KAKAO_PHONE = process.env.NEXT_PUBLIC_KAKAO_PHONE === "1";

/** Extra OAuth scopes for a provider's sign-in, if any. */
export function oauthScopes(provider: AuthProvider, kakaoPhone = KAKAO_PHONE): string | undefined {
  return provider === "kakao" && kakaoPhone ? "phone_number" : undefined;
}
