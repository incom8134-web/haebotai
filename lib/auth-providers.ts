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
