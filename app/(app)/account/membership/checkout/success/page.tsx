import { redirect } from "next/navigation";
import { CheckoutSuccess } from "@/components/account/checkout";

export const metadata = { title: "결제 확인 — 해봇 AI" };

// Toss redirects here with ?paymentKey&orderId&amount&paymentType. The
// confirm happens client-side via POST (not during this render), so a
// prefetch or re-render can never approve a payment.
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }> }) {
  const { paymentKey, orderId, amount } = await searchParams;
  if (!paymentKey || !orderId || !amount) redirect("/account/membership");
  return <CheckoutSuccess paymentKey={paymentKey} orderId={orderId} amount={amount} />;
}
