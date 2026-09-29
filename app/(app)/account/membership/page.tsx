import { MembershipPanel } from "@/components/account/account-view";
import { getMembership, getPaymentHistory } from "@/lib/membership";

export const metadata = { title: "학생 멤버십 — 해봇 AI" };

export default async function MembershipPage() {
  const [membership, payments] = await Promise.all([getMembership(), getPaymentHistory()]);
  return <MembershipPanel membership={membership} payments={payments} />;
}
