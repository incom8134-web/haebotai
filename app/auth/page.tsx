"use client";

import { BrandMark } from "@/components/brand-mark";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Sparkles, Wand2, KeyRound, LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { CATEGORIES, CATEGORY_ORDER, toolsIn } from "@/lib/tools/catalog";
import { createClient } from "@/lib/supabase/client";
import { useBi } from "@/lib/i18n/context";
import { ThemeLangControls } from "@/components/shell/app-shell";
import { AUTH_PROVIDERS, type AuthProvider } from "@/lib/auth-providers";
import { HOME_AFTER_SIGN_IN } from "@/lib/consent";
import { OWN_KEY_ONLY } from "@/lib/site/access";

// Sign-in (docs/redesign-plan.md §5). Google, plus Kakao when it's switched
// on (lib/auth-providers.ts) — email sign-up was closed on purpose. Next to the one button: what you can build (from the
// catalog), a word for returning members, and what happens to your
// account data. Honest terms — 500 credits on sign-up, no card, students
// unlimited after verification (lib/site/plans.ts).

// Set by onboarding; read only after hydration so the server render and
// the first client render match. No project names on this signed-out
// screen — it may be a shared computer.
const noop = () => () => {};
function useReturning() {
  return useSyncExternalStore(noop, () => /(?:^|;\s*)haebot-onboarded=1/.test(document.cookie), () => false);
}

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : HOME_AFTER_SIGN_IN;
}

function AuthCard() {
  const L = useBi();
  const params = useSearchParams();
  const error = params.get("error");
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [failed, setFailed] = useState(false);
  const returning = useReturning();
  const hasKakao = AUTH_PROVIDERS.includes("kakao");

  // Coming back from Google with the Back button restores this page from
  // the back/forward cache with the button still stuck on "Opening Google…".
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function signIn(provider: AuthProvider) {
    if (loading) return;
    setLoading(provider);
    setFailed(false);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (err) {
      setLoading(null);
      setFailed(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px] rounded-[28px] border border-hairline bg-surface p-7 shadow-[0_30px_80px_-50px_rgba(43,30,18,0.5)] sm:p-9"
    >
      <BrandMark size={48} priority />
      <h1 className="mt-6 font-display text-[28px] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "AI 해바 시작하기", en: "Start with AI Haeba" })}</h1>
      <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
        {next !== HOME_AFTER_SIGN_IN
          ? L({ ko: "로그인하면 보던 화면으로 바로 돌아가요.", en: "Sign in and you'll land right back where you were." })
          : returning
            ? L({ ko: "다시 오셨네요. 로그인하면 하던 작업과 프로젝트로 바로 돌아가요.", en: "Welcome back. Sign in to pick up your work and projects." })
            : L({ ko: hasKakao ? "Google이나 카카오 계정 하나로 25개 도구를 모두 써요. 처음이면 목표와 프로젝트를 정하는 짧은 안내부터 시작해요." : "Google 계정 하나로 25개 도구를 모두 써요. 처음이면 목표와 프로젝트를 정하는 짧은 안내부터 시작해요.", en: hasKakao ? "One Google or Kakao account, all 25 tools. First time? A short setup picks your goal and project." : "One Google account, all 25 tools. First time? A short setup picks your goal and project." })}
      </p>

      {error || failed ? (
        <p role="alert" className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm break-keep text-danger">
          {L({ ko: "로그인하지 못했어요. 잠시 후 다시 시도하거나 다른 계정을 써 보세요.", en: "Sign-in didn't go through. Try again shortly or use another account." })}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={!!loading}
        className="mt-7 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-hairline bg-white text-[15px] font-semibold text-[#1f1f1f] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading === "google" ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden />
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
        )}
        {loading === "google" ? L({ ko: "Google로 이동하는 중…", en: "Opening Google…" }) : L({ ko: "Google로 계속하기", en: "Continue with Google" })}
      </button>
      {hasKakao ? (
        <button
          type="button"
          onClick={() => signIn("kakao")}
          disabled={!!loading}
          className="mt-3 flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-[15px] font-semibold text-black/85 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading === "kakao" ? (
            <LoaderCircle size={18} className="animate-spin" aria-hidden />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#000" d="M12 3C6.48 3 2 6.53 2 10.88c0 2.8 1.86 5.26 4.66 6.65l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.07 1.07.11 1.62.11 5.52 0 10-3.53 10-7.86S17.52 3 12 3z" />
            </svg>
          )}
          {loading === "kakao" ? L({ ko: "카카오로 이동하는 중…", en: "Opening Kakao…" }) : L({ ko: "카카오로 계속하기", en: "Continue with Kakao" })}
        </button>
      ) : null}

      {/* For owners who just want to get something out today: the easy page, one tap away. */}
      {next === HOME_AFTER_SIGN_IN ? (
      <Link
        href="/quick"
        className="group mt-5 flex items-center gap-3 rounded-2xl border-2 border-accent/30 bg-accent-dim px-4 py-3.5 transition-colors hover:border-accent"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white">
          <Wand2 size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold break-keep text-fg">{L({ ko: "가게 홍보 바로 시작하기", en: "Start shop marketing now" })}</span>
          <span className="mt-0.5 block text-xs leading-relaxed break-keep text-fg-muted">{L({ ko: "SNS 게시물·홍보 문구·이미지를 한 줄로 만들어요", en: "Social posts, promo copy and images from one line" })}</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
      ) : null}

      <ul className="mt-7 space-y-3 border-t border-hairline pt-6 text-sm">
        {(OWN_KEY_ONLY
          ? [
              { icon: Check, text: { ko: "가입할 때 카드 등록 없음", en: "No card needed to sign up" } },
              { icon: KeyRound, text: { ko: "도구는 내 Gemini API 키로 실행 — Google AI Studio에서 5분이면 발급", en: "Tools run on your own Gemini API key — about 5 minutes to get from Google AI Studio" } },
              { icon: RotateCcw, text: { ko: "요금은 내 Google 계정에서 직접 확인하고 관리", en: "Any usage is billed to, and managed in, your own Google account" } },
            ]
          : [
              { icon: Check, text: { ko: "가입하면 500 크레딧, 카드 등록 없음", en: "500 credits on sign-up, no card needed" } },
              { icon: GraduationCap, text: { ko: "학생은 재학 인증 후 무제한", en: "Students: unlimited after verification" } },
              { icon: KeyRound, text: { ko: "내 API 키를 넣으면 크레딧 없이 실행", en: "Bring your own API key and runs use no credits" } },
              { icon: RotateCcw, text: { ko: "실패하거나 취소한 실행은 자동 환불", en: "Failed or cancelled runs are refunded" } },
            ]
        ).map((item) => (
          <li key={item.text.en} className="flex items-start gap-2.5 break-keep text-fg-muted">
            <item.icon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {L(item.text)}
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-surface-2 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-fg"><LockKeyhole size={13} className="text-grounded" aria-hidden /> {L({ ko: "계정과 데이터", en: "Your account and data" })}</p>
        <ul className="mt-1.5 space-y-1 text-2xs leading-relaxed break-keep text-fg-muted">
          <li>{hasKakao ? L({ ko: "Google·카카오 계정으로만 로그인해요. 비밀번호를 만들거나 저장하지 않아요.", en: "Google or Kakao sign-in only — no password is created or stored." }) : L({ ko: "Google로만 로그인해요. 비밀번호를 만들거나 저장하지 않아요.", en: "Google sign-in only — no password is created or stored." })}</li>
          <li>{L({ ko: "이름과 이메일만 쓰고, 프로필 사진은 저장하지 않아요.", en: "We use your name and email; your profile photo isn't kept." })}</li>
          <li>{L({ ko: "입력과 결과는 AI 학습에 쓰지 않아요. 계정에서 언제든 지울 수 있어요.", en: "Inputs and results are never used for training, and you can delete them any time." })}</li>
        </ul>
      </div>

      <p className="mt-6 text-2xs leading-relaxed break-keep text-fg-subtle">
        {L({ ko: "처음 로그인하면 만 14세 이상 여부와 ", en: "On first sign-in we'll ask you to confirm you're 14 or older and accept the " })}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-fg">{L({ ko: "이용약관", en: "Terms" })}</Link>
        {L({ ko: "·", en: " and " })}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-fg">{L({ ko: "개인정보 처리방침", en: "Privacy Policy" })}</Link>
        {L({ ko: " 동의를 확인해요. 만 14세 미만은 가입할 수 없어요.", en: ". Under-14s can't sign up." })}
      </p>
    </motion.div>
  );
}

/** What you can build: one line per area, from the catalog. */
function BuildList({ compact }: { compact?: boolean }) {
  const L = useBi();
  return (
    <ul className={compact ? "grid gap-2" : "grid gap-3"}>
      {CATEGORY_ORDER.map((c) => {
        const tools = toolsIn(c).filter((t) => t.engine && !t.hidden);
        const lead = tools[0];
        if (!lead) return null;
        return (
          <li key={c} className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-dim text-accent"><lead.icon size={16} aria-hidden /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold break-keep text-fg">{L(CATEGORIES[c].name)}</span>
              <span className="mt-0.5 block text-xs leading-relaxed break-keep text-fg-muted">{tools.slice(0, 3).map((t) => L(t.outputs[0])).join(" · ")}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One owner, one request, finished work back: a photo of a bakery owner
 * planning a new menu, with an example request and what comes back.
 * Labelled as an example — it's not a real member's run.
 */
function AuthPhoto() {
  const L = useBi();
  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative max-w-xl overflow-hidden rounded-[28px] bg-[#2a1d14] shadow-[0_40px_90px_-50px_rgba(43,30,18,0.7)]"
    >
      <div className="relative aspect-[16/10] lg:aspect-[2/1]">
        <Image
          src="/images/auth-hero.webp"
          alt={L({ ko: "햇살 드는 빵집에서 사장이 딸기 타르트 옆에 노트를 펴고 신메뉴를 구상하는 모습", en: "A bakery owner in a sunlit shop, planning a new menu beside a tray of strawberry tarts" })}
          fill
          sizes="(min-width: 1024px) 576px, 100vw"
          className="object-cover object-[50%_30%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <figcaption className="absolute right-3 bottom-3 left-3 flex flex-col gap-2 sm:right-4 sm:bottom-4 sm:left-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white/92 px-3.5 py-2 text-xs leading-relaxed break-keep text-[#1f1b16] shadow-lg backdrop-blur sm:text-sm"
        >
          <span className="mr-1.5 text-[10px] font-semibold text-[#c2410c]">{L({ ko: "예시 요청", en: "Example" })}</span>
          {L({ ko: "딸기 타르트 신메뉴, 인스타 홍보 문구랑 2주 게시 일정 짜 줘", en: "New strawberry tart — write the Instagram copy and a two-week posting plan" })}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex items-center gap-1.5 self-end rounded-2xl rounded-br-md bg-[#c2410c] px-3.5 py-2 text-xs font-semibold text-white shadow-lg sm:text-sm"
        >
          <Sparkles size={13} aria-hidden /> {L({ ko: "카피 3안 · 게시 일정 14일 · 이미지 4장", en: "3 copy options · 14-day plan · 4 images" })}
        </motion.p>
      </figcaption>
    </motion.figure>
  );
}

export default function AuthPage() {
  const L = useBi();

  return (
    <main className="relative grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr] lg:grid-rows-[1fr_auto]">
      <div className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 left-4 z-10 flex items-center justify-between">
        <Link href="/" className="flex h-10 items-center gap-2 rounded-xl border border-hairline bg-surface px-3.5 text-sm text-fg-muted transition-colors hover:text-fg">
          <ArrowLeft size={15} aria-hidden /> {L({ ko: "처음으로", en: "Home" })}
        </Link>
      </div>

      {/* What you can build — beside the card on large screens, under it on phones. */}
      <section className="relative order-2 px-4 pb-12 sm:px-8 lg:order-1 lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-hairline lg:bg-surface-2/40 lg:px-12 lg:py-20 xl:px-20">
        <AuthPhoto />
        <p className="mt-8 text-sm font-semibold text-accent">{L({ ko: "아이디어에서 매출까지", en: "From idea to revenue" })}</p>
        <h2 className="mt-3 max-w-xl font-display text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.1] font-bold tracking-[-0.02em] break-keep text-fg">
          {L({ ko: "로그인하면 이런 걸 만들 수 있어요", en: "Sign in and build things like these" })}
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed break-keep text-fg-muted lg:text-base">
          {L({ ko: "프로젝트가 정한 내용을 기억하고, 한 도구의 결과가 다음 도구로 이어져요. 확인하지 못한 숫자에는 추정이라고 표시해요.", en: "Projects remember what you've settled, results carry from tool to tool, and unverified numbers are labelled as estimates." })}
        </p>
        <div className="mt-6 max-w-xl lg:mt-8">
          <BuildList />
        </div>
      </section>

      <section className="relative order-1 flex items-center justify-center px-4 pt-24 pb-8 sm:px-8 lg:order-2 lg:pb-10">
        <Suspense fallback={<div className="h-[560px] w-full max-w-[420px] rounded-[28px] border border-hairline bg-surface" />}>
          <AuthCard />
        </Suspense>
      </section>

      {/* Theme and language: at the foot of the page, out of the way of signing in. */}
      <div className="order-3 flex items-center justify-center gap-3 border-t border-hairline px-4 py-6 lg:col-span-2">
        <span className="text-xs text-fg-subtle">{L({ ko: "화면·언어", en: "Theme & language" })}</span>
        <div className="flex rounded-xl border border-hairline bg-surface p-0.5"><ThemeLangControls /></div>
      </div>
    </main>
  );
}
