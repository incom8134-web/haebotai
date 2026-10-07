import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { displayName } from "@/lib/site/display-name";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("시작하기", "Get started");

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  return <OnboardingFlow name={displayName(user?.user_metadata)} />;
}
