"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { acceptConsent, type ConsentState } from "@/lib/actions/consent";
import { useBi } from "@/lib/i18n/context";
import { primaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, { ko: string; en: string }> = {
  required: { ko: "필수 항목에 모두 동의해 주세요.", en: "Please accept both required items." },
  save_failed: { ko: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", en: "Couldn't save. Please try again shortly." },
};

function ConsentForm({ next }: { next: string }) {
  const L = useBi();
  const [state, action, pending] = useActionState<ConsentState, FormData>(acceptConsent, null);
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const all = age && terms;

  return (
    <form action={action} className="glass-strong w-full max-w-[460px] rounded-[32px] p-7 sm:p-9">
      <BrandMark size={44} priority />
      <h1 className="mt-6 font-display text-[26px] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "시작하기 전에 확인해 주세요", en: "Before you start" })}</h1>
      <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">{L({ ko: "처음 한 번만 확인해요. 동의 기록은 계정에 저장됩니다.", en: "Asked once. Your confirmation is saved with your account." })}</p>

      <input type="hidden" name="next" value={next} />

      <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-hairline px-4 py-3 font-semibold">
        <input type="checkbox" checked={all} onChange={(e) => { setAge(e.target.checked); setTerms(e.target.checked); }} className="size-4 accent-[var(--studio-cyan)]" />
        {L({ ko: "모두 동의합니다", en: "Accept all" })}
      </label>

      <div className="mt-3 space-y-3 px-1 text-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="age14" checked={age} onChange={(e) => setAge(e.target.checked)} required className="mt-0.5 size-4 accent-[var(--studio-cyan)]" />
          <span className="break-keep">
            <span className="text-studio-cyan">{L({ ko: "[필수]", en: "[Required]" })}</span> {L({ ko: "만 14세 이상입니다.", en: "I am 14 or older." })}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-0.5 size-4 accent-[var(--studio-cyan)]" />
          <span className="break-keep">
            <span className="text-studio-cyan">{L({ ko: "[필수]", en: "[Required]" })}</span>{" "}
            <Link href="/legal/terms" target="_blank" className="underline underline-offset-2">{L({ ko: "이용약관", en: "Terms of Service" })}</Link>
            {L({ ko: " 및 ", en: " and " })}
            <Link href="/legal/privacy" target="_blank" className="underline underline-offset-2">{L({ ko: "개인정보 처리방침", en: "Privacy Policy" })}</Link>
            {L({ ko: "에 동의합니다.", en: "." })}
          </span>
        </label>
      </div>

      <p className="mt-4 text-2xs leading-relaxed break-keep text-fg-subtle">
        {L({ ko: "만 14세 미만은 가입할 수 없어요. 입력한 내용은 AI 학습에 쓰지 않아요.", en: "Under-14s can't sign up. Your inputs are never used for AI training." })}
      </p>

      {state?.error ? <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{L(ERRORS[state.error] ?? ERRORS.save_failed)}</p> : null}

      <button type="submit" disabled={!all || pending} className={cn(primaryButton, "mt-6 w-full disabled:opacity-50")}>
        {pending ? L({ ko: "저장하는 중…", en: "Saving…" }) : L({ ko: "동의하고 시작하기", en: "Agree and continue" })}
      </button>
    </form>
  );
}

export { ConsentForm };
