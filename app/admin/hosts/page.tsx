import { HostsView } from "@/components/admin/hosts-view";
import { getSiteSettings } from "@/lib/admin-ops-server";
import { listHosts } from "@/lib/admin";

export const metadata = { title: "호스트 — AI 해바 관리자" };

export default async function AdminHostsPage() {
  const settings = await getSiteSettings(true);
  const rows = await listHosts(settings.hostEmails.map((entry) => ({ entry, ...settings.hostMeta[entry] })));
  return <HostsView rows={rows} />;
}
