import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { hasCurrentConsent } from "@/lib/consent";
import { apiIpLimiter, checkRateLimit } from "@/lib/rate-limit";

// Public inside the shell: /tools and /tools/<id> (overviews) and /help.
// Running a tool, the Studio, library, profile and account need a session.
const PROTECTED_PREFIXES = ["/studio", "/compose", "/library", "/brand", "/account", "/auth/consent"];
const PROTECTED_PATTERNS = [/^\/tools\/[^/]+\/run(\/|$)/];

export async function updateSession(request: NextRequest) {
  // Flood guard for the API: one address can't hammer functions and the
  // database (Vercel's platform DDoS protection covers the network layer).
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const r = await checkRateLimit(apiIpLimiter, ip);
    if (!r.ok) return NextResponse.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(r.retryAfterSeconds ?? 60) } });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the JWT locally against the project's published
  // keys — no round-trip to the Auth server on every request.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  const path = request.nextUrl.pathname;
  const isProtected =
    PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ||
    PROTECTED_PATTERNS.some((re) => re.test(path));

  if (isProtected && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Signed in but hasn't given the required consents (or they changed):
  // everything behind a login waits on /auth/consent (lib/consent.ts).
  // The token can be up to an hour older than a consent just given, so a
  // "no" from the token is double-checked with the auth server.
  if (
    isProtected &&
    isAuthed &&
    path !== "/auth/consent" &&
    !hasCurrentConsent(data.claims.app_metadata) &&
    !hasCurrentConsent((await supabase.auth.getUser()).data.user?.app_metadata)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/consent";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}
