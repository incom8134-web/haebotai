import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client — bypasses RLS entirely. Reserved for the specific
// server-side writes authenticated/anon no longer have direct access to
// (the credits ledger, generations rows, api-key ciphertext — see
// supabase/migrations/0011_lock_down_credits_and_keys.sql for exactly
// what that migration revoked). Every caller here MUST enforce ownership
// itself (e.g. `.eq("user_id", user.id)`, derived from a real
// `supabase.auth.getUser()` call, never from client input) since RLS no
// longer does that job for these tables.
//
// "server-only" throws a build error if this is ever imported from a
// Client Component — do not remove that import. Cheap to construct (no
// I/O until a call is made), so no need to cache a singleton — same
// per-call pattern as the Gemini/Anthropic clients elsewhere in lib/ai/.
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
