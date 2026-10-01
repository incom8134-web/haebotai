import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; description?: unknown };
  const patch: Record<string, string> = {};
  const name = clean(body.name, 80);
  const description = clean(body.description, 500);
  if (name !== undefined) {
    if (!name) return Response.json({ error: "프로젝트 이름을 입력해 주세요" }, { status: 400 });
    patch.name = name;
  }
  if (description !== undefined) patch.description = description;
  const { data } = await supabase.from("projects").update(patch).eq("id", projectId).eq("user_id", user.id).select("id");
  if (!data?.length) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  return Response.json({ ok: true });
}

// Deleting a project keeps its runs (generations.project_id → null) and
// drops its facts (cascade).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { data } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id).select("id");
  if (!data?.length) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  return Response.json({ ok: true });
}
