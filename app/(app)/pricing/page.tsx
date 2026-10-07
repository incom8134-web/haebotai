import { PricingView } from "@/components/site/pricing-view";
import { createClient } from "@/lib/supabase/server";

import { OWN_KEY_ONLY } from "@/lib/site/access";

export const metadata = {
  title: "요금 — AI 해바",
  description: OWN_KEY_ONLY ? "25개 도구를 내 API 키로 실행해요. AI 요금은 내 Google·Anthropic 계정으로 직접 청구돼요." : "모든 플랜에서 25개 도구를 모두 쓰고, 다른 건 크레딧뿐이에요. 도구별 예상 크레딧과 환불 기준.",
};

export default async function PricingPage() {
  // Local JWT check only — enough to pick the plan buttons' targets.
  const { data } = await (await createClient()).auth.getClaims();
  return <PricingView signedIn={!!data?.claims} />;
}
