import { ToolUsageView } from "@/components/admin/admin-view";
import { getToolUsage, type UsagePeriod } from "@/lib/admin";
import { parseDay } from "@/lib/admin-filters";

export const metadata = { title: "도구 사용 현황 — AI 해바 관리자" };

const PERIODS: UsagePeriod[] = [7, 30, 90, 0];

export default async function AdminToolsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  // Calendar filter (from/to, Korea-time days) wins over the preset periods.
  const range = { from: parseDay(sp.from), to: parseDay(sp.to) };
  const custom = !!(range.from || range.to);
  const period = PERIODS.find((p) => String(p) === sp.period) ?? 30;
  const usage = await getToolUsage(period, custom ? range : undefined);
  return <ToolUsageView {...usage} period={custom ? null : period} range={range} />;
}
