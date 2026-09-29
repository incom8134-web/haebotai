import { Landing } from "@/components/landing/landing";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Local JWT check only (no auth-server round trip) — just enough to swap
  // the sign-up buttons for "Go to Studio".
  const { data } = await (await createClient()).auth.getClaims();
  return <Landing signedIn={!!data?.claims} />;
}
