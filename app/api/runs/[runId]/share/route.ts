import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitSensitive } from "@/lib/rate-limit";

// A read-only public link to one finished result (/share/<token>). One
// live link per result; turning it off revokes the token for good (a new
// link gets a new token). run_shares is written only here, through the
// service role, after the ownership check (0017).

async function owner(runId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: "로그인이 필요합니다" }, { status: 401 }) };
  const { data: run } = await supabase.from("generations").select("id, status").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (!run) return { error: Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 }) };
  return { user, run };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const o = await owner(runId);
  if (o.error) return o.error;
  if (o.run.status !== "done") return Response.json({ error: "완성된 결과만 공유할 수 있어요" }, { status: 409 });
  const limited = await limitSensitive("share", o.user.id);
  if (limited) return limited;

  const admin = createAdminClient();
  const { data: live } = await admin.from("run_shares").select("token").eq("run_id", runId).is("revoked_at", null).maybeSingle();
  if (live) return Response.json({ token: live.token });
  const token = randomBytes(18).toString("base64url");
  const { error } = await admin.from("run_shares").insert({ token, run_id: runId, user_id: o.user.id });
  if (error) {
    // Two clicks at once: the other request made the link.
    const { data: again } = await admin.from("run_shares").select("token").eq("run_id", runId).is("revoked_at", null).maybeSingle();
    if (again) return Response.json({ token: again.token });
    console.error("[share] create failed", error.message);
    return Response.json({ error: "공유 링크를 만들지 못했어요" }, { status: 500 });
  }
  return Response.json({ token });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const o = await owner(runId);
  if (o.error) return o.error;
  const { error } = await createAdminClient().from("run_shares").update({ revoked_at: new Date().toISOString() }).eq("run_id", runId).eq("user_id", o.user.id).is("revoked_at", null);
  if (error) return Response.json({ error: "공유를 끄지 못했어요" }, { status: 500 });
  return Response.json({ ok: true });
}
