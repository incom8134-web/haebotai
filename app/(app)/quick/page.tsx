import { QuickStart } from "@/components/quick/quick-start";
import { getCurrentUser } from "@/lib/supabase/user";
import { getApiKeyStatus } from "@/lib/api-keys";
import { canUsePlatformKey } from "@/lib/platform-access";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("바로 만들기", "Quick start", {
  description: "SNS 게시물, 홍보 문구, 홍보 이미지를 한 줄로 바로 만들어요.",
});

export default async function QuickPage() {
  const [user, keyStatus] = await Promise.all([getCurrentUser(), getApiKeyStatus()]);
  // Same rule as the tool page (tool-runner needsKey): every quick tool runs on Google.
  const needsKey = !!user && OWN_KEY_ONLY && !canUsePlatformKey(user.email) && !keyStatus.providers.google.some((s) => s.connected && !s.broken);
  return <QuickStart signedIn={!!user} needsKey={needsKey} />;
}
