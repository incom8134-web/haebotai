import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Continuations: when a run needs more time than one function invocation
// has left, the runner saves its state and asks the deployment to start a
// fresh invocation (POST /api/runs/[runId]/continue). That route has no
// member session, so the request is signed: an HMAC over the run id and
// the invocation number it continues from, keyed by a server-only secret.
// The number makes a signature single-use — the continue route only
// accepts the invocation the saved state is actually waiting for.

/** More invocations than this means something loops; the run fails and is refunded. */
export const MAX_INVOCATIONS = 6;

function key(): string {
  return `agent-continue:${env.SUPABASE_SERVICE_ROLE_KEY}`;
}

function signContinuation(runId: string, invocation: number): string {
  return createHmac("sha256", key()).update(`${runId}:${invocation}`).digest("hex");
}

export function verifyContinuation(runId: string, invocation: number, signature: string | null): boolean {
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signContinuation(runId, invocation), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Asks the deployment to continue the run in a new invocation. Retries briefly; false if it never got through. */
export async function requestContinuation(origin: string, runId: string, invocation: number): Promise<boolean> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-agent-signature": signContinuation(runId, invocation),
  };
  // Protected preview deployments: Vercel's automation bypass, when set.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${origin}/api/runs/${runId}/continue`, {
        method: "POST",
        headers,
        body: JSON.stringify({ invocation }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return true;
      if (res.status < 500) return false;
    } catch {
      /* network — retry */
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return false;
}
