import { MembershipPanel } from "@/components/account/account-view";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "학생 멤버십 — 해봇 AI" };

export default async function MembershipPage() {
  return <MembershipPanel membership={await getMembership()} />;
}
