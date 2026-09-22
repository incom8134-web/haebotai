"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Check, GraduationCap, KeyRound, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import { listTools } from "@/lib/tools/registry";
import { createClient } from "@/lib/supabase/client";
import { useBi } from "@/lib/i18n/context";
import { ThemeLangControls } from "@/components/shell/app-shell";

// Sign-in. One screen, two halves: on the left, why it's worth it (told
// with the real tool set drifting past); on the right, one glass card with
// one action. Honest terms — 100 credits on sign-up, no card, students
// unlimited after verification (lib/site/plans.ts).

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/studio";
}

function AuthCard() {
  const L = useBi();
  const params = useSearchParams();
  const error = params.get("error");
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setLoading(true);
    setFailed(false);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (err) {
      setLoading(false);
      setFailed(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong w-full max-w-[420px] rounded-[32px] p-7 sm:p-9"
    >
      <span className="studio-gradient-bg grid size-12 place-items-center rounded-2xl font-display text-xl font-bold text-white shadow-[inset_0_1px_0_oklch(1_0_0/35%),0_16px_40px_-16px_var(--studio-violet)]">H</span>
      <h1 className="mt-6 font-display text-[28px] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "해봇 AI 시작하기", en: "Start with Haebot AI" })}</h1>
      <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
        {next !== "/studio"
          ? L({ ko: "로그인하면 보던 화면으로 바로 돌아가요.", en: "Sign in and you'll land right back where you were." })
          : L({ ko: "Google 계정 하나로 18개 도구를 모두 씁니다.", en: "One Google account, all 18 tools." })}
      </p>

      {error || failed ? (
        <p role="alert" className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm break-keep text-danger">
          {L({ ko: "로그인하지 못했어요. 잠시 후 다시 시도하거나 다른 Google 계정을 써 보세요.", en: "Sign-in didn't go through. Try again shortly or use another Google account." })}
        </p>
      ) : null}

      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="mt-7 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-hairline bg-white text-[15px] font-semibold text-[#1f1f1f] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden />
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
        )}
        {loading ? L({ ko: "Google로 이동하는 중…", en: "Opening Google…" }) : L({ ko: "Google로 계속하기", en: "Continue with Google" })}
      </button>

      <ul className="mt-7 space-y-3 border-t border-hairline pt-6 text-sm">
        {[
          { icon: Check, text: { ko: "가입하면 100 크레딧, 카드 등록 없음", en: "100 credits on sign-up, no card needed" } },
          { icon: GraduationCap, text: { ko: "학생은 재학 인증 후 무제한", en: "Students: unlimited after verification" } },
          { icon: KeyRound, text: { ko: "내 API 키를 넣으면 크레딧 없이 실행", en: "Bring your own API key and runs are free" } },
        ].map((item) => (
          <li key={item.text.en} className="flex items-start gap-2.5 break-keep text-fg-muted">
            <item.icon size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden /> {L(item.text)}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-2xs leading-relaxed break-keep text-fg-subtle">
        {L({ ko: "계속하면 이용약관과 개인정보 처리방침에 동의하게 됩니다. 입력한 내용은 AI 학습에 쓰지 않아요.", en: "By continuing you agree to the terms and privacy policy. Your inputs are never used for AI training." })}{" "}
        <Link href="/help/faq" className="underline underline-offset-2 hover:text-fg">{L({ ko: "자주 묻는 질문", en: "FAQ" })}</Link>
      </p>
    </motion.div>
  );
}

export default function AuthPage() {
  const L = useBi();
  const tools = listTools();
  const rows = [tools.slice(0, 9), tools.slice(9)];

  return (
    <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      <div className="app-backdrop" aria-hidden>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <div className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 left-4 z-10 flex items-center justify-between">
        <Link href="/" className="glass flex h-11 items-center gap-2 rounded-2xl px-4 text-sm text-fg-muted transition-colors hover:text-fg">
          <ArrowLeft size={15} aria-hidden /> {L({ ko: "처음으로", en: "Home" })}
        </Link>
        <div className="glass flex rounded-2xl p-0.5"><ThemeLangControls /></div>
      </div>

      {/* Story half — hidden on phones so the action stays above the fold. */}
      <section className="relative hidden flex-col justify-center overflow-hidden px-12 py-24 lg:flex xl:px-20">
        <p className="text-sm font-medium text-studio-cyan">{L({ ko: "브리프 하나로, 캠페인 전체를", en: "One brief. A whole campaign." })}</p>
        <h2 className="mt-4 max-w-xl font-display text-[clamp(2.4rem,3.6vw,3.6rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep">
          {L({ ko: "마케팅 팀이 없어도,", en: "No marketing team?" })}
          <br />
          <span className="studio-gradient-type">{L({ ko: "마케팅은 됩니다.", en: "No problem." })}</span>
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed break-keep text-fg-muted">
          {L({ ko: "전략부터 카피, 이미지, 상세페이지, 사업계획서까지. 도구끼리 결과를 이어받고, 확인하지 못한 숫자에는 추정이라고 표시합니다.", en: "Strategy, copy, images, detail pages, business plans. Tools pass results to each other, and unverified numbers are labeled as estimates." })}
        </p>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-fg-muted">
          <span className="flex items-center gap-2"><Link2 size={15} className="text-studio-cyan" aria-hidden /> {L({ ko: "도구끼리 이어서", en: "Tools that chain" })}</span>
          <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-studio-cyan" aria-hidden /> {L({ ko: "출처 또는 추정 표시", en: "Sourced or labeled" })}</span>
        </div>

        {/* Two slow, opposite marquees of the real tools. */}
        <div className="mt-14 -mr-20 space-y-3 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]" aria-hidden>
          {rows.map((row, r) => (
            <div key={r} className="flex w-max gap-3" style={{ animation: `auth-marquee ${r ? 46 : 38}s linear infinite ${r ? "reverse" : ""}` }}>
              {[...row, ...row].map((t, i) => (
                <span key={`${t.id}-${i}`} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap">
                  <t.icon size={14} className="text-studio-cyan" /> {L({ ko: t.name_ko, en: t.name_en })}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex items-center justify-center px-4 pt-24 pb-10 sm:px-8">
        <Suspense fallback={<div className="glass-strong h-[520px] w-full max-w-[420px] rounded-[32px]" />}>
          <AuthCard />
        </Suspense>
      </section>
    </main>
  );
}
