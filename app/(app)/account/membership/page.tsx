import { MembershipPanel } from "@/components/account/account-view";
import { getMembership } from "@/lib/membership";
import { paymentsEnabled } from "@/lib/payments";

export const metadata = { title: "학생 멤버십 — 해봇 AI" };

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const [membership, { paid }] = await Promise.all([getMembership(), searchParams]);
  return <MembershipPanel membership={membership} paymentsEnabled={paymentsEnabled()} paidNotice={paid === "success" ? "success" : paid === "fail" ? "fail" : null} />;
}
