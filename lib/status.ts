import "server-only";
import { env } from "@/lib/env";
import { tossConfigured } from "@/lib/payments/toss";

// Live checks for the public /status page. Results are memoized per server
// instance for 60s so a busy (or hostile) visitor can't turn the page into
// a load generator against our providers. No secrets or error bodies leave
// this module — only up/down.

export type ComponentId = "app" | "database" | "ratelimit" | "ai" | "payments";
export interface ComponentStatus {
  id: ComponentId;
  state: "up" | "down" | "not_configured";
}
export interface StatusReport {
  checkedAt: string;
  components: ComponentStatus[];
}

const TTL_MS = 60_000;
let memo: { at: number; report: StatusReport } | null = null;

async function probe(url: string, headers: Record<string, string>): Promise<"up" | "down"> {
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(5_000) });
    return res.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

export async function getStatus(): Promise<StatusReport> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.report;
  const [database, ratelimit, ai] = await Promise.all([
    probe(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY }),
    probe(`${env.UPSTASH_REDIS_REST_URL}/ping`, { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` }),
    probe("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": env.GOOGLE_GENAI_API_KEY }),
  ]);
  const report: StatusReport = {
    checkedAt: new Date().toISOString(),
    components: [
      { id: "app", state: "up" },
      { id: "database", state: database },
      { id: "ai", state: ai },
      { id: "ratelimit", state: ratelimit },
      { id: "payments", state: tossConfigured() ? "up" : "not_configured" },
    ],
  };
  memo = { at: Date.now(), report };
  return report;
}
