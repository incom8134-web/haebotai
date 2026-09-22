import { StudioWorkspace, type StudioRun } from "@/components/studio/studio-workspace";
import { getBusinessProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

// The Studio — the "one brief, a whole campaign" workspace (design ported
// from the haebot-ai-studio prototype). Server side only gathers plain
// data: the Business Profile for grounding chips and the latest runs for
// the right-hand panel. Tool manifests stay client-side (icons and zod
// schemas aren't serializable), read straight from the registry.

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, runsResult] = await Promise.all([
    getBusinessProfile(),
    user
      ? supabase
          .from("generations")
          .select("id, tool_id, status, credits_used, credits_reserved, created_at")
          .eq("user_id", user.id)
          .not("tool_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const recentRuns: StudioRun[] = (runsResult.data ?? []).map((run) => ({
    id: run.id,
    toolId: run.tool_id as string,
    status: run.status,
    credits: run.credits_used ?? run.credits_reserved ?? null,
    createdAt: run.created_at,
  }));

  return <StudioWorkspace profile={profile} recentRuns={recentRuns} />;
}
