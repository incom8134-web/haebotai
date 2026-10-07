import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard, type DashboardRun } from "@/components/studio/dashboard";
import { getBalance } from "@/lib/credits";
import { getApiKeyStatus } from "@/lib/api-keys";
import { canUsePlatformKey } from "@/lib/platform-access";
import { listProjects } from "@/lib/projects/server";
import { displayName } from "@/lib/site/display-name";
import { isGoal, recommendTools } from "@/lib/site/onboarding";
import { catalogTool } from "@/lib/tools/catalog";
import { chainTargets } from "@/lib/tools/registry";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("스튜디오", "Studio");

// The member's home (docs/redesign-plan.md §5): continue working,
// projects, recent results, what to run next, a quick start and real
// credit usage. A brand-new member — no projects, no runs, onboarding
// never seen — goes through onboarding first.

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

export default async function StudioPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const store = await cookies();
  const goalCookie = store.get("haebot-goal")?.value;
  const goal = isGoal(goalCookie) ? goalCookie : null;

  const since = daysAgo(30);
  const [keyStatus, projects, balance, recent, month, used, inProjects] = await Promise.all([
    getApiKeyStatus(),
    listProjects(),
    getBalance(),
    user
      ? supabase
          .from("generations")
          .select("id, tool_id, status, title, project_id, created_at")
          .eq("user_id", user.id)
          .not("tool_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as never[], error: null }),
    user
      ? supabase
          .from("generations")
          .select("credits_used")
          .eq("user_id", user.id)
          .eq("status", "done")
          .gte("created_at", since)
          .limit(1000)
      : Promise.resolve({ data: [] as never[] }),
    user
      ? supabase
          .from("generations")
          .select("tool_id")
          .eq("user_id", user.id)
          .eq("status", "done")
          .not("tool_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as never[] }),
    // Result counts per project, fetched alongside instead of after.
    user
      ? supabase
          .from("generations")
          .select("project_id")
          .eq("user_id", user.id)
          .not("project_id", "is", null)
          .limit(5000)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Before migration 0016 the title/project columns don't exist; fall back.
  let rows = (recent.data ?? []) as {
    id: string;
    tool_id: string;
    status: string;
    title?: string | null;
    project_id?: string | null;
    created_at: string;
  }[];
  if (recent.error && user) {
    const { data } = await supabase
      .from("generations")
      .select("id, tool_id, status, created_at")
      .eq("user_id", user.id)
      .not("tool_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(8);
    rows = data ?? [];
  }

  if (
    !projects.length &&
    !rows.length &&
    store.get("haebot-onboarded")?.value !== "1"
  )
    redirect("/onboarding");

  const counts: Record<string, number> = {};
  for (const r of (inProjects.data ?? []) as { project_id: string | null }[])
    if (r.project_id) counts[r.project_id] = (counts[r.project_id] ?? 0) + 1;

  const runs: DashboardRun[] = rows.map((r) => ({
    id: r.id,
    toolId: r.tool_id,
    status: r.status,
    title: r.title ?? null,
    projectId: r.project_id ?? null,
    createdAt: r.created_at,
  }));
  const usedTools = [
    ...new Set((used.data ?? []).map((r) => r.tool_id as string)),
  ];
  const lastDone = runs.find((r) => r.status === "done");
  const monthRuns = month.data ?? [];

  return (
    <Dashboard
      name={displayName(user?.user_metadata)}
      projects={projects
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          runs: counts[p.id] ?? 0,
        }))}
      projectCount={projects.length}
      runs={runs}
      // "Continue" already offers the last result's hand-offs; this row
      // adds the goal's tools and a default spread, minus those.
      recommended={recommendTools({
        usedTools: [
          ...usedTools,
          ...(lastDone
            ? chainTargets(lastDone.toolId).map((m) => catalogTool(m.id)?.slug ?? m.id)
            : []),
        ],
        goal,
        limit: 3,
      })}
      lastTool={lastDone?.toolId ?? null}
      usage={{
        balance,
        used30: monthRuns.reduce((s, r) => s + (r.credits_used ?? 0), 0),
        runs30: monthRuns.length,
        keyConnected: keyStatus.providers.google.some((s) => s.connected && !s.broken),
        team: canUsePlatformKey(user?.email),
      }}
    />
  );
}
