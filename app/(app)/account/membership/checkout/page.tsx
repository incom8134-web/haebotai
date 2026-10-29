import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/account/checkout";
import { getMembership } from "@/lib/membership";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";
import { productFor } from "@/lib/payments/pro";
import { SAAS } from "@/lib/site/access";

export const generateMetadata = titled("결제", "Checkout");

// ?product=plus | pro | topup (Plus when missing or unknown).
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  if (!SAAS) redirect("/account");
  const { product: requested } = await searchParams;
  const product = productFor(requested) ?? productFor("plus")!;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/account/membership/checkout?product=${product.id}`)}`);
  // The user id is the Toss customerKey — stable per customer, and not
  // guessable the way an email or sequence number would be.
  return <CheckoutView customerKey={user.id} membership={await getMembership()} product={product} />;
}
