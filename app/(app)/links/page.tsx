import { QuickLinks } from "@/components/links/quick-links";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "바로가기 — 해봇 AI" };

export default async function LinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase.from("generations").select("id, tool_id, created_at").eq("user_id", user.id).eq("status", "done").not("tool_id", "is", null).order("created_at", { ascending: false }).limit(6)
    : { data: [] };
  return <QuickLinks recent={(data ?? []).map((r) => ({ id: r.id, toolId: r.tool_id as string, createdAt: r.created_at }))} />;
}
