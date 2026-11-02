import { Landing } from "@/components/landing/landing";
import { createClient } from "@/lib/supabase/server";
import { listShowcase } from "@/lib/showcase";

export default async function HomePage() {
  // Local JWT check only (no auth-server round trip) — just enough to swap
  // the sign-up buttons for "Go to Studio".
  const [{ data }, showcase] = await Promise.all([(await createClient()).auth.getClaims(), listShowcase().catch(() => [])]);
  return <Landing signedIn={!!data?.claims} showcase={showcase} />;
}
