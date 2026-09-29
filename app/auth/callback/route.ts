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

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Data minimisation: Google sends a profile photo URL with every
      // sign-in; the service never shows or needs it, so drop it from the
      // stored profile (it comes back on the next sign-in and is dropped
      // again).
      const meta = user?.user_metadata ?? {};
      if (user && (meta.avatar_url || meta.picture)) {
        await createAdminClient()
          .auth.admin.updateUserById(user.id, { user_metadata: { ...meta, avatar_url: null, picture: null } })
          .catch((err: unknown) => console.warn("avatar scrub failed", err));
      }

      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("user_id", user?.id ?? "")
        .limit(1)
        .maybeSingle();

      const target = brand ? next : "/brand";
      if (!hasCurrentConsent(user?.app_metadata)) {
        return NextResponse.redirect(`${origin}/auth/consent?next=${encodeURIComponent(target)}`);
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}
