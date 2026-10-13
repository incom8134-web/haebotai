import { MemberList } from "@/components/admin/admin-view";
import { listMembers } from "@/lib/admin";

export const metadata = { title: "회원 — AI 해바", robots: { index: false } };

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const result = await listMembers({ q, page: Number(page) || 1 });
  return <MemberList {...result} q={q} />;
}
