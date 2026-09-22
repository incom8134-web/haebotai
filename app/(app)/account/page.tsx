import { redirect } from "next/navigation";
import { AccountOverview } from "@/components/account/account-view";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getBusinessProfile } from "@/lib/profile";

export const metadata = { title: "내 계정 — 해봇 AI" };

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [balance, membership, apiKey, profile] = await Promise.all([getBalance(), getMembership(), getApiKeyStatus(), getBusinessProfile()]);
  return <AccountOverview email={user?.email ?? ""} balance={balance} membership={membership} apiKey={apiKey} brandName={profile?.brand_name ?? null} signOut={signOut} />;
}
