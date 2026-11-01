import { PricingView } from "@/components/site/pricing-view";
import { createClient } from "@/lib/supabase/server";
import { FREE_OWN_KEY, OWN_KEY_ONLY } from "@/lib/site/access";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("요금", "Pricing", {
  description: OWN_KEY_ONLY ? "16개 도구를 내 API 키로 실행해요. AI 요금은 내 Google·Anthropic 계정으로 직접 청구돼요." : FREE_OWN_KEY ? "무료 플랜은 내 Gemini API 키로, 플러스(₩29,900)·프로(₩59,900)는 크레딧으로 16개 도구를 실행해요. 도구별 크레딧과 환불 기준." : "무료로 둘러보고 플러스(₩29,900)·프로(₩59,900)로 16개 도구를 실행해요. 도구별 크레딧과 환불 기준.",
});

export default async function PricingPage() {
  // Local JWT check only — enough to pick the plan buttons' targets.
  const { data } = await (await createClient()).auth.getClaims();
  return <PricingView signedIn={!!data?.claims} />;
}
