import { AnnouncementsView } from "@/components/admin/ops-view";
import { listAnnouncements } from "@/lib/admin-ops-server";

export const metadata = { title: "공지·패치노트 — AI 해바 관리자" };

export default async function AdminAnnouncementsPage() {
  return <AnnouncementsView items={await listAnnouncements()} />;
}
