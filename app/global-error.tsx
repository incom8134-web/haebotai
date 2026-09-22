"use client";

import "./globals.css";

// Catches errors thrown by the root layout itself, which app/error.tsx
// can't — this replaces the whole document (including <html>/<body>)
// when active, so it can't assume anything the root layout normally
// provides.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-dvh items-center justify-center bg-bg p-8">
          <div className="flex w-full max-w-md flex-col items-center p-8 text-center">
            <h2 className="mb-4 text-xl text-fg">
              예기치 않은 오류가 발생했습니다.
            </h2>
            <button
              onClick={reset}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
