import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { failRun, isStale } from "@/lib/agents/store";
import type { AgentEvent } from "@/lib/agents/types";

// The page's live view of a run (a background job, lib/agents/runner.ts):
// NDJSON, one line per new step event, then the final line — `done` with
// the result, `error`, or `cancelled`. It reads the run row every second
// or so and closes itself before the function limit; the page reconnects
// with ?since=<events already seen>. A run whose worker vanished (no
// heartbeat for longer than an invocation can last) is failed and
// refunded here, so nobody waits on a dead run.

export const maxDuration = 300;

/** Close well before the limit; the client reconnects. */
const STREAM_MS = 240_000;
const POLL_MS = 1200;

function line(event: unknown) {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  let since = Math.max(0, parseInt(request.nextUrl.searchParams.get("since") ?? "0", 10) || 0);

  // Service role for the reads (the working state isn't selectable column
  // by column through RLS-friendly views); every query is scoped to this
  // member's own run.
  const admin = createAdminClient();
  const own = await admin.from("generations").select("id").eq("id", runId).eq("user_id", user.id).maybeSingle();
  if (!own.data) return Response.json({ error: "실행을 찾을 수 없습니다" }, { status: 404 });

  const started = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => {
        try {
          controller.enqueue(line(e));
        } catch {
          /* client gone */
        }
      };
      const close = () => {
        try {
          controller.close();
        } catch {
          /* closed */
        }
      };
      send({ type: "status", status: "streaming", runId });
      while (!request.signal.aborted && Date.now() - started < STREAM_MS) {
        const { data: row } = await admin
          .from("generations")
          .select("status, error, events:output->_agent->events, beat:output->_agent->heartbeatAt")
          .eq("id", runId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!row) {
          send({ type: "error", error: "실행을 찾을 수 없습니다" });
          return close();
        }
        const events = (Array.isArray(row.events) ? row.events : []) as unknown as AgentEvent[];
        // The row keeps a bounded tail of events; a reconnect never replays or skips.
        if (since > events.length) since = events.length;
        for (const e of events.slice(since)) send({ type: "step", event: e });
        since = events.length;

        if (row.status === "done") {
          const { data: done } = await admin.from("generations").select("output, sources, credits_used, provider").eq("id", runId).eq("user_id", user.id).maybeSingle();
          send({ type: "done", output: done?.output, sources: done?.sources ?? [], creditsUsed: done?.credits_used ?? 0, runId, provider: done?.provider });
          return close();
        }
        if (row.status === "cancelled") {
          send({ type: "cancelled" });
          return close();
        }
        if (row.status === "error") {
          send({ type: "error", error: row.error ?? "생성 중 오류가 발생했습니다" });
          return close();
        }
        if (isStale(row.beat as string | null)) {
          await failRun(admin, runId, "error", "작업이 중단되었습니다. 다시 실행해 주세요.");
          continue;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      // Time's up for this connection; the run goes on. The client reconnects with ?since.
      send({ type: "reconnect", since });
      close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
