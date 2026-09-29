"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { useLocalValue } from "@/lib/hooks/use-local-list";
import { cn } from "@/lib/utils";

// First-run checklist, derived from real account state (no tracking): a
// business profile, a first finished run, and a second tool tried. Hides
// itself when done or dismissed.
export function OnboardingChecklist({ hasProfile, runs, distinctTools }: { hasProfile: boolean; runs: number; distinctTools: number }) {
  const L = useBi();
  const [dismissed, setDismissed] = useLocalValue("haebot-onboarding-dismissed");
  const steps = [
    { done: hasProfile, href: "/brand", title: { ko: "비즈니스 프로필 만들기", en: "Create your business profile" }, body: { ko: "업종·고객·말투를 한 번 적으면 모든 도구가 읽어요.", en: "Write industry, customers and voice once; every tool reads it." } },
    { done: runs > 0, href: "/tools", title: { ko: "첫 도구 실행하기", en: "Run your first tool" }, body: { ko: "가입 크레딧 500으로 바로 해 볼 수 있어요.", en: "Your 500 sign-up credits cover it." } },
    { done: distinctTools >= 2, href: "/use-cases", title: { ko: "결과를 다음 도구로 이어 쓰기", en: "Chain a result into another tool" }, body: { ko: "결과 아래 '이어서 만들기'로 두 번째 도구를 써 보세요.", en: "Use 'Continue with…' under a result to try a second tool." } },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  return (
    <section className="glass mb-7 rounded-[24px] p-5" aria-labelledby="onboarding-title">
      <div className="flex items-center justify-between gap-3">
        <p id="onboarding-title" className="font-semibold">{L({ ko: "시작 가이드", en: "Getting started" })} <span className="ml-1 font-mono text-xs text-fg-subtle">{doneCount}/{steps.length}</span></p>
        <button type="button" onClick={() => setDismissed("1")} aria-label={L({ ko: "시작 가이드 닫기", en: "Dismiss getting started" })} className="grid size-7 place-items-center rounded-lg text-fg-muted hover:bg-surface-2/60 hover:text-fg">
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2/60">
        <div className="h-full rounded-full bg-studio-cyan/70 transition-[width] duration-700" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} className={cn("flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2/50", s.done && "opacity-60")}>
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-2xs", s.done ? "border-studio-success bg-studio-success text-white" : "border-hairline-str text-fg-muted")}>
                {s.done ? <Check size={12} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium", s.done && "line-through")}>{L(s.title)}</span>
                <span className="block text-xs break-keep text-fg-muted">{L(s.body)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
