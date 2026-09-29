import { AccountOverview } from "@/components/account/account-view";
import { signOut } from "@/lib/actions/auth";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getBusinessProfile } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/user";
import { consentOf } from "@/lib/consent";

export const metadata = { title: "내 계정 — 해봇 AI" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  const [balance, membership, apiKey, profile] = await Promise.all([getBalance(), getMembership(), getApiKeyStatus(), getBusinessProfile()]);
  return <AccountOverview email={user?.email ?? ""} balance={balance} membership={membership} apiKey={apiKey} brandName={profile?.brand_name ?? null} signOut={signOut} consent={consentOf(user?.app_metadata)} />;
}
