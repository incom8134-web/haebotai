import { after, type NextRequest } from "next/server";
import { verifyContinuation } from "@/lib/agents/handoff";
import { agentDb, loadRun } from "@/lib/agents/store";
import { runAgent } from "@/lib/agents/runner";

// A fresh function invocation for a run that needs more time
// (lib/agents/handoff.ts). No member session here: the request is signed
// for this run and the exact invocation its saved state is waiting on,
// so it can't be replayed or pointed at another run.

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const startedAt = Date.now();
  const { runId } = await params;
  const body = (await request.json().catch(() => null)) as { invocation?: unknown } | null;
  const invocation = typeof body?.invocation === "number" && Number.isInteger(body.invocation) ? body.invocation : -1;
  if (!verifyContinuation(runId, invocation, request.headers.get("x-agent-signature"))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const row = await loadRun(agentDb(), runId);
  const state = row?.output?._agent;
  if (!row || !state || (row.status !== "pending" && row.status !== "streaming") || state.invocations !== invocation) {
    return Response.json({ error: "gone" }, { status: 409 });
  }
  after(() => runAgent(runId, startedAt));
  return Response.json({ ok: true }, { status: 202 });
}
