"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";

// Route error boundary (Next.js convention), in the app's glass style.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const L = useBi();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative grid min-h-dvh place-items-center px-4">
      <div className="app-backdrop" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /></div>
      <div className="glass-strong w-full max-w-lg rounded-[32px] p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger/15 text-danger"><TriangleAlert size={26} aria-hidden /></span>
        <h1 className="mt-6 font-display text-2xl font-bold break-keep">{L({ ko: "화면을 불러오지 못했어요", en: "This screen didn't load" })}</h1>
        <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">{L({ ko: "진행 중이던 실행은 보관함에 남아 있고, 실패한 실행의 크레딧은 자동으로 환불돼요.", en: "Runs in progress are kept in your Library, and failed runs are refunded automatically." })}</p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-5 max-h-48 overflow-auto rounded-2xl bg-bg/50 p-4 text-left text-xs whitespace-pre-wrap text-fg-muted">{error.stack ?? error.message}</pre>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className={primaryButton}><RotateCcw size={15} aria-hidden /> {L({ ko: "다시 시도", en: "Try again" })}</button>
          <Link href="/help/contact?kind=bug" className={secondaryButton}>{L({ ko: "오류 신고", en: "Report it" })}</Link>
        </div>
      </div>
    </div>
  );
}
