import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { factsFromRun, FACT_KEYS, type FactKey, type Facts } from "./facts";

// Reads go through the member's session (RLS: own projects only). The one
// write that doesn't — facts from a finished run — happens in the
// background runner with the service role, after checking the project
// belongs to the run's owner.

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name, description, created_at, updated_at").order("updated_at", { ascending: false }).limit(100);
  return (data ?? []) as Project[];
}

export async function getProjectFacts(projectId: string): Promise<{ facts: Facts; meta: Record<string, { source_tool: string | null; source_run_id: string | null; updated_at: string }> }> {
  const supabase = await createClient();
  const { data } = await supabase.from("project_facts").select("key, value, source_tool, source_run_id, updated_at").eq("project_id", projectId);
  const facts: Facts = {};
  const meta: Record<string, { source_tool: string | null; source_run_id: string | null; updated_at: string }> = {};
  for (const r of data ?? []) {
    if ((FACT_KEYS as readonly string[]).includes(r.key)) {
      facts[r.key as FactKey] = r.value;
      meta[r.key] = { source_tool: r.source_tool, source_run_id: r.source_run_id, updated_at: r.updated_at };
    }
  }
  return { facts, meta };
}

/** After a run in a project finishes: store what it established. Never throws. */
export async function writeRunFacts(db: SupabaseClient, opts: { runId: string; userId: string; toolId: string; input: Record<string, unknown>; output: unknown }) {
  try {
    const { data: run } = await db.from("generations").select("project_id").eq("id", opts.runId).eq("user_id", opts.userId).maybeSingle();
    const projectId = run?.project_id as string | null | undefined;
    if (!projectId) return;
    const { data: owned } = await db.from("projects").select("id").eq("id", projectId).eq("user_id", opts.userId).maybeSingle();
    if (!owned) return;
    const out = opts.output && typeof opts.output === "object" && !Array.isArray(opts.output) ? (opts.output as Record<string, unknown>) : {};
    const facts = factsFromRun(opts.toolId, opts.input, out);
    const now = new Date().toISOString();
    const rows = Object.entries(facts).map(([key, value]) => ({ project_id: projectId, key, value, source_run_id: opts.runId, source_tool: opts.toolId, updated_at: now }));
    if (rows.length) await db.from("project_facts").upsert(rows, { onConflict: "project_id,key" });
    await db.from("projects").update({ updated_at: now }).eq("id", projectId);
  } catch (err) {
    console.warn("project facts not saved", (err as Error).message);
  }
}
