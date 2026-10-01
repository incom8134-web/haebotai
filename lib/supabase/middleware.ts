import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { hasCurrentConsent, safeNext } from "@/lib/consent";
import { apiIpLimiter, checkRateLimit } from "@/lib/rate-limit";

// Public inside the shell: /tools and /tools/<id> (overviews) and /help.
// Running a tool, the Studio, library, profile and account need a session.
const PROTECTED_PREFIXES = ["/studio", "/onboarding", "/projects", "/library", "/brand", "/account", "/auth/consent"];
const PROTECTED_PATTERNS = [/^\/tools\/[^/]+\/run(\/|$)/];

// A redirect must carry any session cookies getClaims() just refreshed:
// Supabase rotates refresh tokens, so dropping the new pair here logs the
// member out on the next request and they have to sign in again.
function redirectKeepingSession(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

/** Where a signed-in member goes instead of /auth or a finished consent page (never back into /auth — that would loop). */
function afterAuth(next: string | null): string {
  const target = safeNext(next);
  return target === "/auth" || target.startsWith("/auth/") || target.startsWith("/auth?") ? "/studio" : target;
}

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
    return redirectKeepingSession(url, response);
  }

  // Already signed in: the sign-in page would only make them sign in
  // again. Confirmed with the auth server first so a revoked session
  // (valid-looking token) can still reach the sign-in page.
  if (path === "/auth" && isAuthed && (await supabase.auth.getUser()).data.user) {
    return redirectKeepingSession(new URL(afterAuth(request.nextUrl.searchParams.get("next")), request.url), response);
  }

  // Consent already given (Back button, a bookmark): don't ask again.
  if (path === "/auth/consent" && isAuthed && hasCurrentConsent(data.claims.app_metadata)) {
    return redirectKeepingSession(new URL(afterAuth(request.nextUrl.searchParams.get("next")), request.url), response);
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
    return redirectKeepingSession(url, response);
  }

  return response;
}
