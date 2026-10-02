import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryRunDetail } from "@/components/library-run-detail";
import type { Source } from "@/lib/tools/registry/shared";
import type { ProviderId } from "@/lib/ai/types";
import { getOutputSchema } from "@/lib/tools/schemas";
import { orderLike } from "@/lib/tools/output-order";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/user";
import { listProjects } from "@/lib/projects/server";
import { resignOutput } from "@/lib/run-assets-server";

// HAEBOT_A_TOOLS_SPEC.md T2 — run history is only real if a past run's
// actual output is reachable, not just its row in the list. Reuses the
// exact same RunResult rendering a live "done" run gets.

type RunRow = {
  id: string;
  tool_id: string | null;
  status: string;
  input: Record<string, unknown> | null;
  output: unknown;
  sources: unknown;
  credits_used: number | null;
  provider: string | null;
  error: string | null;
  created_at: string;
  title?: string | null;
  project_id?: string | null;
  parent_run_id?: string | null;
};

export default async function LibraryRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) notFound();

  const base = "id, tool_id, status, input, output, sources, credits_used, provider, error, created_at";
  const one = (cols: string) => supabase.from("generations").select(cols).eq("id", runId).eq("user_id", user.id).maybeSingle();
  // Titles, projects and versions come with migration 0016; before it, show the run without them.
  let { data, error } = await one(`${base}, title, project_id, parent_run_id`);
  if (error) ({ data, error } = await one(base));
  const run = data as unknown as RunRow | null;

  if (!run || !run.tool_id) notFound();

  const [projects, children, output, share] = await Promise.all([
    listProjects(),
    run.parent_run_id !== undefined
      ? supabase.from("generations").select("id, created_at").eq("parent_run_id", run.id).eq("user_id", user.id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; created_at: string }[] }),
    // Image links are signed when made; a fresh signature keeps old results' images loading.
    run.status === "done" ? resignOutput(supabase, orderLike(getOutputSchema(run.tool_id) ?? z.unknown(), run.output), user.id) : Promise.resolve(null),
    // The live public link, if any (migration 0017; none before it).
    supabase.from("run_shares").select("token").eq("run_id", run.id).is("revoked_at", null).maybeSingle(),
  ]);

  return (
    <LibraryRunDetail
      toolId={run.tool_id}
      runId={run.id}
      status={run.status}
      input={run.input ?? undefined}
      // Older runs were stored in whatever key order the model returned.
      // An unfinished run's output is its working state, not a result.
      output={output}
      sources={(run.sources ?? []) as Source[]}
      creditsUsed={run.credits_used}
      provider={run.provider as ProviderId | null}
      error={run.error}
      createdAt={run.created_at}
      title={run.title ?? null}
      projectId={run.project_id ?? null}
      parentRunId={run.parent_run_id ?? null}
      childRunIds={(children.data ?? []).map((c) => c.id)}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      versioned={run.parent_run_id !== undefined}
      shareToken={share.error ? undefined : (share.data?.token ?? null)}
    />
  );
}
