import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentsEnabled, PRO_PLAN_PRICE_KRW } from "@/lib/payments";
import { ProCheckout } from "@/components/account/pro-checkout";

export const metadata = { title: "프로 결제 — 해봇 AI" };

export default async function CheckoutPage() {
  if (!paymentsEnabled()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  return (
    <ProCheckout
      clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!}
      customerKey={user.id}
      customerEmail={user.email ?? undefined}
      amount={PRO_PLAN_PRICE_KRW}
    />
  );
}
