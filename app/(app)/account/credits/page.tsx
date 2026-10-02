import { redirect } from "next/navigation";
import { CreditsView } from "@/components/account/credits-view";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getMonthlyUsage } from "@/lib/usage";

export const metadata = { title: "크레딧·한도 — 해봇 AI" };

export default async function CreditsPage() {
  // No credits while members bring their own key (lib/site/access.ts).
  if (OWN_KEY_ONLY) redirect("/account/api-key");
  const [balance, membership, apiKey] = await Promise.all([getBalance(), getMembership(), getApiKeyStatus()]);
  const usage = await getMonthlyUsage(membership.plan === "student");
  return <CreditsView balance={balance ?? 0} plan={membership.plan} apiKeyConnected={apiKey.connected} usage={usage} />;
}
