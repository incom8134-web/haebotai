import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getProjectFacts } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, name, description, updated_at").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (!project) notFound();
  const [{ facts, meta }, { data: runs }] = await Promise.all([
    getProjectFacts(projectId),
    supabase.from("generations").select("id, tool_id, title, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100),
  ]);
  return <ProjectDetail project={project} facts={facts} meta={meta} runs={(runs ?? []).filter((r) => r.tool_id)} />;
}
