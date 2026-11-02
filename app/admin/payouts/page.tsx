import { PayoutsView } from "@/components/admin/payouts-view";
import { listReferralPayouts } from "@/lib/admin";

export const metadata = { title: "추천 정산 — AI 해바 관리자" };

export default async function AdminPayoutsPage() {
  return <PayoutsView summary={await listReferralPayouts()} />;
}
