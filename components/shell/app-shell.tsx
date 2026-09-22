"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CircleHelp, CircleUserRound, Coins, LayoutGrid, Library, Moon, Search, Sparkles, Sun, UserRound, Zap, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { CommandPalette, type CommandPaletteGroup } from "@/components/command-palette";
import { listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { PATCH_NOTES } from "@/lib/site/patch-notes";
import { useLocalList } from "@/lib/hooks/use-local-list";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { CategoryId, ToolManifest } from "@/lib/tools/types";
import type { PlanId } from "@/lib/site/plans";
import { cn } from "@/lib/utils";

// Haebot's own shell: content first, navigation as a floating liquid-glass
// dock on the RIGHT edge (bottom tab bar on phones), and a small floating
// brand + search cluster at the top. No sidebar tree, no quick-link bar —
// tools are browsed on /tools and found with ⌘K.

export interface ShellProps {
  user: { email: string } | null;
  balance: number | null;
  plan: PlanId;
  answeredTickets: number;
  children: React.ReactNode;
}

type Item = { href: string; label: { ko: string; en: string }; icon: LucideIcon; match: (p: string) => boolean };

const ITEMS: Item[] = [
  { href: "/studio", label: { ko: "스튜디오", en: "Studio" }, icon: Sparkles, match: (p) => p === "/studio" },
  { href: "/tools", label: { ko: "도구", en: "Tools" }, icon: LayoutGrid, match: (p) => p.startsWith("/tools") },
  { href: "/links", label: { ko: "바로가기", en: "Quick links" }, icon: Zap, match: (p) => p.startsWith("/links") },
  { href: "/library", label: { ko: "보관함", en: "Library" }, icon: Library, match: (p) => p.startsWith("/library") },
  { href: "/brand", label: { ko: "브랜드", en: "Brand" }, icon: UserRound, match: (p) => p.startsWith("/brand") },
  { href: "/help", label: { ko: "도움말", en: "Help" }, icon: CircleHelp, match: (p) => p.startsWith("/help") },
  { href: "/account", label: { ko: "계정", en: "Account" }, icon: CircleUserRound, match: (p) => p.startsWith("/account") },
];

const MOBILE = ["/studio", "/tools", "/library", "/help", "/account"];
const CATEGORY_ORDER: CategoryId[] = ["ideas", "content", "design", "sales", "docs"];

function useHelpBadge(answeredTickets: number) {
  const seen = useLocalList("haebot-help-seen");
  const latest = `v${PATCH_NOTES[0]?.version}`;
  const tickets = `tickets-${answeredTickets}`;
  const unseen = (!seen.has(latest) ? 1 : 0) + (answeredTickets > 0 && !seen.has(tickets) ? 1 : 0);
  return { unseen, markSeen: () => seen.set([...new Set([...seen.list, latest, tickets])]) };
}

function DockButton({ item, active, badge, onClick }: { item: Item; active: boolean; badge?: boolean; onClick?: () => void }) {
  const L = useBi();
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={L(item.label)}
      className="group relative grid size-12 place-items-center rounded-2xl text-fg-muted outline-none transition-colors duration-300 hover:text-fg focus-visible:ring-2 focus-visible:ring-studio-cyan"
    >
      {active ? (
        <motion.span
          layoutId="dock-active"
          className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklch,var(--studio-cyan)_30%,transparent),color-mix(in_oklch,var(--studio-violet)_30%,transparent))] shadow-[inset_0_1px_0_oklch(1_0_0/25%),0_8px_24px_-8px_var(--studio-violet)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      <item.icon size={20} strokeWidth={1.8} className={cn("relative transition-transform duration-500 ease-[var(--spring)] group-hover:scale-110", active && "text-fg")} aria-hidden />
      {badge ? <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-studio-cyan shadow-[0_0_10px_var(--studio-cyan)]" aria-hidden /> : null}
      {/* Label slides out to the LEFT of the right-side dock. */}
      <span className="glass-strong pointer-events-none absolute top-1/2 right-[calc(100%+12px)] translate-x-2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap text-fg opacity-0 transition-all duration-300 ease-[var(--ease-glide)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
        {L(item.label)}
      </span>
    </Link>
  );
}

function ThemeLangControls({ vertical }: { vertical?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const L = useBi();
  // The theme is only known in the browser; render a neutral icon on the
  // server pass so hydration never mismatches.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dark = resolvedTheme !== "light";
  return (
    <div className={cn("flex items-center gap-1", vertical && "flex-col")}>
      <button
        type="button"
        onClick={() => setTheme(dark ? "light" : "dark")}
        aria-label={dark ? L({ ko: "라이트 모드", en: "Light mode" }) : L({ ko: "다크 모드", en: "Dark mode" })}
        className="grid size-10 place-items-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
        suppressHydrationWarning
      >
        {!mounted ? <span className="size-[17px]" aria-hidden /> : dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
      </button>
      <button
        type="button"
        onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
        aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
        className="grid size-10 place-items-center rounded-xl text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
      >
        {locale === "ko" ? "EN" : "한"}
      </button>
    </div>
  );
}

function AppShell({ user, balance, plan, answeredTickets, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const L = useBi();
  const { locale } = useLocale();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const help = useHelpBadge(answeredTickets);

  const paletteGroups: CommandPaletteGroup[] = useMemo(() => {
    const byCat = new Map<CategoryId, ToolManifest[]>();
    for (const tool of listTools()) byCat.set(tool.category, [...(byCat.get(tool.category) ?? []), tool]);
    return [
      ...CATEGORY_ORDER.map((cat) => ({
        heading: CATEGORY_LABELS[cat][locale],
        items: (byCat.get(cat) ?? []).map((tool) => ({
          id: tool.id,
          label: `${locale === "en" ? tool.name_en : tool.name_ko} — ${tool.summary}`,
          icon: tool.icon,
          onSelect: () => router.push(`/tools/${tool.id}`),
        })),
      })),
      {
        heading: locale === "en" ? "Go to" : "이동",
        items: ITEMS.map((item) => ({ id: item.href, label: item.label[locale], icon: item.icon, onSelect: () => router.push(item.href) })),
      },
    ];
  }, [locale, router]);

  const credits = plan === "student" ? "∞" : balance !== null ? balance.toLocaleString() : "—";

  return (
    <div className="relative min-h-dvh">
      <div className="app-backdrop" aria-hidden>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      {/* Floating top cluster: brand chip + search pill. */}
      <div className="pointer-events-none sticky top-0 z-30 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-3 md:px-6 lg:pr-28">
        {/* Soft fade so page content scrolling under the chips never reads as overlap. */}
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[88px] bg-gradient-to-b from-bg via-bg/80 to-transparent" />
        <div className="mx-auto flex max-w-[1240px] items-center gap-2">
          <Link href="/studio" className="glass pointer-events-auto flex h-11 items-center gap-2.5 rounded-2xl pr-4 pl-1.5">
            <span className="studio-gradient-bg grid size-8 place-items-center rounded-xl font-display text-base font-bold text-white">H</span>
            <span className="text-sm font-bold tracking-[-0.02em]">해봇 AI</span>
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="glass pointer-events-auto ml-auto flex h-11 min-w-0 items-center gap-2.5 rounded-2xl px-4 text-sm text-fg-subtle transition-colors hover:text-fg sm:w-72"
          >
            <Search size={15} aria-hidden />
            <span className="hidden truncate sm:inline">{L({ ko: "도구 찾기", en: "Find a tool" })}</span>
            <kbd className="ml-auto hidden rounded-md border border-hairline px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
          <Link href="/account/credits" className="glass pointer-events-auto flex h-11 items-center gap-2 rounded-2xl px-3.5 font-mono text-xs lg:hidden" aria-label={L({ ko: "크레딧", en: "Credits" })}>
            <Coins size={14} className="text-studio-cyan" aria-hidden /> {credits}
          </Link>
        </div>
      </div>

      <main className="pb-28 lg:pr-24 lg:pb-10">{children}</main>

      {/* Right-side dock (desktop). */}
      <nav aria-label={L({ ko: "주 메뉴", en: "Main" })} className="glass-strong fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-[28px] p-2 lg:flex">
        {ITEMS.map((item) => (
          <DockButton
            key={item.href}
            item={item}
            active={item.match(pathname)}
            badge={item.href === "/help" && help.unseen > 0}
            onClick={item.href === "/help" ? help.markSeen : undefined}
          />
        ))}
        <span className="my-1 h-px w-8 bg-hairline" aria-hidden />
        <Link href="/account/credits" className="grid w-12 place-items-center gap-0.5 rounded-2xl py-2 text-studio-cyan" aria-label={`${L({ ko: "크레딧", en: "Credits" })} ${credits}`}>
          <Coins size={16} aria-hidden />
          <span className="font-mono text-[10px] text-fg-muted">{credits}</span>
        </Link>
        <ThemeLangControls vertical />
        {!user ? (
          <Link href="/auth" className="studio-gradient-bg mt-1 grid size-12 place-items-center rounded-2xl text-[11px] font-semibold text-white">
            {L({ ko: "로그인", en: "Sign in" })}
          </Link>
        ) : null}
      </nav>

      {/* Bottom tab bar (phones/tablets). */}
      <nav
        aria-label={L({ ko: "주 메뉴", en: "Main" })}
        className="glass-strong fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 flex items-center justify-around rounded-[26px] p-1.5 lg:hidden"
      >
        {ITEMS.filter((i) => MOBILE.includes(i.href)).map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/help" ? help.markSeen : undefined}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] text-fg-muted"
            >
              {active ? <motion.span layoutId="tab-active" className="absolute inset-0 rounded-2xl bg-surface-2/70" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <item.icon size={19} className={cn("relative", active && "text-studio-cyan")} aria-hidden />
              <span className={cn("relative", active && "text-fg")}>{L(item.label)}</span>
              {item.href === "/help" && help.unseen > 0 ? <span className="absolute top-1.5 right-[30%] size-1.5 rounded-full bg-studio-cyan" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>

      <CommandPalette groups={paletteGroups} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export { AppShell, ThemeLangControls };
