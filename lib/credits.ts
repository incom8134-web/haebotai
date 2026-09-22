"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// HAEBOT_A_TOOLS_SPEC.md §3.4 — visible, honest credits. Reserve before
// the model call, settle against actual usage after.
//
// Reservation, release, and settlement all run through SECURITY DEFINER
// RPCs callable only by the service role (supabase/migrations/0011) —
// authenticated users can no longer write user_credits directly, by
// table grant or by calling these functions themselves. Settlement is
// tied to a real run row's server-recorded credits_reserved and is
// idempotent; nothing here accepts a bare, run-unlinked refund amount
// except release_credit_reservation, which exists only for the one case
// a reservation's run row never got created (see the migration).

export async function getBalance(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("user_credits").select("balance").eq("user_id", user.id).maybeSingle();
  return data?.balance ?? 100;
}

export async function reserveCredits(userId: string, amount: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_credits", { p_user_id: userId, p_amount: amount });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, balance: data as number };
}

/** Only for a reservation whose run row never got created — everywhere else, settleGenerationCredits is the only refund path. */
export async function releaseUnattachedReservation(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const admin = createAdminClient();
  await admin.rpc("release_credit_reservation", { p_user_id: userId, p_amount: amount });
}

/** Idempotent: refunds reserved - used against the run's own server-recorded reservation and marks it settled, so a repeat call (e.g. a retried fail path) is a no-op. */
export async function settleGenerationCredits(runId: string, creditsUsed: number): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("settle_generation_credits", { p_run_id: runId, p_credits_used: creditsUsed });
  if (error) return null;
  return data as number;
}
