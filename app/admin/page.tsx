import { AdminOverviewView } from "@/components/admin/admin-view";
import { getOverview } from "@/lib/admin";

export const metadata = { title: "대시보드 — AI 해바 관리자" };

export default async function AdminOverviewPage() {
  return <AdminOverviewView overview={await getOverview()} />;
}
