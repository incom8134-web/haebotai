"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useBi } from "@/lib/i18n/context";

// A notice, not a consent prompt: the site only uses the sign-in cookie
// and on-device settings (lib/site/legal.ts — COOKIES), so there is
// nothing to accept or reject. It says so once and stays dismissed. If an
// analytics or ad tool is ever added, this must become a real opt-in
// banner that blocks those scripts until the visitor agrees.
//
// Being a notice, showing it once is enough: it is marked seen as soon as
// it appears (gone on the next page) and it is a slim strip that sits
// above the phone tab bar instead of covering buttons like "Run".

const KEY = "haebot-cookie-notice";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function CookieNotice() {
  const L = useBi();
  // Server and first client render: treat as dismissed, so nothing flashes.
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  useEffect(() => {
    if (dismissed) return;
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }, [dismissed]);
  if (dismissed) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((l) => l());
  };
  return (
    <section
      aria-label={L({ ko: "쿠키 안내", en: "Cookie notice" })}
      className="glass-strong fixed inset-x-3 bottom-[calc(max(12px,env(safe-area-inset-bottom))+84px)] z-50 mx-auto flex max-w-[560px] items-center gap-3 rounded-2xl px-4 py-2.5 text-xs shadow-lg lg:right-auto lg:bottom-4 lg:left-4 lg:mx-0"
    >
      <p className="min-w-0 flex-1 leading-relaxed break-keep text-fg">
        {L({ ko: "로그인 쿠키와 화면 설정만 저장하고, 분석·광고 쿠키는 쓰지 않아요.", en: "Only the sign-in cookie and display settings — no analytics or ad cookies." })}{" "}
        <Link href="/legal/cookies" className="text-fg-muted underline underline-offset-2 hover:text-fg">
          {L({ ko: "쿠키 정책", en: "Cookie policy" })}
        </Link>
      </p>
      <button type="button" onClick={close} className="h-8 shrink-0 rounded-full bg-fg px-3.5 text-xs font-semibold text-bg">
        {L({ ko: "확인", en: "OK" })}
      </button>
    </section>
  );
}
