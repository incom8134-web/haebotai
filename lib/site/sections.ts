import type { SubNavItem } from "@/components/site/sub-nav";

// Separate pages, grouped: Help = look up / ask / learn; Account = me /
// credits & limits / membership / my key.
//
// icon is a name (not a component reference): these arrays are imported by
// server layouts and passed as props to the client SubNav, and function/
// component values aren't serializable across that boundary.
export const HELP_NAV: SubNavItem[] = [
  { href: "/help", label: { ko: "도움말 홈", en: "Help home" }, icon: "life-buoy", exact: true },
  { href: "/help/faq", label: { ko: "자주 묻는 질문", en: "FAQ" }, icon: "circle-help" },
  { href: "/help/contact", label: { ko: "고객센터", en: "Customer service" }, icon: "headset" },
  { href: "/help/api-guide", label: { ko: "API 키 설명서", en: "API key manual" }, icon: "book-open-text" },
  { href: "/help/whats-new", label: { ko: "새로운 점", en: "What's new" }, icon: "sparkle" },
];

export const ACCOUNT_NAV: SubNavItem[] = [
  { href: "/account", label: { ko: "내 계정", en: "My account" }, icon: "user-round", exact: true },
  { href: "/account/credits", label: { ko: "크레딧·한도", en: "Credits & limits" }, icon: "circle-gauge" },
  { href: "/account/membership", label: { ko: "학생 멤버십", en: "Student membership" }, icon: "crown" },
  { href: "/account/api-key", label: { ko: "내 API 키", en: "My API key" }, icon: "key-round" },
];
