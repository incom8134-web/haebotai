import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Library actions on one run. generations is update-revoked for members
// (0011), so title / project changes go through the service role with the
// ownership check done here; delete uses the member's own delete policy.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; projectId?: unknown };
  const patch: Record<string, string | null> = {};
  if (body.title !== undefined) patch.title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : null;
  if (body.projectId !== undefined) {
    if (body.projectId === null || body.projectId === "") patch.project_id = null;
    else if (typeof body.projectId === "string") {
      const { data } = await supabase.from("projects").select("id").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
      if (!data) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
      patch.project_id = data.id;
    }
  }
  if (!Object.keys(patch).length) return Response.json({ error: "바꿀 내용이 없습니다" }, { status: 400 });
  const { data } = await createAdminClient().from("generations").update(patch).eq("id", runId).eq("user_id", user.id).select("id");
  if (!data?.length) return Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { data: run } = await supabase.from("generations").select("status").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (!run) return Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  // A run still working holds reserved credits; cancel it first.
  if (run.status === "pending" || run.status === "streaming") return Response.json({ error: "진행 중인 작업은 먼저 취소해 주세요" }, { status: 409 });
  const { error } = await supabase.from("generations").delete().eq("id", runId).eq("user_id", user.id);
  if (error) return Response.json({ error: "삭제하지 못했습니다" }, { status: 500 });
  return Response.json({ ok: true });
}
