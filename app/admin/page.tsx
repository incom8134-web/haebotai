import { AdminOverviewView } from "@/components/admin/admin-view";
import { AlertsBar } from "@/components/admin/ops-view";
import { getOverview } from "@/lib/admin";
import { getFailureAlerts, getSiteSettings } from "@/lib/admin-ops-server";

export const metadata = { title: "대시보드 — AI 해바 관리자" };

export default async function AdminOverviewPage() {
  const [overview, alerts, settings] = await Promise.all([getOverview(), getFailureAlerts(), getSiteSettings()]);
  return <AdminOverviewView overview={overview} alerts={<AlertsBar alerts={alerts} settings={settings} />} />;
}
