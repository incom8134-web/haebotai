import { LibraryList } from "@/components/library-list";
import { getTool } from "@/lib/tools/registry";
import { listProjects } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

// HAEBOT_A_TOOLS_SPEC.md T2 — run history. The row is persisted before
// generation starts, so even a run killed mid-stream shows up here.

type Row = { id: string; tool_id: string | null; status: string; credits_reserved: number | null; credits_used: number | null; created_at: string; title?: string | null; project_id?: string | null };

export default async function LibraryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const base = "id, tool_id, status, credits_reserved, credits_used, created_at";
  const query = (cols: string) =>
    supabase.from("generations").select(cols).eq("user_id", user?.id ?? "").not("tool_id", "is", null).order("created_at", { ascending: false }).limit(100);
  // Titles and projects come with migration 0016; before it, list without them.
  let { data, error } = await query(`${base}, title, project_id`);
  if (error) ({ data, error } = await query(base));
  const runs = (data ?? []) as unknown as Row[];
  const projects = await listProjects();

  const items = runs.map((run) => {
    const manifest = run.tool_id ? getTool(run.tool_id) : undefined;
    return {
      id: run.id,
      toolId: run.tool_id,
      toolNameKo: manifest?.name_ko ?? run.tool_id ?? "",
      toolNameEn: manifest?.name_en ?? run.tool_id ?? "",
      status: run.status,
      credits: run.credits_used ?? run.credits_reserved,
      createdAt: run.created_at,
      title: run.title ?? null,
      projectId: run.project_id ?? null,
    };
  });

  return <LibraryList runs={items} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />;
}
