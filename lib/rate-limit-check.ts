// Pure logic, split out of rate-limit.ts so it's testable without
// pulling in Redis.fromEnv() (which reads a real secret at module scope
// and legitimately needs the "server-only" guard that lives there).

export interface Limiter {
  limit: (identifier: string) => Promise<{ success: boolean; reset: number }>;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

// A slow or unreachable Redis (dummy/misconfigured credentials, a
// regional outage) must not add multi-second latency to every tool run
// on top of fail-open — bound it explicitly rather than trusting
// whatever fetch/DNS timeout the environment happens to have.
const CHECK_TIMEOUT_MS = 1500;

export async function checkRateLimit(limiter: Limiter, identifier: string): Promise<RateLimitResult> {
  try {
    const { success, reset } = await Promise.race([
      limiter.limit(identifier),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("rate limit check timed out")), CHECK_TIMEOUT_MS),
      ),
    ]);
    if (success) return { ok: true };
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error("rate limit check failed, allowing request through:", err);
    return { ok: true };
  }
}
