import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/site/plans";

export interface Membership {
  plan: PlanId;
  expiresAt: string | null;
  daysLeft: number | null;
  studentRequest: "pending" | "approved" | "rejected" | null;
}

export async function getMembership(): Promise<Membership> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const empty: Membership = { plan: "free", expiresAt: null, daysLeft: null, studentRequest: null };
  if (!user) return empty;

  const [{ data: row }, { data: request }] = await Promise.all([
    supabase.from("memberships").select("plan, expires_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("student_verifications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const expired = row?.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  const plan = (row && !expired ? row.plan : "free") as PlanId;
  const daysLeft = row?.expires_at && !expired ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86_400_000) : null;
  return { plan, expiresAt: row?.expires_at ?? null, daysLeft, studentRequest: (request?.status as Membership["studentRequest"]) ?? null };
}
