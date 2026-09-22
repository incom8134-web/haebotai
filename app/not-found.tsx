"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";

export default function NotFound() {
  const L = useBi();
  return (
    <div className="relative grid min-h-dvh place-items-center px-4">
      <div className="app-backdrop" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /></div>
      <div className="glass-strong w-full max-w-lg rounded-[32px] p-8 text-center">
        <span className="studio-gradient-bg mx-auto grid size-14 place-items-center rounded-2xl text-white"><Compass size={26} aria-hidden /></span>
        <p className="mt-6 font-mono text-sm text-studio-cyan">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold break-keep">{L({ ko: "찾는 페이지가 없어요", en: "That page doesn't exist" })}</h1>
        <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">{L({ ko: "주소가 바뀌었거나 잘못 입력됐을 수 있어요. 도구 목록이나 도움말에서 다시 찾아보세요.", en: "The address may have changed or been mistyped. Try the tool list or Help." })}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/tools" className={primaryButton}>{L({ ko: "도구 보기", en: "Browse tools" })}</Link>
          <Link href="/help" className={secondaryButton}>{L({ ko: "도움말", en: "Help" })}</Link>
        </div>
      </div>
    </div>
  );
}
