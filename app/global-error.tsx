"use client";

import "./globals.css";
import { BrandMark } from "@/components/brand-mark";

// Catches errors thrown by the root layout itself, which app/error.tsx
// can't — this replaces the whole document (including <html>/<body>)
// when active, so there's no theme or language provider here: both
// languages are shown, and only the brand tokens from globals.css are used.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-bg text-fg">
        <main className="relative grid min-h-dvh place-items-center overflow-hidden p-6">
          <div className="app-backdrop" aria-hidden />
          <div className="glass-strong w-full max-w-md rounded-[28px] p-8 text-center">
            <BrandMark size={48} className="mx-auto" />
            <h1 className="mt-5 text-xl font-bold break-keep">예기치 않은 오류가 발생했어요</h1>
            <p className="mt-1 text-sm text-fg-muted">Something went wrong.</p>
            <p className="mt-4 text-sm leading-relaxed break-keep text-fg-muted">
              진행 중이던 실행은 보관함에 남아 있어요. 잠시 후 다시 시도해 주세요.
              <br />
              <span className="text-fg-subtle">Runs in progress are kept in your Library. Please try again in a moment.</span>
            </p>
            {error.digest ? <p className="mt-3 font-mono text-2xs text-fg-subtle">ref: {error.digest}</p> : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => retry()} className="studio-gradient-bg h-11 rounded-2xl px-5 text-sm font-semibold text-white">
                다시 시도 · Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose: the root layout itself failed */}
              <a href="/" className="glass grid h-11 place-items-center rounded-2xl px-5 text-sm font-medium">
                처음으로 · Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
