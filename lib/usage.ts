import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface ToolUsage {
  toolId: string;
  runs: number;
  credits: number;
}

/** This calendar month's finished runs, grouped by tool, for /account/credits. */
export async function getMonthlyUsage(): Promise<{ totalRuns: number; totalCredits: number; byTool: ToolUsage[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { totalRuns: 0, totalCredits: 0, byTool: [] };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("generations")
    .select("tool_id, credits_used, status")
    .eq("user_id", user.id)
    .not("tool_id", "is", null)
    .gte("created_at", monthStart.toISOString())
    .limit(1000);
  const map = new Map<string, ToolUsage>();
  for (const row of data ?? []) {
    if (row.status !== "done") continue;
    const id = row.tool_id as string;
    const u = map.get(id) ?? { toolId: id, runs: 0, credits: 0 };
    u.runs += 1;
    u.credits += row.credits_used ?? 0;
    map.set(id, u);
  }
  const byTool = [...map.values()].sort((a, b) => b.credits - a.credits || b.runs - a.runs);
  return { totalRuns: byTool.reduce((n, u) => n + u.runs, 0), totalCredits: byTool.reduce((n, u) => n + u.credits, 0), byTool };
}
