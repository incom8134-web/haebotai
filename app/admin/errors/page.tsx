import { ErrorsView } from "@/components/admin/ops-view";
import { getErrorReport, getFailureAlerts, getSiteSettings } from "@/lib/admin-ops-server";
import { parseDay } from "@/lib/admin-filters";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "오류 분석 — AI 해바 관리자" };

const PERIODS = [1, 7, 30, 90];

export default async function AdminErrorsPage({ searchParams }: { searchParams: Promise<{ days?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = { from: parseDay(sp.from), to: parseDay(sp.to) };
  const custom = !!(range.from || range.to);
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 7;
  const [report, alerts, settings] = await Promise.all([getErrorReport(custom ? range : { days }), getFailureAlerts(), getSiteSettings()]);
  // Names for the failures listed (a handful of members).
  const ids = [...new Set(report.recent.map((r) => r.userId))];
  const admin = createAdminClient();
  const names: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const u = data.user;
      if (u) names[id] = (typeof u.app_metadata?.name === "string" && u.app_metadata.name) || u.email || id.slice(0, 8);
    }),
  );
  return <ErrorsView report={report} alerts={alerts} settings={settings} period={custom ? null : days} range={range} names={names} />;
}
