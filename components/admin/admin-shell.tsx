"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, Headset, LayoutDashboard, Menu, Search, Users, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-mark";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// The /admin frame, after CoolAdmin: a dark sidebar with the sections, a
// top bar with member search and who's signed in, and a light canvas. On
// phones the sidebar slides in from the menu button.

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: { ko: "대시보드", en: "Dashboard" }, exact: true },
  { href: "/admin/members", icon: Users, label: { ko: "회원 관리", en: "Members" } },
  { href: "/admin/tools", icon: BarChart3, label: { ko: "도구 사용 현황", en: "Tool usage" } },
  { href: "/admin/tickets", icon: Headset, label: { ko: "고객 문의", en: "Support" }, badge: "tickets" as const },
];

export function AdminShell({ staff, openTickets, children }: { staff: { email: string; name: string | null }; openTickets: number; children: React.ReactNode }) {
  const L = useBi();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label={L({ ko: "관리자 메뉴", en: "Admin menu" })} className="flex h-full flex-col bg-[#161b2e] text-[#c6cbe0]">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="rounded-lg bg-white px-2 py-1">
          <BrandLogo height={18} />
        </span>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">ADMIN</span>
      </div>
      <p className="px-5 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{L({ ko: "운영", en: "Operations" })}</p>
      <ul className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const on = active(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors", on ? "bg-[#3b6fe3] text-white shadow-[0_6px_20px_-8px_rgba(59,111,227,.8)]" : "hover:bg-white/[0.06] hover:text-white")}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span className="flex-1">{L(item.label)}</span>
                {item.badge === "tickets" && openTickets > 0 ? <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{openTickets}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-white/[0.07] p-3">
        <Link href="/studio" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="size-4" aria-hidden />
          {L({ ko: "서비스로 돌아가기", en: "Back to the app" })}
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="relative isolate flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={L({ ko: "메뉴 닫기", en: "Close menu" })} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-2xl">
            {sidebar}
            <button type="button" onClick={() => setOpen(false)} aria-label={L({ ko: "메뉴 닫기", en: "Close menu" })} className="absolute top-4 right-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10">
              <X className="size-5" />
            </button>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur md:px-8">
          <button type="button" onClick={() => setOpen(true)} aria-label={L({ ko: "메뉴 열기", en: "Open menu" })} className="rounded-lg p-2 text-fg-muted hover:bg-surface-2 lg:hidden">
            <Menu className="size-5" />
          </button>
          <form action="/admin/members" className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              name="q"
              placeholder={L({ ko: "회원 검색 (이름·이메일·카카오 ID)", en: "Search members (name, email, Kakao ID)" })}
              aria-label={L({ ko: "회원 검색", en: "Search members" })}
              className="h-10 w-full rounded-xl border border-hairline bg-surface-2/60 pr-3 pl-9 text-sm outline-none focus:border-accent"
            />
          </form>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold text-fg">{staff.name ?? L({ ko: "관리자", en: "Admin" })}</span>
              <span className="block text-xs text-fg-subtle">{staff.email}</span>
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-[#3b6fe3] text-sm font-bold text-white">{(staff.name ?? staff.email).slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
        <footer className="px-8 pb-6 text-center text-xs text-fg-subtle">
          {L({ ko: "관리자 전용 화면 · 모든 변경은 감사 로그에 남아요", en: "Staff only · every change is written to the audit log" })}
        </footer>
      </div>
    </div>
  );
}

/** Page title row: title, lead and actions on the right (CoolAdmin's "Dashboard / Welcome back"). */
export function AdminPageHeader({ title, lead, actions }: { title: string; lead?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-bold text-fg">{title}</h1>
        {lead ? <p className="mt-1 text-[15px] text-fg-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
