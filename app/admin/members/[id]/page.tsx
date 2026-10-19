import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/admin/admin-view";
import { getMemberDetail } from "@/lib/admin";
import { NoticePanel } from "@/components/admin/ops-view";
import { noticesFor } from "@/lib/admin-ops-server";

export const metadata = { title: "회원 프로필 — AI 해바 관리자" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [member, sent] = await Promise.all([getMemberDetail(id), noticesFor(id)]);
  if (!member) notFound();
  return <MemberProfile m={member} notices={<NoticePanel memberId={id} sent={sent} />} />;
}
