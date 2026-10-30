import type { Bilingual } from "@/lib/tools/content";
import { PRODUCTS } from "@/lib/payments/pro";

// "student" stays a valid stored value (old rows); the app treats it as
// free while the student plan is off (lib/site/access.ts).
export type PlanId = "free" | "plus" | "pro" | "student";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const credits = (n: number): Bilingual => ({ ko: `30일마다 ${n.toLocaleString()} 크레딧`, en: `${n.toLocaleString()} credits every 30 days` });

/** The plans on sale, in display order (lib/payments/pro.ts holds prices and credits). */
export const PLANS: { id: Exclude<PlanId, "student">; name: Bilingual; price: Bilingual; note: Bilingual; credits: Bilingual; features: Bilingual[]; highlight?: boolean }[] = [
  {
    id: "free",
    name: { ko: "무료", en: "Free" },
    price: { ko: "₩0", en: "₩0" },
    note: { ko: "둘러보기", en: "Browse" },
    credits: { ko: "크레딧 없음", en: "No credits" },
    features: [
      { ko: "16개 도구와 예시 결과 둘러보기", en: "Browse all 16 tools and sample results" },
      { ko: "비즈니스 프로필·프로젝트 만들기", en: "Set up your Business Profile and projects" },
      { ko: "공유받은 결과 보기", en: "Open results shared with you" },
      { ko: "도구 실행은 플러스부터", en: "Running tools starts with Plus" },
    ],
  },
  {
    id: "plus",
    name: { ko: "플러스", en: "Plus" },
    price: { ko: `${won(PRODUCTS.plus.amount)}/30일`, en: `${won(PRODUCTS.plus.amount)} / 30 days` },
    note: { ko: "부가세 포함 · 자동 결제 없음", en: "VAT incl. · no auto-renewal" },
    credits: credits(PRODUCTS.plus.credits),
    features: [
      { ko: "16개 도구 모두 실행", en: "Run all 16 tools" },
      { ko: `${PRODUCTS.plus.credits.toLocaleString()} 크레딧 (예: 블로그 글 5편 + 리포트 20개)`, en: `${PRODUCTS.plus.credits.toLocaleString()} credits (e.g. 5 blog posts + 20 reports)` },
      { ko: "PDF·Word·PPT 디자인 결과 파일", en: "Designed PDF, Word and PPT downloads" },
      { ko: `모자라면 ${PRODUCTS.topup.credits} 크레딧 ${won(PRODUCTS.topup.amount)} 충전`, en: `Top up ${PRODUCTS.topup.credits} credits for ${won(PRODUCTS.topup.amount)}` },
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: { ko: "프로", en: "Pro" },
    price: { ko: `${won(PRODUCTS.pro.amount)}/30일`, en: `${won(PRODUCTS.pro.amount)} / 30 days` },
    note: { ko: "부가세 포함 · 자동 결제 없음", en: "VAT incl. · no auto-renewal" },
    credits: credits(PRODUCTS.pro.credits),
    features: [
      { ko: "플러스의 모든 기능", en: "Everything in Plus" },
      { ko: `${PRODUCTS.pro.credits.toLocaleString()} 크레딧 — 플러스의 3배`, en: `${PRODUCTS.pro.credits.toLocaleString()} credits — 3× Plus` },
      { ko: "홈페이지·로고·광고 사진처럼 이미지가 많은 작업에", en: "Made for image-heavy work: sites, logos, ad photos" },
      { ko: `모자라면 ${PRODUCTS.topup.credits} 크레딧 ${won(PRODUCTS.topup.amount)} 충전`, en: `Top up ${PRODUCTS.topup.credits} credits for ${won(PRODUCTS.topup.amount)}` },
    ],
  },
];

/** Display name of any stored plan (a student row shows as Free). */
export function planName(id: PlanId): Bilingual {
  return (PLANS.find((p) => p.id === id) ?? PLANS[0]).name;
}
