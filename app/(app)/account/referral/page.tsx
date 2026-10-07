import { redirect } from "next/navigation";
import { ReferralPanel } from "@/components/account/referral-panel";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { getReferralStatus } from "@/lib/referral-server";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("친구 초대", "Invite friends");

export default async function ReferralPage() {
  // Invites paid credits; members now bring their own key (lib/site/access.ts).
  if (OWN_KEY_ONLY) redirect("/account/api-key");
  const user = await getCurrentUser();
  const status = user ? await getReferralStatus(user.id) : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return <ReferralPanel status={status} link={status ? `${siteUrl}/?ref=${status.code}` : null} />;
}
