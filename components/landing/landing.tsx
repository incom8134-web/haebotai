"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, Plus, Wand2 } from "lucide-react";
import { BusinessInfo } from "@/components/site/business-info";
import { BUSINESS } from "@/lib/site/business";
import { BrandLogo, BrandMark } from "@/components/brand-mark";
import { ThemeLangControls } from "@/components/shell/app-shell";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { CreditPreview, PlanCards } from "@/components/site/plan-cards";
import { publicTools } from "@/lib/tools/catalog";
import { FAQ } from "@/lib/site/faq";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { HeroMock } from "./hero-mock";
import { ConceptFilm } from "./concept-film";
import { SceneVideo } from "./scene-video";
import {
  BeforeAfterSection,
  CategorySection,
  FlowSection,
  PersonasSection,
  SectionHead,
  StepsSection,
  reveal,
} from "./sections";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { OwnKeyPricing } from "@/components/site/own-key-pricing";

// Public homepage (docs/redesign-plan.md §5). In order: the promise with a
// live product mock → the idea-to-growth flow → five categories → how it
// works → a real before/after → who it's for → pricing → answers → one
// last invitation.

// Signed-in visitors get "Go to Studio" instead of sign-in/sign-up CTAs,
// so nobody is sent through Google sign-in again.
const SignedIn = createContext(false);

const FAQ_ON_HOME = [
  "Can tools use each other's results?",
  "What if I don't like a result?",
  OWN_KEY_ONLY ? "Why do I need my own API key?" : "How are credits charged?",
  'What\'s the "estimate" badge?',
  "Can I use outputs commercially?",
  "Is my data used for training?",
];

function Nav() {
  const signedIn = useContext(SignedIn);
  const L = useBi();
  return (
    <>
      <a
        href="#main"
        className="sr-only fixed top-3 left-3 z-[100] rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg focus:not-sr-only"
      >
        {L({ ko: "본문으로 건너뛰기", en: "Skip to content" })}
      </a>
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur md:px-6">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2">
          <Link href="/" className="flex items-center pr-2">
            {/* "AI Haeba" is wider than "AI 해바": on the narrowest phones the English header shows the gem alone. */}
            <BrandMark size={30} label="AI Haeba" className={L({ ko: "hidden", en: "min-[400px]:hidden" })} />
            <BrandLogo height={24} className={cn("h-[19px] w-auto sm:h-6", L({ ko: "", en: "hidden min-[400px]:block" }))} />
          </Link>
          <nav
            className="mx-auto hidden items-center gap-1 md:flex"
            aria-label={L({ ko: "페이지 안내", en: "Page" })}
          >
            <Link
              href="/quick"
              className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_-10px_var(--color-accent)] transition-colors hover:bg-accent-hover"
            >
              <Wand2 size={15} aria-hidden />
              {L({ ko: "가게 홍보 바로 시작하기", en: "Start shop marketing" })}
            </Link>
            {[
              ["#flow", { ko: "흐름", en: "Flow" }],
              ["#tools", { ko: "도구", en: "Tools" }],
              ["#example", { ko: "실제 결과", en: "Example" }],
              ["#pricing", { ko: "요금", en: "Pricing" }],
              ["#faq", { ko: "질문", en: "FAQ" }],
            ].map(([href, label]) => (
              <a
                key={href as string}
                href={href as string}
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {L(label as { ko: string; en: string })}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {/* Phones have no room for the page links: the quick start keeps its place up here. */}
            <Link
              href="/quick"
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-accent px-3 text-sm font-semibold whitespace-nowrap text-white md:hidden"
            >
              <Wand2 size={15} aria-hidden />
              {L({ ko: "홍보 바로 시작", en: "Quick start" })}
            </Link>
            {signedIn ? (
              <Link href="/studio" className={cn(primaryButton, "h-10 whitespace-nowrap max-sm:px-3.5")}>
                {L({ ko: "스튜디오로", en: "Go to Studio" })}
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="hidden h-10 items-center rounded-xl px-3 text-sm font-medium text-fg sm:flex"
                >
                  {L({ ko: "로그인", en: "Sign in" })}
                </Link>
                <Link href="/auth" className={cn(primaryButton, "h-10 whitespace-nowrap max-sm:px-3.5")}>
                  {L({ ko: "시작하기", en: "Get started" })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function Hero() {
  const signedIn = useContext(SignedIn);
  const L = useBi();
  const count = publicTools().length;
  return (
    <div className="relative isolate overflow-hidden">
      {/* A quiet paper-and-light scene that plays once, then holds. The wash keeps the headline readable. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <SceneVideo name="hero" priority className="opacity-90 dark:opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/60 to-bg/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      </div>
    <section className="mx-auto grid max-w-[1200px] gap-10 px-4 pt-12 pb-16 md:px-6 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />{" "}
          {L({
            ko: `작은 사업을 위한 ${count}개 AI 도구`,
            en: `${count} AI tools for small businesses`,
          })}
        </p>
        <h1 className="mt-6 font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.06] font-bold tracking-[-0.03em] break-keep text-fg">
          {L({ ko: "아이디어에서 매출까지,", en: "From idea to revenue," })}
          <br />
          <span className="text-accent">
            {L({ ko: "이어지는 사업 작업실", en: "one connected workshop" })}
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "사업 아이디어, 오퍼, 브랜드, 상세페이지, 캠페인, 업무 문서까지. 하나의 프로젝트가 정한 내용을 기억하고, 한 도구의 결과가 다음 도구의 입력이 돼요.",
            en: "Business ideas, offers, brand, sales pages, campaigns and operating documents. One project remembers what you've settled, and each tool's result becomes the next one's input.",
          })}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/quick"
            className={cn(primaryButton, "h-12 w-full px-6 text-[15px] sm:w-auto")}
          >
            <Wand2 size={17} aria-hidden />
            {L({ ko: "가게 홍보 바로 시작하기", en: "Start shop marketing now" })}
          </Link>
          <Link
            href={signedIn ? "/studio" : "/auth"}
            className={cn(secondaryButton, "h-12 px-6 text-[15px]")}
          >
            {signedIn
              ? L({ ko: "스튜디오로 가기", en: "Go to Studio" })
              : L({ ko: "시작하기", en: "Get started" })}{" "}
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/tools"
            className={cn(secondaryButton, "h-12 px-6 text-[15px]")}
          >
            {L({ ko: "도구 둘러보기", en: "Browse tools" })}
          </Link>
        </div>
        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
          {(OWN_KEY_ONLY
            ? [
                { ko: "한 줄이면 바로 시작", en: "Start with one line" },
                { ko: "카드 등록 없음", en: "No card needed" },
                { ko: "내 Gemini API 키로 실행", en: "Runs on your own Gemini key" },
              ]
            : [
                { ko: "가입하면 500 크레딧", en: "500 credits on sign-up" },
                { ko: "카드 등록 없음", en: "No card needed" },
                { ko: "실패한 실행은 자동 환불", en: "Failed runs refunded" },
              ]
          ).map((t) => (
            <li key={t.en} className="flex items-center gap-1.5 break-keep">
              <Check size={15} className="text-grounded" aria-hidden /> {L(t)}
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <HeroMock />
      </motion.div>
    </section>
    </div>
  );
}

function Pricing() {
  const signedIn = useContext(SignedIn);
  const L = useBi();
  return (
    <section
      id="pricing"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      {OWN_KEY_ONLY ? (
        <>
          <SectionHead
            kicker={L({ ko: "요금", en: "Pricing" })}
            title={L({ ko: "AI는 내 키로 실행해요", en: "The AI runs on your own key" })}
            body={L({
              ko: "Google AI Studio에서 받은 내 Gemini API 키를 등록하면 25개 도구를 모두 쓸 수 있어요. AI 사용 요금은 Google이 내 Google 계정으로 직접 청구해요.",
              en: "Add your own Gemini API key from Google AI Studio and every one of the 25 tools is yours to use. Google bills the AI usage directly to your Google account.",
            })}
          />
          <div className="mt-10">
            <OwnKeyPricing signedIn={signedIn} />
          </div>
        </>
      ) : (
        <>
          <SectionHead
            kicker={L({ ko: "요금", en: "Pricing" })}
            title={L({
              ko: "모든 플랜에 모든 도구. 다른 건 크레딧뿐",
              en: "Every tool on every plan. Only credits differ",
            })}
            body={L({
              ko: "실행 전에 크레딧이 얼마나 드는지 보여 드려요. 실패하거나 취소한 실행은 자동 환불되고, 내 API 키를 넣으면 크레딧이 들지 않아요.",
              en: "You see the credit cost before every run. Failed or cancelled runs are refunded automatically, and with your own API key runs cost no credits.",
            })}
          />
          <div className="mt-10">
            <PlanCards signedIn={signedIn} />
          </div>
          <div className="mt-4">
            <CreditPreview />
          </div>
          <p className="mt-4 text-sm text-fg-muted">
            <Link href="/pricing#per-tool" className="text-accent underline underline-offset-2">
              {L({ ko: "도구별 크레딧 전체 보기", en: "Credits for every tool" })}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

function Faq() {
  const L = useBi();
  const items = FAQ_ON_HOME.map((en) => FAQ.find((f) => f.q.en === en)).filter(
    (f) => !!f,
  );
  return (
    <section
      id="faq"
      className="mx-auto max-w-[900px] scroll-mt-24 px-4 py-16 md:px-6 md:py-20"
    >
      <SectionHead
        kicker={L({ ko: "질문", en: "FAQ" })}
        title={L({ ko: "시작하기 전에 궁금한 것", en: "Before you start" })}
      />
      <div className="mt-8 divide-y divide-hairline rounded-[24px] border border-hairline bg-surface">
        {items.map((f) => (
          <details key={f.q.en} className="smooth px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium break-keep text-fg">
              {L(f.q)}
              <Plus
                size={16}
                className="smooth-plus shrink-0 text-fg-subtle"
                aria-hidden
              />
            </summary>
            <div className="smooth-body">
              <div>
                <p className="pt-3 text-sm leading-relaxed break-keep text-fg-muted">
                  {L(f.a)}
                </p>
              </div>
            </div>
          </details>
        ))}
      </div>
      <p className="mt-4 text-sm text-fg-muted">
        <Link
          href="/help/faq"
          className="text-accent underline underline-offset-2"
        >
          {L({ ko: "질문 전체 보기", en: "All questions" })}
        </Link>
      </p>
    </section>
  );
}

function FinalCta() {
  const signedIn = useContext(SignedIn);
  const L = useBi();
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-6 pb-20 md:px-6">
      <motion.div
        {...reveal}
        className="rounded-[32px] bg-fg px-6 py-14 text-center md:px-12"
      >
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.8rem,3.8vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-bg">
          {L({
            ko: "오늘 만든 프로젝트가 내일 도구의 출발점이 됩니다",
            en: "Today's project is where tomorrow's tool starts",
          })}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed break-keep text-bg/70">
          {L({
            ko: "구글 계정으로 바로 시작하세요. 결과는 도구에 따라 1~4분이면 나와요.",
            en: "Start with your Google account. Results take 1–4 minutes depending on the tool.",
          })}
        </p>
        <Link
          href={signedIn ? "/studio" : "/auth"}
          className={cn(primaryButton, "mt-8 h-12 px-7 text-[15px]")}
        >
          {signedIn
            ? L({ ko: "스튜디오로 가기", en: "Go to Studio" })
            : L({ ko: "시작하기", en: "Get started" })}{" "}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </motion.div>
    </section>
  );
}

function Footer() {
  const signedIn = useContext(SignedIn);
  const L = useBi();
  return (
    <footer className="border-t border-hairline px-4 py-10 md:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          <BrandLogo height={22} />
        </p>
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted"
          aria-label={L({ ko: "바닥글", en: "Footer" })}
        >
          {[
            ["/tools", { ko: "도구", en: "Tools" }],
            ["/pricing", { ko: "요금", en: "Pricing" }],
            ["/use-cases", { ko: "활용 사례", en: "Use cases" }],
            ["/help", { ko: "도움말", en: "Help" }],
            ["/help/faq", { ko: "자주 묻는 질문", en: "FAQ" }],
            ["/help/api-guide", { ko: "API 키 설명서", en: "API key manual" }],
            ["/help/whats-new", { ko: "새로운 점", en: "What's new" }],
            ["/status", { ko: "서비스 상태", en: "Status" }],
            signedIn
              ? ["/account", { ko: "내 계정", en: "My account" }]
              : ["/auth", { ko: "로그인", en: "Sign in" }],
          ].map(([href, label]) => (
            <Link
              key={href as string}
              href={href as string}
              className="hover:text-fg"
            >
              {L(label as { ko: string; en: string })}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-6 flex max-w-[1200px] items-center gap-3">
        <span className="text-xs text-fg-subtle">{L({ ko: "화면·언어", en: "Theme & language" })}</span>
        <div className="flex rounded-xl border border-hairline bg-surface p-0.5">
          <ThemeLangControls />
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-[1200px] flex-col gap-3 border-t border-hairline pt-6">
        <nav
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
          aria-label={L({ ko: "약관·정책", en: "Legal" })}
        >
          <Link href="/legal/terms" className="text-fg-muted hover:text-fg">
            {L({ ko: "이용약관", en: "Terms" })}
          </Link>
          <Link
            href="/legal/privacy"
            className="font-semibold text-fg hover:text-fg"
          >
            {L({ ko: "개인정보 처리방침", en: "Privacy Policy" })}
          </Link>
          <Link href="/legal/refund" className="text-fg-muted hover:text-fg">
            {L({ ko: "환불정책", en: "Refund Policy" })}
          </Link>
          <Link href="/legal/cookies" className="text-fg-muted hover:text-fg">
            {L({ ko: "쿠키 정책", en: "Cookies" })}
          </Link>
          <Link href="/legal/licenses" className="text-fg-muted hover:text-fg">
            {L({ ko: "라이선스", en: "Licenses" })}
          </Link>
        </nav>
        <BusinessInfo />
        <p className="text-xs text-fg-subtle">
          © {new Date().getFullYear()} {BUSINESS.companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function Landing({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <SignedIn.Provider value={signedIn}>
      <div className="relative min-h-dvh overflow-x-clip bg-bg">
        <Nav />
        <main id="main">
          <Hero />
          <ConceptFilm />
          <FlowSection />
          <CategorySection />
          <StepsSection />
          <BeforeAfterSection />
          <PersonasSection />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </SignedIn.Provider>
  );
}

export { Landing };
