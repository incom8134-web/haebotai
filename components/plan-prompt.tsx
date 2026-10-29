"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { PRODUCTS } from "@/lib/payments/pro";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// SaaS mode (lib/site/access.ts): shown to a signed-in member without
// Plus or Pro when they try to run a tool — on pressing Run, and on
// Quick start's Make. Free accounts browse; running needs a plan.

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export function PlanPrompt({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const L = useBi();
  const plans = [
    { id: "plus" as const, name: { ko: "플러스", en: "Plus" } },
    { id: "pro" as const, name: { ko: "프로", en: "Pro" } },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-[24px] p-6 sm:max-w-md">
        <span className="studio-gradient-bg mb-4 grid size-12 place-items-center rounded-2xl text-white" aria-hidden>
          <Crown size={22} />
        </span>
        <DialogTitle className="text-xl font-bold break-keep">{L({ ko: "실행은 플러스부터예요", en: "Running tools starts with Plus" })}</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "무료 플랜은 도구와 예시를 둘러볼 수 있어요. 플랜을 고르면 받은 크레딧으로 25개 도구를 모두 실행할 수 있어요.",
            en: "The Free plan lets you browse tools and examples. Pick a plan and its credits run all 25 tools.",
          })}
        </DialogDescription>
        <ul className="mt-4 space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-hairline px-4 py-3 text-sm">
              <span className="font-semibold">{L(p.name)}</span>
              <span className="text-fg-muted">
                {won(PRODUCTS[p.id].amount)} · {L({ ko: `${PRODUCTS[p.id].credits.toLocaleString()} 크레딧 / 30일`, en: `${PRODUCTS[p.id].credits.toLocaleString()} credits / 30 days` })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/pricing" className={cn(secondaryButton, "h-11 flex-1 font-semibold")}>
            {L({ ko: "요금 자세히", en: "See pricing" })}
          </Link>
          <Link href="/account/membership/checkout?product=plus" className={cn(primaryButton, "h-11 flex-1")}>
            <Crown size={16} aria-hidden /> {L({ ko: "플러스 시작하기", en: "Get Plus" })}
          </Link>
        </div>
        <button type="button" onClick={() => onOpenChange(false)} className="mx-auto mt-3 text-xs text-fg-subtle hover:text-fg">
          {L({ ko: "더 둘러볼게요", en: "Keep browsing" })}
        </button>
      </DialogContent>
    </Dialog>
  );
}
