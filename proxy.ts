import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isCrossSiteWrite } from "@/lib/origin-check";
import { REFERRAL, normalizeReferralCode } from "@/lib/referral";

export async function proxy(request: NextRequest) {
  // CSRF backstop on top of SameSite cookies: a browser POST to our API
  // from another site carries that site's Origin. Server-to-server calls
  // (the Toss webhook, Vercel cron) send no Origin and pass.
  if (isCrossSiteWrite({ method: request.method, path: request.nextUrl.pathname, origin: request.headers.get("origin"), selfOrigin: request.nextUrl.origin, siteUrl: process.env.NEXT_PUBLIC_SITE_URL })) {
    return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
  }
  const response = await updateSession(request);
  // Invite links (/?ref=CODE): remember the code until sign-up finishes.
  const ref = normalizeReferralCode(request.nextUrl.searchParams.get("ref"));
  if (ref) {
    response.cookies.set(REFERRAL.cookie, ref, { maxAge: REFERRAL.cookieMaxAgeDays * 86_400, httpOnly: true, sameSite: "lax", path: "/", secure: request.nextUrl.protocol === "https:" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
