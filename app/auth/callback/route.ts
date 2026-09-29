import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site relative paths; anything else falls back to the Studio.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/studio";

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

      return NextResponse.redirect(`${origin}${brand ? next : "/brand"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}
