import { PaymentsView } from "@/components/admin/payments-view";
import { getAdminPayments } from "@/lib/admin";

export const metadata = { title: "매출·결제 — AI 해바 관리자" };

export default async function AdminPaymentsPage() {
  return <PaymentsView data={await getAdminPayments()} />;
}
