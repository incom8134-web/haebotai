import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/account/checkout";
import { getMembership } from "@/lib/membership";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata = { title: "프로 결제 — AI 해바" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/account/membership/checkout");
  // The user id is the Toss customerKey — stable per customer, and not
  // guessable the way an email or sequence number would be.
  return <CheckoutView customerKey={user.id} membership={await getMembership()} />;
}
