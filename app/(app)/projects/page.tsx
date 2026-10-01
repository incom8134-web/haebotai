import { ProjectsView } from "@/components/projects/projects-view";
import { listProjects } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";

// Projects (docs/redesign-plan.md §4.3): the member's businesses or
// initiatives, each with its own memory and results.

export default async function ProjectsPage() {
  const projects = await listProjects();
  const counts: Record<string, number> = {};
  if (projects.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("generations").select("project_id").in("project_id", projects.map((p) => p.id));
    for (const r of data ?? []) if (r.project_id) counts[r.project_id] = (counts[r.project_id] ?? 0) + 1;
  }
  return <ProjectsView projects={projects.map((p) => ({ ...p, runs: counts[p.id] ?? 0 }))} />;
}
