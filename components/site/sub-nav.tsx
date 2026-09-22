"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { BookOpenText, CircleGauge, CircleHelp, Crown, Headset, KeyRound, LifeBuoy, Sparkle, UserRound } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ICONS = {
  "life-buoy": LifeBuoy,
  "circle-help": CircleHelp,
  headset: Headset,
  "book-open-text": BookOpenText,
  sparkle: Sparkle,
  "user-round": UserRound,
  "circle-gauge": CircleGauge,
  crown: Crown,
  "key-round": KeyRound,
};

// Glass section navigation for multi-page areas (Help, Account). Each item
// is its own URL; the pill glides between them.
export interface SubNavItem {
  href: string;
  label: { ko: string; en: string };
  icon: keyof typeof ICONS;
  exact?: boolean;
}

export function SubNav({ items, id }: { items: SubNavItem[]; id: string }) {
  const pathname = usePathname();
  const L = useBi();
  return (
    <LayoutGroup id={id}>
      <nav aria-label={id} className="glass mb-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-300", active ? "text-fg" : "text-fg-muted hover:text-fg")}
            >
              {active ? (
                <motion.span
                  layoutId="subnav-pill"
                  className="absolute inset-0 rounded-xl bg-[color-mix(in_oklch,var(--studio-cyan)_16%,var(--glass-tint-strong))] shadow-[inset_0_1px_0_var(--glass-rim)]"
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                />
              ) : null}
              <Icon size={14} className="relative" aria-hidden />
              <span className="relative">{L(item.label)}</span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
