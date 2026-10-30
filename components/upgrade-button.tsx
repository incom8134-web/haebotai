"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { PRODUCTS } from "@/lib/payments/pro";
import { SAAS } from "@/lib/site/access";
import { cn } from "@/lib/utils";

// The one "upgrade" call to action, used in the top bar, the account
// menu, the dock, the studio, tool pages and the account pages (SaaS mode,
// lib/site/access.ts). Free → compare plans; Plus → straight to Pro
// checkout; Pro and hosts see nothing.

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export type UpgradeTarget = { to: "plus" | "pro"; href: string; label: { ko: string; en: string }; short: { ko: string; en: string }; pitch: { ko: string; en: string } } | null;

/** Where an upgrade button should lead for this member, or null when there's nothing to upgrade to. */
export function upgradeTarget(plan: string | null | undefined, host = false): UpgradeTarget {
  if (!SAAS || host) return null;
  if (plan === "pro") return null;
  if (plan === "plus")
    return {
      to: "pro",
      href: "/account/membership/checkout?product=pro",
      label: { ko: "프로로 업그레이드", en: "Upgrade to Pro" },
      short: { ko: "프로로", en: "Go Pro" },
      pitch: { ko: `프로는 ${won(PRODUCTS.pro.amount)}에 ${PRODUCTS.pro.credits.toLocaleString()} 크레딧 — 플러스의 3배예요`, en: `Pro: ${PRODUCTS.pro.credits.toLocaleString()} credits for ${won(PRODUCTS.pro.amount)} — 3× Plus` },
    };
  return {
    to: "plus",
    href: "/pricing",
    label: { ko: "업그레이드", en: "Upgrade" },
    short: { ko: "업그레이드", en: "Upgrade" },
    pitch: { ko: `플러스 ${won(PRODUCTS.plus.amount)}/30일 — ${PRODUCTS.plus.credits.toLocaleString()} 크레딧으로 16개 도구를 모두 실행해요`, en: `Plus ${won(PRODUCTS.plus.amount)} / 30 days — ${PRODUCTS.plus.credits.toLocaleString()} credits for all 16 tools` },
  };
}

/** Gradient "Upgrade" pill. `size="sm"` for bars and menus. */
export function UpgradeButton({ plan, host = false, size = "md", className, short = false }: { plan: string | null | undefined; host?: boolean; size?: "sm" | "md"; className?: string; short?: boolean }) {
  const L = useBi();
  const t = upgradeTarget(plan, host);
  if (!t) return null;
  return (
    <Link
      href={t.href}
      className={cn(
        "studio-gradient-bg inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl font-semibold whitespace-nowrap text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%),0_10px_24px_-12px_var(--studio-violet)] transition-transform duration-500 ease-[var(--spring)] hover:-translate-y-0.5",
        size === "sm" ? "h-11 px-3.5 text-xs" : "h-11 px-5 text-sm",
        className,
      )}
    >
      <Crown size={size === "sm" ? 14 : 16} aria-hidden /> {L(short ? t.short : t.label)}
    </Link>
  );
}

/** A card with the pitch and the button, for the studio and account pages. */
export function UpgradeCard({ plan, host = false, className }: { plan: string | null | undefined; host?: boolean; className?: string }) {
  const L = useBi();
  const t = upgradeTarget(plan, host);
  if (!t) return null;
  return (
    <section className={cn("flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-accent/40 bg-accent-dim p-5", className)} aria-label={L(t.label)}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold break-keep text-fg">
          <Crown size={16} className="text-accent" aria-hidden /> {t.to === "pro" ? L({ ko: "더 많이 만들려면 프로", en: "Make more with Pro" }) : L({ ko: "실행은 플러스부터", en: "Running starts with Plus" })}
        </p>
        <p className="mt-1 text-sm break-keep text-fg-muted">{L(t.pitch)}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {t.to === "plus" ? (
          <Link href="/account/membership/checkout?product=plus" className="inline-flex h-11 items-center rounded-2xl border border-hairline bg-surface px-4 text-sm font-semibold text-fg hover:bg-surface-2">
            {L({ ko: "플러스 바로 결제", en: "Get Plus now" })}
          </Link>
        ) : null}
        <UpgradeButton plan={plan} host={host} />
      </div>
    </section>
  );
}
