"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useBi } from "@/lib/i18n/context";

// A notice, not a consent prompt: the site only uses the sign-in cookie
// and on-device settings (lib/site/legal.ts — COOKIES), so there is
// nothing to accept or reject. It says so once and stays dismissed. If an
// analytics or ad tool is ever added, this must become a real opt-in
// banner that blocks those scripts until the visitor agrees.

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
  if (dismissed) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((l) => l());
  };
  return (
    <section aria-label={L({ ko: "쿠키 안내", en: "Cookie notice" })} className="glass-strong fixed bottom-4 left-4 z-50 max-w-[360px] rounded-2xl p-4 text-sm shadow-lg">
      <p className="leading-relaxed break-keep text-fg">
        {L({ ko: "로그인 유지에 필요한 쿠키와 화면 설정만 저장해요. 방문 분석·광고 쿠키는 쓰지 않아요.", en: "We only store the sign-in cookie and your display settings. No analytics or ad cookies." })}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={close} className="h-9 rounded-full bg-fg px-4 text-sm font-semibold text-bg">
          {L({ ko: "확인", en: "Got it" })}
        </button>
        <Link href="/legal/cookies" className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg">
          {L({ ko: "쿠키 정책", en: "Cookie policy" })}
        </Link>
      </div>
    </section>
  );
}
