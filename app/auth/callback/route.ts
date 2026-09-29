import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasConsent, safeNext } from "@/lib/consent";

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

      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("user_id", user?.id ?? "")
        .limit(1)
        .maybeSingle();

      const target = brand ? next : "/brand";
      if (!hasConsent(user?.user_metadata)) {
        return NextResponse.redirect(`${origin}/auth/consent?next=${encodeURIComponent(target)}`);
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}
