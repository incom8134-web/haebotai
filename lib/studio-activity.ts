// The Studio's activity charts (components/studio/activity-panel.tsx):
// the last 30 days of finished runs as a daily series, and runs per tool
// area. Pure, so it can be tested; days are counted in Korean time.

export interface ActivityRow {
  created_at: string;
  credits_used: number | null;
  tool_id: string | null;
}

export interface ActivityDay {
  /** YYYY-MM-DD in Asia/Seoul. */
  date: string;
  runs: number;
  credits: number;
}

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

/** One entry per day, oldest first, ending today; days with no runs are zero. */
export function activitySeries(rows: ActivityRow[], now: Date, days = 30): ActivityDay[] {
  const out: ActivityDay[] = [];
  const index = new Map<string, ActivityDay>();
  for (let i = days - 1; i >= 0; i--) {
    const day = { date: dayKey(new Date(now.getTime() - i * 86_400_000)), runs: 0, credits: 0 };
    out.push(day);
    index.set(day.date, day);
  }
  for (const r of rows) {
    const day = index.get(dayKey(new Date(r.created_at)));
    if (!day) continue;
    day.runs += 1;
    day.credits += Math.max(0, r.credits_used ?? 0);
  }
  return out;
}

/** Runs per area, in the given order; tools the lookup doesn't know are left out. */
export function areaCounts<A extends string>(rows: ActivityRow[], order: readonly A[], areaOf: (toolId: string) => A | undefined): { area: A; runs: number }[] {
  const counts = new Map<A, number>(order.map((a) => [a, 0]));
  for (const r of rows) {
    const a = r.tool_id ? areaOf(r.tool_id) : undefined;
    if (a && counts.has(a)) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  return order.map((area) => ({ area, runs: counts.get(area) ?? 0 }));
}

/** Change between the later and the earlier half of a series, in percent; null when the earlier half is empty. */
export function halfOverHalf(values: number[]): number | null {
  const mid = Math.floor(values.length / 2);
  const before = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const after = values.slice(mid).reduce((s, v) => s + v, 0);
  if (before === 0) return null;
  return Math.round(((after - before) / before) * 100);
}
