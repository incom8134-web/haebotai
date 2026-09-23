import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleGenerationCredits } from "@/lib/credits";

// Explicit cancel for an in-flight run. The run route can't rely on the
// client disconnect alone: on Vercel, request.signal doesn't fire when
// the browser aborts the fetch, so the generation kept going and was
// charged in full. Instead the cancel is recorded on the run row: this
// flips pending/streaming → cancelled and refunds, and the run route
// only finishes a row that is still `streaming` — the two conditional
// updates race on one row, so exactly one of "cancelled + refund" or
// "done + charge" wins.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("generations")
    .update({ status: "cancelled", error: "사용자가 취소했습니다" })
    .eq("id", runId)
    .eq("user_id", user.id)
    .in("status", ["pending", "streaming"])
    .select("id");

  // Already done, failed, or not this user's run — nothing to cancel.
  if (!data?.length) return Response.json({ cancelled: false });

  await settleGenerationCredits(runId, 0);
  return Response.json({ cancelled: true });
}
