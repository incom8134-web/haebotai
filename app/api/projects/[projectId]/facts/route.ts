import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FACT_KEYS } from "@/lib/projects/facts";

// The project's memory: read for pre-filling a tool, edited by the member.
// RLS (project_facts_own) limits both to the member's own projects.

async function owned(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, status: 401 };
  const { data } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  return data ? { supabase, ok: true as const } : { supabase, ok: false as const, status: 404 };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const o = await owned(projectId);
  if (!o.ok) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: o.status });
  const { data } = await o.supabase.from("project_facts").select("key, value").eq("project_id", projectId);
  return Response.json({ facts: Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const o = await owned(projectId);
  if (!o.ok) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: o.status });
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; value?: unknown };
  const key = typeof body.key === "string" ? body.key : "";
  if (!(FACT_KEYS as readonly string[]).includes(key)) return Response.json({ error: "알 수 없는 항목입니다" }, { status: 400 });
  const value = typeof body.value === "string" ? body.value.trim().slice(0, 2000) : "";
  if (!value) {
    await o.supabase.from("project_facts").delete().eq("project_id", projectId).eq("key", key);
    return Response.json({ ok: true });
  }
  const { error } = await o.supabase
    .from("project_facts")
    .upsert({ project_id: projectId, key, value, source_tool: null, source_run_id: null, updated_at: new Date().toISOString() }, { onConflict: "project_id,key" });
  if (error) return Response.json({ error: "저장하지 못했습니다" }, { status: 500 });
  return Response.json({ ok: true });
}
