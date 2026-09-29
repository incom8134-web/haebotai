"use client";

import { useState } from "react";
import Link from "next/link";
import { useBi } from "@/lib/i18n/context";
import { BUSINESS } from "@/lib/site/business";

export function UnsubscribeCard({ u, t, valid }: { u: string; t: string; valid: boolean }) {
  const L = useBi();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    const res = await fetch(`/api/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`, { method: "POST" });
    setState(res.ok ? "done" : "error");
  }
  return (
    <div className="glass-strong rounded-[28px] p-7">
      <h1 className="font-display text-2xl font-bold break-keep">{L({ ko: "이메일 수신 거부", en: "Unsubscribe" })}</h1>
      {!valid ? (
        <p className="mt-3 text-sm text-fg-muted break-keep">
          {L({ ko: "링크가 올바르지 않아요. 로그인 후 [내 계정 > 동의 내역과 수신 설정]에서 끄거나, 고객센터로 알려 주세요.", en: "This link isn't valid. Sign in and turn emails off in Account, or contact us." })}{" "}
          <Link href="/account" className="underline underline-offset-2">{L({ ko: "내 계정", en: "Account" })}</Link> · {BUSINESS.email}
        </p>
      ) : state === "done" ? (
        <p role="status" className="mt-3 text-sm text-fg break-keep">
          {L({ ko: `처리됐어요. 이제 ${BUSINESS.serviceName}의 광고성 이메일을 보내지 않아요. 로그인·결제 같은 필수 안내만 받게 됩니다.`, en: "Done. You won't get promotional emails from us anymore — only essential notices like sign-in and payments." })}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-fg-muted break-keep">{L({ ko: "이벤트·새 기능 소식 이메일을 더 이상 받지 않으시겠어요? 버튼 한 번이면 바로 처리돼요.", en: "Stop getting event and feature emails? One click and it's done." })}</p>
          <button type="button" onClick={go} disabled={state === "busy"} className="mt-5 h-11 w-full rounded-full bg-fg font-semibold text-bg disabled:opacity-50">
            {state === "busy" ? L({ ko: "처리 중…", en: "Working…" }) : L({ ko: "수신 거부하기", en: "Unsubscribe" })}
          </button>
          {state === "error" ? <p role="alert" className="mt-3 text-sm text-danger">{L({ ko: "처리하지 못했어요. 잠시 후 다시 시도하거나 고객센터로 알려 주세요.", en: "That didn't work. Try again or contact us." })}</p> : null}
        </>
      )}
      <p className="mt-6 text-xs text-fg-muted">{BUSINESS.companyName} · {BUSINESS.phone} · {BUSINESS.email}</p>
    </div>
  );
}
