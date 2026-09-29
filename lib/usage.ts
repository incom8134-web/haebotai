import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export interface OwnKeyUsage {
  provider: string;
  runs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolUsage {
  toolId: string;
  runs: number;
  credits: number;
}

/** This calendar month's finished runs, grouped by tool, for /account/credits. */
export async function getMonthlyUsage(isStudent = false): Promise<{ totalRuns: number; totalCredits: number; byTool: ToolUsage[]; ownKey: OwnKeyUsage[] }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { totalRuns: 0, totalCredits: 0, byTool: [], ownKey: [] };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("generations")
    .select("tool_id, credits_used, status, provider, input_tokens, output_tokens")
    .eq("user_id", user.id)
    .not("tool_id", "is", null)
    .gte("created_at", monthStart.toISOString())
    .limit(1000);
  const map = new Map<string, ToolUsage>();
  const own = new Map<string, OwnKeyUsage>();
  for (const row of data ?? []) {
    if (row.status !== "done") continue;
    // A finished run that cost 0 credits ran on the user's own key —
    // except Gemini runs on the student plan, which are free anyway.
    if (row.provider && (row.credits_used ?? 0) === 0 && !(isStudent && row.provider === "google")) {
      const o = own.get(row.provider) ?? { provider: row.provider, runs: 0, inputTokens: 0, outputTokens: 0 };
      o.runs += 1;
      o.inputTokens += row.input_tokens ?? 0;
      o.outputTokens += row.output_tokens ?? 0;
      own.set(row.provider, o);
    }
    const id = row.tool_id as string;
    const u = map.get(id) ?? { toolId: id, runs: 0, credits: 0 };
    u.runs += 1;
    u.credits += row.credits_used ?? 0;
    map.set(id, u);
  }
  const byTool = [...map.values()].sort((a, b) => b.credits - a.credits || b.runs - a.runs);
  return { totalRuns: byTool.reduce((n, u) => n + u.runs, 0), totalCredits: byTool.reduce((n, u) => n + u.credits, 0), byTool, ownKey: [...own.values()] };
}
