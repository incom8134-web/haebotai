import { redirect } from "next/navigation";
import { ReferralPanel } from "@/components/account/referral-panel";
import { OWN_KEY_ONLY, REFERRAL_CREDITS, REFERRAL_REVENUE_SHARE } from "@/lib/site/access";
import { getReferralStatus, getRevenueShareStatus } from "@/lib/referral-server";
import { RevenueSharePanel } from "@/components/account/revenue-share-panel";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("친구 초대 · 수익 공유", "Invite friends");

export default async function ReferralPage() {
  // Invites paid credits; none are granted now (lib/site/access.ts).
  if (OWN_KEY_ONLY) redirect("/account/api-key");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  // SaaS: friends' purchases earn the inviter cash (lib/referral.ts REVENUE_SHARE).
  if (REFERRAL_REVENUE_SHARE) {
    const user = await getCurrentUser();
    if (!user) redirect("/auth?next=/account/referral");
    const status = await getRevenueShareStatus(user.id);
    return <RevenueSharePanel status={status} link={status ? `${siteUrl}/?ref=${status.code}` : null} />;
  }
  if (!REFERRAL_CREDITS) redirect("/account");
  const user = await getCurrentUser();
  const status = user ? await getReferralStatus(user.id) : null;
  return <ReferralPanel status={status} link={status ? `${siteUrl}/?ref=${status.code}` : null} />;
}
