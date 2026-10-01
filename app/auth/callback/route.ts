import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCurrentConsent, safeNext } from "@/lib/consent";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site relative paths; anything else falls back to the Studio.
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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

      // New members land on /studio, which sends anyone with no projects
      // and no runs through onboarding (a project, then a first tool).
      const target = next;
      if (!hasCurrentConsent(user.app_metadata)) {
        return NextResponse.redirect(`${origin}/auth/consent?next=${encodeURIComponent(target)}`);
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}
