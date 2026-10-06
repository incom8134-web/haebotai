"use client";

import Link from "next/link";
import { ExternalLink, KeyRound, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Pricing while members bring their own API key (lib/site/access.ts):
// Haebot sells no credits for now; the AI runs on the
// member's own Google AI Studio key, billed by Google to their account.
// Shared by the landing page and /pricing.

const STEPS = [
  {
    icon: KeyRound,
    title: { ko: "1. 내 키 발급", en: "1. Get your key" },
    body: { ko: "Google AI Studio에 Google 계정으로 로그인해 API 키를 만들어요. 5분이면 끝나요.", en: "Sign in to Google AI Studio with your Google account and create an API key. About 5 minutes." },
  },
  {
    icon: ShieldCheck,
    title: { ko: "2. 해봇에 등록", en: "2. Add it to Haebot" },
    body: { ko: "계정 → 내 API 키에 붙여 넣으면 Google에 확인한 뒤 암호화해 저장해요.", en: "Paste it under Account → My API key. We check it with Google, then store it encrypted." },
  },
  {
    icon: Sparkles,
    title: { ko: "3. 모든 도구 사용", en: "3. Use every tool" },
    body: { ko: "25개 도구가 모두 내 키로 실행돼요. 앞 도구의 결과가 다음 도구로 이어져요.", en: "All 25 tools run on your key, and each result carries into the next tool." },
  },
];

export function OwnKeyPricing({ signedIn }: { signedIn: boolean }) {
  const L = useBi();
  return (
    <div className="rounded-[28px] border border-hairline bg-surface p-5 md:p-7">
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.title.en} className="rounded-[20px] border border-hairline bg-bg p-4">
            <s.icon size={18} className="text-accent" aria-hidden />
            <p className="mt-3 font-semibold break-keep text-fg">{L(s.title)}</p>
            <p className="mt-1.5 text-sm leading-relaxed break-keep text-fg-muted">{L(s.body)}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed break-keep text-fg-muted">
        <ReceiptText size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        {L({
          ko: "AI 사용 요금은 Google이 내 Google 계정으로 직접 청구해요. 사용 한도와 요금은 Google AI Studio에서 확인하고, 예산 알림을 걸어 두면 안심이에요.",
          en: "AI usage is billed by Google to your own Google account. Check Google's usage limits and prices in Google AI Studio, and set a budget alert for peace of mind.",
        })}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={signedIn ? "/account/api-key" : "/auth"} className={cn(primaryButton, "h-11 px-5")}>
          {signedIn ? L({ ko: "API 키 등록하기", en: "Add my API key" }) : L({ ko: "시작하기", en: "Get started" })}
        </Link>
        <Link href="/help/api-guide" className={cn(secondaryButton, "h-11 px-5")}>
          {L({ ko: "키 발급 방법", en: "How to get a key" })}
        </Link>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={cn(secondaryButton, "h-11 px-5")}>
          Google AI Studio <ExternalLink size={14} aria-hidden />
        </a>
      </div>
    </div>
  );
}
