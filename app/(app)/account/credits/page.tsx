import { CreditsView } from "@/components/account/credits-view";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getMonthlyUsage } from "@/lib/usage";

export const metadata = { title: "크레딧·한도 — 해봇 AI" };

export default async function CreditsPage() {
  const [balance, membership, apiKey, usage] = await Promise.all([getBalance(), getMembership(), getApiKeyStatus(), getMonthlyUsage()]);
  return <CreditsView balance={balance ?? 0} plan={membership.plan} apiKeyConnected={apiKey.connected} usage={usage} />;
}
