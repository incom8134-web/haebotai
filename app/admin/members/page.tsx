import { MemberList } from "@/components/admin/admin-view";
import { listMembers } from "@/lib/admin";
import { parseMemberFilters } from "@/lib/admin-filters";

export const metadata = { title: "회원 관리 — AI 해바 관리자" };

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseMemberFilters(sp);
  const result = await listMembers(filters);
  return <MemberList {...result} filters={filters} deleted={sp.deleted === "1"} />;
}
