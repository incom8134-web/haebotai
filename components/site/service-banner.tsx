"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CircleAlert, Info, PartyPopper, PauseCircle, X } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// Banners staff control from /admin: maintenance or a paused tool (shown
// on the run page), site announcements, and notices sent to one member.
// Messages written in /admin are shown as written.

type Bi = { ko: string; en: string };
const TONES = {
  info: { box: "border-accent/30 bg-accent/[0.07] text-fg", icon: Info, iconCls: "text-accent" },
  warning: { box: "border-studio-warning/40 bg-studio-warning/10 text-fg", icon: CircleAlert, iconCls: "text-studio-warning" },
  success: { box: "border-studio-success/35 bg-studio-success/10 text-fg", icon: PartyPopper, iconCls: "text-studio-success" },
  paused: { box: "border-danger/30 bg-danger/[0.06] text-fg", icon: PauseCircle, iconCls: "text-danger" },
} as const;

export function ServiceBanner({ tone, title, body, link, linkLabel, onDismiss, className }: { tone: keyof typeof TONES; title: string; body?: string; link?: string | null; linkLabel?: Bi; onDismiss?: () => void; className?: string }) {
  const L = useBi();
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "paused" || tone === "warning" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", t.box, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", t.iconCls)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold break-keep">{title}</p>
        {body ? <p className="mt-0.5 whitespace-pre-line text-fg-muted break-keep">{body}</p> : null}
        {link ? (
          <Link href={link} className="mt-1 inline-block font-semibold text-accent underline underline-offset-2">
            {L(linkLabel ?? { ko: "바로 가기", en: "Open" })}
          </Link>
        ) : null}
      </div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label={L({ ko: "닫기", en: "Dismiss" })} className="rounded-lg p-1 text-fg-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Run page: maintenance or this tool paused. Not dismissible — the run button won't work. */
export function RunBlockedBanner({ reason, message }: { reason: "maintenance" | "paused"; message: string }) {
  const L = useBi();
  return (
    <ServiceBanner
      tone="paused"
      className="mx-auto mb-4 max-w-[1100px]"
      title={reason === "maintenance" ? L({ ko: "서비스 점검 중", en: "Under maintenance" }) : L({ ko: "이 도구는 잠시 중지됐어요", en: "This tool is paused" })}
      body={message}
    />
  );
}

const HIDDEN_KEY = "haeba.hiddenAnnouncements";

// Dismissed banners live in localStorage (per browser). Read through an
// external store so the server render ("nothing hidden") and the browser
// agree on the first paint.
const listeners = new Set<() => void>();
function subscribeHidden(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readHidden(): string {
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function parseIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeHidden(ids: string[]) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // private mode: hidden until the next visit only
  }
  listeners.forEach((l) => l());
}

export interface ShellNotice {
  id: string;
  source: "notice" | "announcement";
  tone: "info" | "warning" | "success";
  title: Bi;
  body: Bi;
  link: string | null;
}

/**
 * Top of every app page: site announcements and this member's notices.
 * A notice is marked read on the server when dismissed; an announcement
 * is hidden in this browser (localStorage) until it changes.
 */
export function ShellNotices({ items, dismissNotice }: { items: ShellNotice[]; dismissNotice: (id: string) => Promise<void> }) {
  const L = useBi();
  const raw = useSyncExternalStore(subscribeHidden, readHidden, () => "[]");
  const hidden = new Set(parseIds(raw));
  const visible = items.filter((i) => !hidden.has(i.id));
  if (!visible.length) return null;
  const hide = (item: ShellNotice) => {
    writeHidden([...hidden, item.id]);
    if (item.source === "notice") void dismissNotice(item.id);
  };

  return (
    <div className="mx-auto mb-4 flex max-w-[1100px] flex-col gap-2 px-4 pt-4 md:px-8">
      {visible.map((i) => (
        <ServiceBanner key={i.id} tone={i.tone} title={L(i.title)} body={L(i.body)} link={i.link} onDismiss={() => hide(i)} />
      ))}
    </div>
  );
}
