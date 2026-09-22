import { LibraryList } from "@/components/library-list";
import { getTool } from "@/lib/tools/registry";
import { createClient } from "@/lib/supabase/server";

// HAEBOT_A_TOOLS_SPEC.md T2 — run history. The row is persisted before
// generation starts, so even a run killed mid-stream shows up here.

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: runs } = await supabase
    .from("generations")
    .select("id, tool_id, status, credits_reserved, credits_used, created_at")
    .eq("user_id", user?.id ?? "")
    .not("tool_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (runs ?? []).map((run) => {
    const manifest = run.tool_id ? getTool(run.tool_id) : undefined;
    return {
      id: run.id,
      toolId: run.tool_id,
      toolNameKo: manifest?.name_ko ?? run.tool_id ?? "",
      toolNameEn: manifest?.name_en ?? run.tool_id ?? "",
      status: run.status,
      credits: run.credits_used ?? run.credits_reserved,
      createdAt: run.created_at,
    };
  });

  return <LibraryList runs={items} />;
}
