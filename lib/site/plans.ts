import type { Bilingual } from "@/lib/tools/content";

export type PlanId = "free" | "pro" | "student";

export const PLANS: { id: PlanId; name: Bilingual; price: Bilingual; note: Bilingual; credits: Bilingual; features: Bilingual[]; highlight?: boolean }[] = [
  {
    id: "free",
    name: { ko: "무료", en: "Free" },
    price: { ko: "₩0", en: "₩0" },
    note: { ko: "가입 즉시", en: "On sign-up" },
    credits: { ko: "500 크레딧 (1회)", en: "500 credits (one-time)" },
    features: [
      { ko: "모든 도구 사용", en: "Every tool" },
      { ko: "비즈니스 프로필·보관함", en: "Business Profile and Library" },
      { ko: "모든 형식 내보내기 (PDF·Word·PPT·Markdown 등)", en: "Every export format (PDF, Word, PPT, Markdown…)" },
      { ko: "내 API 키를 등록하면 크레딧 미차감", en: "No credits charged with your own API key" },
      { ko: "출처 패널과 추정 배지", en: "Sources panel and estimate badges" },
    ],
  },
  {
    id: "pro",
    name: { ko: "프로", en: "Pro" },
    price: { ko: "₩19,900/30일", en: "₩19,900 / 30 days" },
    note: { ko: "자동 결제 없음", en: "No auto-renewal" },
    credits: { ko: "결제마다 2,000 크레딧", en: "2,000 credits per purchase" },
    features: [
      { ko: "무료 플랜의 모든 기능", en: "Everything in Free" },
      { ko: "결제마다 크레딧 2,000 추가 · 유효기간 없음", en: "2,000 more credits per purchase · they never expire" },
      { ko: "자동 결제 없음 — 필요할 때만 30일 연장", en: "No auto-renewal — extend 30 days only when you want" },
      { ko: "결제 후 7일 안에 쓰지 않았다면 전액 환불", en: "Full refund within 7 days if unused" },
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
