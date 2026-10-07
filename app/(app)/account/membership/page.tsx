import { redirect } from "next/navigation";
import { MembershipPanel } from "@/components/account/account-view";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { getMembership, getPaymentHistory } from "@/lib/membership";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("학생 멤버십", "Student membership");

export default async function MembershipPage() {
  // No plans to buy or verify while members bring their own key (lib/site/access.ts).
  if (OWN_KEY_ONLY) redirect("/account/api-key");
  const [membership, payments] = await Promise.all([getMembership(), getPaymentHistory()]);
  return <MembershipPanel membership={membership} payments={payments} />;
}
