import { CheckoutFail } from "@/components/account/checkout";

export const metadata = { title: "결제 실패 — 해봇 AI" };

// Toss redirects here with ?code&message&orderId when the payment window
// fails or the buyer closes it. Nothing was charged, and the pending
// order row is simply never confirmed.
export default async function CheckoutFailPage({ searchParams }: { searchParams: Promise<{ code?: string; message?: string }> }) {
  const { code, message } = await searchParams;
  return <CheckoutFail code={code ?? null} message={message ?? null} />;
}
