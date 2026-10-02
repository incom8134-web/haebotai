import "server-only";
import { Redis } from "@upstash/redis";
import { decide, kstDay, limitsFromEnv, SPEND_MESSAGES, type SpendDecision } from "./spend-guard-core";

// Server side of lib/spend-guard-core.ts. Counters live in Upstash Redis
// for two days. Like the rate limiter, a Redis outage fails open (credits
// still cap every member) but is logged loudly.

const redis = Redis.fromEnv();
const TTL = 60 * 60 * 48;
const TIMEOUT_MS = 1500;

export async function alert(text: string) {
  console.error(`[BUDGET ALERT] ${text}`);
  const url = process.env.BUDGET_ALERT_WEBHOOK_URL;
  if (!url) return;
  // Slack uses "text", Discord uses "content"; send both.
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(3000) }).catch((err) => console.error("budget alert webhook failed", err));
}

/**
 * Count a run before it starts and decide whether it may go ahead.
 * `platform` is true when the run uses the platform's AI key (it costs
 * us `cost` credits' worth); a refused run is un-counted again.
 */
export async function checkSpend(userId: string, cost: number, platform: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  const limits = limitsFromEnv(process.env);
  const day = kstDay(new Date());
  const pKey = `spend:platform:${day}`;
  const uKey = `spend:user:${userId}:${day}`;
  let decision: SpendDecision;
  try {
    const work = (async () => {
      const p = redis.pipeline();
      p.get<string>("spend:killswitch");
      if (platform) {
        p.incrby(pKey, cost);
        p.expire(pKey, TTL);
      } else p.get<number>(pKey);
      p.incr(uKey);
      p.expire(uKey, TTL);
      const r = (await p.exec()) as unknown[];
      const killswitch = process.env.PLATFORM_AI_DISABLED === "1" || String(r[0] ?? "") === "1";
      const platformSpent = Number(r[1] ?? 0);
      const userRuns = Number(platform ? r[3] : r[2]);
      return decide({ killswitch, platform, cost, platformSpent, userRuns, limits });
    })();
    decision = await Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("spend check timed out")), TIMEOUT_MS))]);
  } catch (err) {
    console.error("spend guard unavailable, allowing run:", err);
    return { ok: true };
  }

  for (const level of decision.alerts) {
    // One alert per level per day, even with many servers.
    const first = await redis.set(`spend:alerted:${day}:${level}`, "1", { nx: true, ex: TTL }).catch(() => null);
    if (first) void alert(`해봇 AI 플랫폼 AI 사용량이 오늘(${day}) 예산의 ${level}%에 도달했습니다 (한도 ${limits.platformDailyCredits.toLocaleString()} 크레딧). ${level >= 100 ? "새 플랫폼 실행을 멈췄습니다." : ""} Google Cloud 결제 화면도 확인하세요.`);
  }
  if (decision.ok) return { ok: true };

  // Undo the count of a run that won't happen.
  await Promise.all([platform ? redis.decrby(pKey, cost) : null, redis.decr(uKey)]).catch(() => null);
  if (decision.reason === "user_daily_runs") {
    const first = await redis.set(`spend:alerted:user:${userId}:${day}`, "1", { nx: true, ex: TTL }).catch(() => null);
    if (first) void alert(`회원 ${userId}가 오늘 하루 실행 한도(${limits.userDailyRuns}회)를 넘겼습니다. 반복 호출이나 부정 이용인지 확인하세요.`);
  }
  return { ok: false, message: SPEND_MESSAGES[decision.reason] };
}
