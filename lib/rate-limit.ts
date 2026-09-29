import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
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

// Checkout order + confirm: a real purchase needs one of each, and confirm
// calls the Toss API, so a loop here costs external requests.
export const paymentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:payment",
});

// Account deletion walks and deletes every stored file — heavy, and never
// needed more than once.
export const accountDeleteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "10 m"),
  prefix: "ratelimit:account-delete",
});
