// Pure rules for lib/spend-guard.ts (testable without Redis).
//
// Credits already cap what each member can spend, but not what the
// platform's own AI key spends in total: many free sign-ups, a script,
// or a bug could burn through the Gemini budget in hours. So on top of
// the per-member credits there are three independent ceilings on
// platform-key runs (runs on a member's own API key cost us nothing and
// only count toward the per-member run cap):
//   1. a kill switch (env PLATFORM_AI_DISABLED=1, or Redis key
//      spend:killswitch = 1 for an instant stop without a redeploy),
//   2. a daily platform budget in credits (PLATFORM_DAILY_CREDIT_CAP),
//   3. a per-member daily run cap (USER_DAILY_RUN_CAP).
// Crossing 50 %, 80 % and 100 % of the daily budget sends one alert each
// (BUDGET_ALERT_WEBHOOK_URL — Slack/Discord/any JSON webhook — and the
// server log).

interface SpendLimits {
  platformDailyCredits: number;
  userDailyRuns: number;
}

const DEFAULT_LIMITS: SpendLimits = {
  // ≈ 830 homepage runs or 5,000 short runs a day before new platform
  // runs pause. Calibrate against your Google Cloud billing.
  platformDailyCredits: 150_000,
  userDailyRuns: 60,
};

export function limitsFromEnv(e: Record<string, string | undefined>): SpendLimits {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
  };
  return {
    platformDailyCredits: num(e.PLATFORM_DAILY_CREDIT_CAP, DEFAULT_LIMITS.platformDailyCredits),
    userDailyRuns: num(e.USER_DAILY_RUN_CAP, DEFAULT_LIMITS.userDailyRuns),
  };
}

/** Day bucket in Korea time, e.g. "2026-09-29". */
export function kstDay(now: Date): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export type SpendDecision = { ok: true; alerts: number[] } | { ok: false; reason: "killswitch" | "platform_budget" | "user_daily_runs"; alerts: number[] };

const ALERT_LEVELS = [50, 80, 100] as const;

/**
 * Decide after counting this run: platformSpent/userRuns already include
 * it. Alerts lists the budget levels this run crossed.
 */
export function decide(opts: { killswitch: boolean; platform: boolean; cost: number; platformSpent: number; userRuns: number; limits: SpendLimits }): SpendDecision {
  const { limits } = opts;
  const before = opts.platform ? opts.platformSpent - opts.cost : opts.platformSpent;
  const alerts = opts.platform ? ALERT_LEVELS.filter((l) => before < (limits.platformDailyCredits * l) / 100 && opts.platformSpent >= (limits.platformDailyCredits * l) / 100) : [];
  if (opts.platform && opts.killswitch) return { ok: false, reason: "killswitch", alerts };
  if (opts.userRuns > limits.userDailyRuns) return { ok: false, reason: "user_daily_runs", alerts };
  if (opts.platform && opts.platformSpent > limits.platformDailyCredits) return { ok: false, reason: "platform_budget", alerts };
  return { ok: true, alerts };
}

export const SPEND_MESSAGES: Record<"killswitch" | "platform_budget" | "user_daily_runs", string> = {
  killswitch: "지금은 AI 생성을 잠시 멈췄어요. 곧 다시 열게요. 크레딧은 차감되지 않았어요.",
  platform_budget: "오늘 이용량이 많아 AI 생성을 잠시 멈췄어요. 내일 다시 이용할 수 있어요(내 API 키가 있으면 지금도 가능). 크레딧은 차감되지 않았어요.",
  user_daily_runs: "하루 실행 한도에 도달했어요. 내일 다시 이용할 수 있어요. 크레딧은 차감되지 않았어요.",
};
