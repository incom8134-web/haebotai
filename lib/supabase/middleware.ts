import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Public inside the shell: /tools and /tools/<id> (overviews) and /help.
// Running a tool, the Studio, library, profile and account need a session.
const PROTECTED_PREFIXES = ["/studio", "/compose", "/library", "/brand", "/account"];
const PROTECTED_PATTERNS = [/^\/tools\/[^/]+\/run(\/|$)/];

export async function updateSession(request: NextRequest) {
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

  return response;
}
