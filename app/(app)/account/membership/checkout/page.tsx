import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/account/checkout";
import { getMembership } from "@/lib/membership";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("프로 결제", "Pro checkout");

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/account/membership/checkout");
  // The user id is the Toss customerKey — stable per customer, and not
  // guessable the way an email or sequence number would be.
  return <CheckoutView customerKey={user.id} membership={await getMembership()} />;
}
