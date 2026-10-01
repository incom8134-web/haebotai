import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { displayName } from "@/lib/site/display-name";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata = { title: "시작하기 — 해봇 AI" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  return <OnboardingFlow name={displayName(user?.user_metadata)} />;
}
