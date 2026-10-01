import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Projects are the member's own rows (RLS: projects_*_own in 0016).

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; description?: unknown };
  const name = clean(body.name, 80);
  if (!name) return Response.json({ error: "프로젝트 이름을 입력해 주세요" }, { status: 400 });
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 50) return Response.json({ error: "프로젝트는 50개까지 만들 수 있어요" }, { status: 400 });
  const { data, error } = await supabase.from("projects").insert({ user_id: user.id, name, description: clean(body.description, 500) }).select("id").single();
  if (error || !data) return Response.json({ error: "프로젝트를 만들지 못했습니다" }, { status: 500 });
  return Response.json({ id: data.id });
}
