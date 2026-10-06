import { PricingView } from "@/components/site/pricing-view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "요금 — AI 해바", description: "모든 플랜에서 25개 도구를 모두 쓰고, 다른 건 크레딧뿐이에요. 도구별 예상 크레딧과 환불 기준." };

export default async function PricingPage() {
  // Local JWT check only — enough to pick the plan buttons' targets.
  const { data } = await (await createClient()).auth.getClaims();
  return <PricingView signedIn={!!data?.claims} />;
}
