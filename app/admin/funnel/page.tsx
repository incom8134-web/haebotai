import { FunnelView } from "@/components/admin/ops-view";
import { getFunnel } from "@/lib/admin-ops-server";
import { parseDay } from "@/lib/admin-filters";

export const metadata = { title: "가입 퍼널 — AI 해바 관리자" };

export default async function AdminFunnelPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = { from: parseDay(sp.from), to: parseDay(sp.to) };
  const { steps, stuckAt, members } = await getFunnel(range);
  return <FunnelView steps={steps} stuckAt={stuckAt} members={Object.fromEntries(members)} range={range} />;
}
