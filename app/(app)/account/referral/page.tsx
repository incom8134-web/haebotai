import { ReferralPanel } from "@/components/account/referral-panel";
import { getReferralStatus } from "@/lib/referral-server";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata = { title: "친구 초대 — 해봇 AI" };

export default async function ReferralPage() {
  const user = await getCurrentUser();
  const status = user ? await getReferralStatus(user.id) : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return <ReferralPanel status={status} link={status ? `${siteUrl}/?ref=${status.code}` : null} />;
}
