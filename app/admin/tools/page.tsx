import { ToolUsageView } from "@/components/admin/admin-view";
import { getToolUsage, type UsagePeriod } from "@/lib/admin";

export const metadata = { title: "도구 사용 현황 — AI 해바 관리자" };

const PERIODS: UsagePeriod[] = [7, 30, 90, 0];

export default async function AdminToolsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: raw } = await searchParams;
  const period = PERIODS.find((p) => String(p) === raw) ?? 30;
  const usage = await getToolUsage(period);
  return <ToolUsageView {...usage} period={period} />;
}
