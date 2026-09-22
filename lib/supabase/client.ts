import { createBrowserClient } from "@supabase/ssr";

// Public values only — Next.js inlines NEXT_PUBLIC_* at build time, so this
// stays safe in the browser bundle. Server code should use lib/supabase/server.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
