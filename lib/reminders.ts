// In-app reminders for paid members (the shell's banner row): the plan
// ends within 3 days, or credits are running low. There is no email
// sender yet, so the app is where members hear it. Ids carry the state
// they describe, so dismissing hides a reminder until that state changes
// (ShellNotices keeps dismissed announcement ids per browser).

import { PRODUCTS } from "./payments/pro.ts";

type Bi = { ko: string; en: string };
export interface Reminder {
  id: string;
  tone: "info" | "warning";
  title: Bi;
  body: Bi;
  link: string;
}

export const REMINDER = { endingDays: 3, lowCreditShare: 0.1 } as const;

export function planReminders(m: { plan: string; expiresAt: string | null; daysLeft: number | null }, balance: number | null): Reminder[] {
  if (m.plan !== "plus" && m.plan !== "pro") return [];
  const out: Reminder[] = [];
  const name = m.plan === "pro" ? { ko: "프로", en: "Pro" } : { ko: "플러스", en: "Plus" };
  if (m.daysLeft !== null && m.daysLeft <= REMINDER.endingDays) {
    out.push({
      id: `r:ending:${m.expiresAt?.slice(0, 10) ?? ""}`,
      tone: "warning",
      title: { ko: m.daysLeft <= 1 ? `${name.ko} 플랜이 오늘 끝나요` : `${name.ko} 플랜이 ${m.daysLeft}일 뒤 끝나요`, en: m.daysLeft <= 1 ? `Your ${name.en} plan ends today` : `Your ${name.en} plan ends in ${m.daysLeft} days` },
      body: { ko: "자동 결제가 없어요. 지금 연장하면 남은 기간에 30일이 이어 붙어요.", en: "There's no auto-renewal. Extend now and 30 days are added to what's left." },
      link: `/account/membership/checkout?product=${m.plan}`,
    });
  }
  const monthly = PRODUCTS[m.plan].credits;
  if (balance !== null && balance < monthly * REMINDER.lowCreditShare) {
    out.push({
      id: `r:low:${m.expiresAt?.slice(0, 10) ?? ""}`,
      tone: "info",
      title: { ko: `크레딧이 ${balance.toLocaleString("ko-KR")} 남았어요`, en: `${balance.toLocaleString("en-US")} credits left` },
      body: { ko: `${PRODUCTS.topup.credits} 크레딧을 ₩${PRODUCTS.topup.amount.toLocaleString("ko-KR")}에 충전할 수 있어요. 충전한 크레딧은 유효기간이 없어요.`, en: `Top up ${PRODUCTS.topup.credits} credits for ₩${PRODUCTS.topup.amount.toLocaleString("en-US")}. Top-up credits never expire.` },
      link: "/account/membership/checkout?product=topup",
    });
  }
  return out;
}
