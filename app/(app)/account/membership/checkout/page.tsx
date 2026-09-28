import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/account/checkout";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "프로 결제 — 해봇 AI" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/account/membership/checkout");
  // The user id is the Toss customerKey — stable per customer, and not
  // guessable the way an email or sequence number would be.
  return <CheckoutView customerKey={user.id} membership={await getMembership()} />;
}
