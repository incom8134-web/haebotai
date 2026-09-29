import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { checkRateLimit } from "./rate-limit-check";
export { checkRateLimit, type RateLimitResult } from "./rate-limit-check";

// Credits cap total spend per user, but not burst *rate* — a retry loop
// (buggy client, scripted abuse) can fire far faster than any human,
// spiking real Gemini cost and server load well before a balance runs
// out. This is that independent ceiling. Upstash's REST client is
// stateless HTTP, so one shared instance per limiter is fine as a
// module-level singleton. Reads UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN via Redis.fromEnv().

const redis = Redis.fromEnv();

// Tool runs call a real paid model and reserve credits — the tightest,
// most important limit. Each run already takes 15-75s server-side, so
// 10/minute is generous for real use and still blunts a runaway loop.
export const runLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:run",
});

// Export generation (docx/xlsx) is real CPU work but no external API
// cost — looser ceiling, just enough to stop hammering.
export const exportLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:export",
});

// Low-volume actions a person does a few times at most — checkout,
// consent changes, support tickets, API-key tests, account deletion —
// keyed per action and member. 10 per 10 minutes stops scripted abuse
// (and a payment-order loop) without ever touching a real user.
export const sensitiveLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "ratelimit:sensitive",
});

// Every /api request per IP (lib/supabase/middleware.ts): a flood from
// one address is turned away before it reaches a function or the
// database. Well above what the app itself sends from one browser.
export const apiIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  prefix: "ratelimit:api-ip",
});

/** 429 response for a sensitive action over its limit, or null to go ahead. */
export async function limitSensitive(action: string, who: string): Promise<Response | null> {
  const r = await checkRateLimit(sensitiveLimiter, `${action}:${who}`);
  return r.ok ? null : Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(r.retryAfterSeconds ?? 60) } });
}
