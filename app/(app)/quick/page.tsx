import { QuickStart } from "@/components/quick/quick-start";
import { getCurrentUser } from "@/lib/supabase/user";
import { getApiKeyStatus } from "@/lib/api-keys";
import { canUsePlatformKey } from "@/lib/platform-access";
import { MEMBER_API_KEYS, OWN_KEY_ONLY, SAAS } from "@/lib/site/access";
import { getMembership } from "@/lib/membership";
import { isPaidPlan } from "@/lib/payments/pro";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("바로 만들기", "Quick start", {
  description: "SNS 게시물, 홍보 문구, 홍보 이미지를 한 줄로 바로 만들어요.",
});

export default async function QuickPage() {
  const [user, keyStatus, membership] = await Promise.all([getCurrentUser(), MEMBER_API_KEYS ? getApiKeyStatus() : Promise.resolve(null), getMembership()]);
  // Same rules as the tool page (tool-runner needsKey / needsPlan): every quick tool runs on Google.
  const team = !!user && canUsePlatformKey(user.email);
  const needsKey = !!user && OWN_KEY_ONLY && !team && !keyStatus?.providers.google.some((s) => s.connected && !s.broken);
  const needsPlan = !!user && SAAS && !team && !isPaidPlan(membership.plan);
  return <QuickStart signedIn={!!user} needsKey={needsKey} needsPlan={needsPlan} />;
}
