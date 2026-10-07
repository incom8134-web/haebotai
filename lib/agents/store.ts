import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleGenerationCredits } from "@/lib/credits";
import type { AgentEvent, AgentRunState } from "./types";

// Run state lives on the run row itself, in generations.output._agent,
// while the run is pending/streaming; the final output replaces it when
// the run finishes. Only the runner writes it, and every write is
// conditional on the row still running — the cancel route flips the
// status (and refunds), which makes the next write a no-op and tells the
// runner to stop.
//
// The service-role client bypasses RLS: callers pass a run id they were
// authorized for (the member's own run from the run route, or a signed
// continuation), and every query here still scopes by the run id.

/** Events kept on the row; the page only ever needs the recent timeline. */
const MAX_EVENTS = 80;

export interface RunRow {
  id: string;
  user_id: string;
  tool_id: string;
  status: string;
  input: Record<string, unknown> | null;
  credits_reserved: number | null;
  provider: string | null;
  output: { _agent?: AgentRunState } | null;
}

export function agentDb(): SupabaseClient {
  return createAdminClient();
}

export async function loadRun(db: SupabaseClient, runId: string): Promise<RunRow | null> {
  const { data } = await db
    .from("generations")
    .select("id, user_id, tool_id, status, input, credits_reserved, provider, output")
    .eq("id", runId)
    .maybeSingle();
  return (data as RunRow | null) ?? null;
}

export async function runStatus(db: SupabaseClient, runId: string): Promise<string | null> {
  const { data } = await db.from("generations").select("status").eq("id", runId).maybeSingle();
  return (data?.status as string | undefined) ?? null;
}

/** Saves the state; false when the run is no longer running (cancelled or failed elsewhere). */
export async function saveState(db: SupabaseClient, state: AgentRunState): Promise<boolean> {
  state.heartbeatAt = new Date().toISOString();
  if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
  const { data } = await db
    .from("generations")
    .update({ status: "streaming", output: { _agent: state } })
    .eq("id", state.runId)
    .eq("user_id", state.userId)
    .in("status", ["pending", "streaming"])
    .select("id");
  return Boolean(data?.length);
}

export function pushEvent(state: AgentRunState, e: Omit<AgentEvent, "at">) {
  state.events.push({ ...e, at: new Date().toISOString() });
}

/** Fails a still-running row and refunds the reservation. */
export async function failRun(db: SupabaseClient, runId: string, status: "error" | "cancelled", message: string) {
  // Drafts and working data aren't kept for a failed run.
  const { data } = await db
    .from("generations")
    .update({ status, error: message, output: null })
    .eq("id", runId)
    .in("status", ["pending", "streaming"])
    .select("id");
  if (data?.length) await settleGenerationCredits(runId, 0);
}

/**
 * A run whose worker vanished (the platform killed the function before it
 * could save or hand off): no heartbeat for longer than one invocation can
 * last. Fails it and refunds, so a member never waits on a dead run.
 */
const STALE_AFTER_MS = 330_000;

export function isStale(heartbeatAt: string | null | undefined, now = Date.now()): boolean {
  if (!heartbeatAt) return false;
  const t = Date.parse(heartbeatAt);
  return Number.isFinite(t) && now - t > STALE_AFTER_MS;
}
