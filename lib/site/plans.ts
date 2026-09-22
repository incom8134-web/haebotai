import type { Bilingual } from "@/lib/tools/content";

export type PlanId = "free" | "pro" | "student";

export const PLANS: { id: PlanId; name: Bilingual; price: Bilingual; note: Bilingual; credits: Bilingual; features: Bilingual[]; highlight?: boolean }[] = [
  {
    id: "free",
    name: { ko: "무료", en: "Free" },
    price: { ko: "₩0", en: "₩0" },
    note: { ko: "가입 즉시", en: "On sign-up" },
    credits: { ko: "100 크레딧 (1회)", en: "100 credits (one-time)" },
    features: [
      { ko: "18개 도구 모두 사용", en: "All 18 tools" },
      { ko: "비즈니스 프로필·보관함", en: "Business Profile and Library" },
      { ko: "출처 패널과 추정 배지", en: "Sources panel and estimate badges" },
    ],
  },
  {
    id: "pro",
    name: { ko: "프로", en: "Pro" },
    price: { ko: "₩19,900/월", en: "₩19,900/mo" },
    note: { ko: "언제든 해지", en: "Cancel anytime" },
    credits: { ko: "매월 2,000 크레딧", en: "2,000 credits monthly" },
    features: [
      { ko: "무료 플랜의 모든 기능", en: "Everything in Free" },
      { ko: "모든 형식 내보내기 (docx·xlsx·ics·SVG·ZIP)", en: "All exports (docx, xlsx, ics, SVG, ZIP)" },
      { ko: "우선 처리와 1:1 문의 24시간 내 답변", en: "Priority runs and 24-hour support replies" },
      { ko: "내 API 키 사용 시 크레딧 미차감", en: "No credits charged with your own API key" },
    ],
    highlight: true,
  },
  {
    id: "student",
    name: { ko: "학생", en: "Student" },
    price: { ko: "₩0", en: "₩0" },
    note: { ko: "재학 인증 시 1년", en: "One year, with verification" },
    credits: { ko: "크레딧 제한 없음", en: "Unlimited credits" },
    features: [
      { ko: "프로 플랜의 모든 기능", en: "Everything in Pro" },
      { ko: "학교 이메일 또는 재학증명서로 인증", en: "Verify with a school email or certificate" },
      { ko: "매년 재인증으로 연장", en: "Renew yearly by re-verifying" },
    ],
  },
];
