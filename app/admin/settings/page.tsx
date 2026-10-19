import { SettingsView } from "@/components/admin/ops-view";
import { getSiteSettings } from "@/lib/admin-ops-server";

export const metadata = { title: "운영 설정 — AI 해바 관리자" };

export default async function AdminSettingsPage() {
  return <SettingsView settings={await getSiteSettings(true)} />;
}
