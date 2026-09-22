import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryRunDetail } from "@/components/library-run-detail";
import type { Source } from "@/lib/tools/registry/shared";
import type { ProviderId } from "@/lib/ai/types";

// HAEBOT_A_TOOLS_SPEC.md T2 — run history is only real if a past run's
// actual output is reachable, not just its row in the list. Reuses the
// exact same RunResult rendering a live "done" run gets.

export default async function LibraryRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: run } = await supabase
    .from("generations")
    .select("id, tool_id, status, input, output, sources, credits_used, provider, error, created_at")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run || !run.tool_id) notFound();

  return (
    <LibraryRunDetail
      toolId={run.tool_id}
      runId={run.id}
      status={run.status}
      input={run.input ?? undefined}
      output={run.output}
      sources={(run.sources ?? []) as Source[]}
      creditsUsed={run.credits_used}
      provider={run.provider as ProviderId | null}
      error={run.error}
      createdAt={run.created_at}
    />
  );
}
