import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { displayName } from "@/lib/site/display-name";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata = { title: "시작하기 — AI 해바" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  return <OnboardingFlow name={displayName(user?.user_metadata)} />;
}
