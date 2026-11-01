"use client";

import Link from "next/link";
import { KeyRound, PlayCircle } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// The Free plan's headline offer, made hard to miss: every tool runs free on
// the member's own Gemini API key (lib/site/access.ts FREE_OWN_KEY). Shown on
// pricing, the landing page's pricing section and the Studio for Free members.

export function FreeKeyBanner({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const L = useBi();
  return (
    <section
      aria-labelledby="free-key-banner"
      className={cn("relative overflow-hidden rounded-[28px] border-2 border-studio-cyan/50 bg-studio-cyan/10 p-6 md:p-8", className)}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="studio-gradient-bg grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-10px_var(--studio-violet)]" aria-hidden>
            <KeyRound size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-studio-cyan">{L({ ko: "무료 플랜", en: "FREE PLAN" })}</p>
            <h2 id="free-key-banner" className="mt-1 font-display text-[clamp(1.35rem,2.6vw,1.9rem)] leading-tight font-bold break-keep text-fg">
              {L({ ko: "내 Gemini API 키만 있으면 16개 도구를 모두 무료로 써요", en: "Use all 16 tools free with your own Gemini API key" })}
            </h2>
            <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
              {L({
                ko: "Google AI Studio에서 키를 무료로 받아 등록하면 끝이에요. 크레딧이 들지 않고, AI 사용료가 생기면 해바가 아니라 내 Google 계정으로 청구돼요. 키 없이 쓰고 싶다면 플러스·프로를 고르세요.",
                en: "Get a free key in Google AI Studio and add it, and you're set. No credits are used; any AI usage is billed to your own Google account, not Haeba. Rather not use a key? Choose Plus or Pro.",
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-stretch">
          <Link href={signedIn ? "/account/api-key" : "/auth?next=%2Faccount%2Fapi-key"} className={cn(primaryButton, "h-11 px-5")}>
            <KeyRound size={16} aria-hidden /> {signedIn ? L({ ko: "API 키 등록하기", en: "Add my API key" }) : L({ ko: "무료로 시작하기", en: "Start free" })}
          </Link>
          <Link href="/help/api-guide#video" className={cn(secondaryButton, "h-11 px-5")}>
            <PlayCircle size={16} aria-hidden /> {L({ ko: "키 받는 방법 (영상)", en: "How to get a key (video)" })}
          </Link>
        </div>
      </div>
    </section>
  );
}
