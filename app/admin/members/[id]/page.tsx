import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/admin/admin-view";
import { getMemberDetail } from "@/lib/admin";

export const metadata = { title: "회원 프로필 — AI 해바 관리자" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const member = await getMemberDetail(id);
  if (!member) notFound();
  return <MemberProfile m={member} />;
}
