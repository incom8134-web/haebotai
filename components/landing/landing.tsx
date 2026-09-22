"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, FileText, GraduationCap, Image as ImageIcon, Link2, MessageSquareText, Plus, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { listTools, getTool } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { getToolContent } from "@/lib/tools/content";
import { WORKFLOWS } from "@/lib/site/guides";
import { PLANS } from "@/lib/site/plans";
import { FAQ } from "@/lib/site/faq";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { CategoryId } from "@/lib/tools/types";
import { ThemeLangControls } from "@/components/shell/app-shell";
import { Segmented, primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Public landing. The story in order: the problem (no marketing team),
// the promise (one brief → a whole campaign), proof (a live studio mock,
// three structural differences), the tools, the flows, honest pricing,
// answers, and one last invitation.

const ORDER: CategoryId[] = ["ideas", "content", "design", "sales", "docs"];

// WebGL — dynamically imported with no SSR (Canvas can't render server-
// side) and it's purely decorative, so a late mount never blocks anything
// above the fold from being usable.
const Hero3D = dynamic(() => import("./hero-3d").then((m) => m.Hero3D), { ssr: false });

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function Nav() {
  const L = useBi();
  return (
    <header className="sticky top-0 z-40 px-3 pt-[max(12px,env(safe-area-inset-top))] md:px-6">
      <div className="mx-auto flex max-w-[1200px] items-center gap-2">
        <Link href="/" className="glass flex h-11 items-center gap-2.5 rounded-2xl pr-4 pl-1.5">
          <span className="studio-gradient-bg grid size-8 place-items-center rounded-xl font-display text-base font-bold text-white">H</span>
          <span className="text-sm font-bold tracking-[-0.02em]">해봇 AI</span>
        </Link>
        <nav className="glass mx-auto hidden h-11 items-center gap-1 rounded-2xl px-1.5 md:flex" aria-label={L({ ko: "페이지 안내", en: "Page" })}>
          {[
            ["#tools", { ko: "도구", en: "Tools" }],
            ["#flows", { ko: "흐름", en: "Flows" }],
            ["#pricing", { ko: "요금", en: "Pricing" }],
            ["#faq", { ko: "질문", en: "FAQ" }],
          ].map(([href, label]) => (
            <a key={href as string} href={href as string} className="rounded-xl px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2/60 hover:text-fg">
              {L(label as { ko: string; en: string })}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="glass hidden rounded-2xl p-0.5 sm:flex"><ThemeLangControls /></div>
          <Link href="/auth" className="glass hidden h-11 items-center rounded-2xl px-4 text-sm font-medium sm:flex">{L({ ko: "로그인", en: "Sign in" })}</Link>
          <Link href="/auth" className={cn(primaryButton, "h-11")}>{L({ ko: "무료로 시작", en: "Start free" })}</Link>
        </div>
      </div>
    </header>
  );
}

/** A small live studio: a brief types itself, then three deliverables arrive. */
function StudioMock() {
  const L = useBi();
  const brief = L({ ko: "봄 딸기 타르트 출시, 4월 한정. 동네 20~30대 대상.", en: "Spring strawberry tart, April only. For locals in their 20s–30s." });
  const [typed, setTyped] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (typed < brief.length) {
      const t = setTimeout(() => setTyped((n) => n + 1), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setTyped(0); setCycle((c) => c + 1); }, 5200);
    return () => clearTimeout(t);
  }, [typed, brief.length]);
  const done = typed >= brief.length;
  const outputs = [
    { icon: MessageSquareText, tool: getTool("copy")!, line: L({ ko: "\"4월이 지나면 내년까지 기다려야 해요\"", en: "\"After April, it's a year's wait\"" }) },
    { icon: ImageIcon, tool: getTool("image")!, line: L({ ko: "원목 테이블 · 자연광 · 4:5 네 컷", en: "Wooden table · daylight · four 4:5 shots" }) },
    { icon: FileText, tool: getTool("blog")!, line: L({ ko: "제목 5개 · 이미지 자리 3곳 · 해시태그", en: "5 titles · 3 image slots · hashtags" }) },
  ];
  return (
    <div className="glass-strong relative rounded-[32px] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-studio-success" aria-hidden /> {L({ ko: "스튜디오", en: "Studio" })}</span>
        <span className="font-mono text-2xs text-fg-subtle">{L({ ko: "해봇 베이커리", en: "Haebot Bakery" })}</span>
      </div>
      <div className="mt-4 min-h-[76px] rounded-2xl border border-hairline bg-bg/40 p-4 text-sm leading-relaxed break-keep">
        {brief.slice(0, typed)}
        <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-studio-cyan" aria-hidden />
      </div>
      <div className="mt-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {done
            ? outputs.map((o, i) => (
                <motion.div
                  key={`${cycle}-${o.tool.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-bg/30 p-3"
                >
                  <span className="studio-gradient-bg grid size-9 shrink-0 place-items-center rounded-xl text-white"><o.icon size={16} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="block text-2xs text-fg-subtle">{L({ ko: o.tool.name_ko, en: o.tool.name_en })}</span>
                    <span className="block truncate text-sm">{o.line}</span>
                  </span>
                </motion.div>
              ))
            : [0, 1, 2].map((i) => <div key={`sk-${i}`} className="h-[62px] animate-pulse rounded-2xl bg-fg/5" />)}
        </AnimatePresence>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-2xs text-fg-subtle"><Link2 size={12} aria-hidden /> {L({ ko: "세 결과 모두 같은 브랜드 프로필을 읽었어요", en: "All three read the same Business Profile" })}</p>
    </div>
  );
}

function Landing() {
  const L = useBi();
  const { locale } = useLocale();
  const tools = listTools();
  const [cat, setCat] = useState<CategoryId>("content");
  const name = (id: string) => { const t = getTool(id)!; return locale === "en" ? t.name_en : t.name_ko; };

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="app-backdrop" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" /></div>
      <Hero3D />
      <Nav />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] gap-12 px-4 pt-16 pb-20 md:px-6 md:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-studio-cyan"><Sparkles size={13} aria-hidden /> {L({ ko: "소상공인·1인 사업자를 위한 AI 마케팅 스튜디오", en: "An AI marketing studio for small businesses" })}</p>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.05] font-bold tracking-[-0.03em] break-keep">
              {L({ ko: "마케팅 팀이 없어도,", en: "No marketing team?" })}
              <br />
              <span className="studio-gradient-type">{L({ ko: "마케팅은 됩니다.", en: "Still marketing." })}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed break-keep text-fg-muted">
              {L({ ko: "무엇을 팔지 정하는 일부터 카피, 사진, 상세페이지, 사업계획서까지. 브리프 하나를 쓰면 18개 도구가 서로 결과를 이어받아 캠페인 전체를 만듭니다.", en: "From deciding what to sell to copy, photos, detail pages and business plans. Write one brief and 18 tools pass results to each other to build the whole campaign." })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth" className={cn(primaryButton, "h-12 px-6 text-[15px]")}>{L({ ko: "무료로 시작하기", en: "Start free" })} <ArrowRight size={16} aria-hidden /></Link>
              <Link href="/tools" className={cn(secondaryButton, "h-12 px-6 text-[15px]")}>{L({ ko: "도구 둘러보기", en: "Browse tools" })}</Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
              {[
                { ko: "가입하면 100 크레딧", en: "100 credits on sign-up" },
                { ko: "카드 등록 없음", en: "No card needed" },
                { ko: "학생은 무제한", en: "Unlimited for students" },
              ].map((t) => <li key={t.en} className="flex items-center gap-1.5 break-keep"><Check size={15} className="text-studio-success" aria-hidden /> {L(t)}</li>)}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
            <StudioMock />
          </motion.div>
        </section>

        {/* Differences */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
          <motion.div {...reveal} className="max-w-2xl">
            <p className="text-sm font-medium text-studio-cyan">{L({ ko: "무엇이 다른가요", en: "What's different" })}</p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "도구 모음이 아니라, 하나로 이어진 작업실", en: "Not a folder of tools — one connected workshop" })}</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: Link2, title: { ko: "결과가 다음 도구로 이어져요", en: "Results flow to the next tool" }, body: { ko: "수익화 발굴에서 고른 방향이 트렌드 분석과 13주 캘린더로 그대로 넘어갑니다. 파일을 내보냈다 다시 올릴 일이 없어요.", en: "The direction you pick in Monetization Finder goes straight into Trend Analysis and the 13-week calendar. No exporting and re-uploading." } },
              { icon: UserRound, title: { ko: "한 번 쓰면 모든 도구가 기억해요", en: "Write it once; every tool remembers" }, body: { ko: "업종, 고객, 말투를 비즈니스 프로필에 한 번만 적으면 18개 도구가 모두 읽습니다. 매번 같은 설명을 반복하지 마세요.", en: "Industry, customers and voice go into one Business Profile that all 18 tools read. Stop repeating yourself." } },
              { icon: ShieldCheck, title: { ko: "모르는 숫자는 모른다고 말해요", en: "Unknown numbers are labeled" }, body: { ko: "시장 규모와 통계에는 출처 링크가 붙고, 확인하지 못한 숫자에는 '추정' 배지가 붙습니다. 그럴듯한 가짜 숫자는 없어요.", en: "Market sizes and stats come with source links; anything unverified gets an estimate badge. No plausible-looking fakes." } },
            ].map((d, i) => (
              <motion.article key={d.title.en} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="glass glass-hover rounded-[28px] p-7">
                <span className="studio-gradient-bg grid size-12 place-items-center rounded-2xl text-white"><d.icon size={21} aria-hidden /></span>
                <h3 className="mt-6 text-xl leading-snug font-semibold break-keep">{L(d.title)}</h3>
                <p className="mt-3 text-sm leading-relaxed break-keep text-fg-muted">{L(d.body)}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6">
          <motion.div {...reveal} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-studio-cyan">{L({ ko: `${tools.length}개 도구`, en: `${tools.length} tools` })}</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "도구마다 작업 화면이 달라요", en: "Each tool has its own workspace" })}</h2>
              <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{L({ ko: "발표자료는 슬라이드 수를 움직이면 미리보기가 바뀌고, 사업계획서는 숫자를 넣는 순간 손익분기가 계산돼요.", en: "Move the slide count and the deck preview changes; enter numbers and the business plan computes break-even." })}</p>
            </div>
            <Segmented label={L({ ko: "분야", en: "Area" })} value={cat} onChange={setCat} options={ORDER.map((c) => ({ value: c, label: L(CATEGORY_LABELS[c]), count: tools.filter((t) => t.category === c).length }))} />
          </motion.div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {tools.filter((t) => t.category === cat).map((t, i) => (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35, delay: i * 0.04 }}>
                  <Link href={`/tools/${t.id}`} className="glass glass-hover flex h-full flex-col rounded-[24px] p-5">
                    <span className="studio-gradient-bg grid size-11 place-items-center rounded-2xl text-white"><t.icon size={19} aria-hidden /></span>
                    <span className="mt-5 font-semibold break-keep">{locale === "en" ? t.name_en : t.name_ko}</span>
                    <span className="mt-1 text-sm leading-relaxed break-keep text-fg-muted">{L(getToolContent(t.id)!.tagline)}</span>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Flows */}
        <section id="flows" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6">
          <motion.h2 {...reveal} className="max-w-2xl font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "목표에서 시작하면, 순서는 저희가", en: "Start from the goal; we'll set the order" })}</motion.h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {WORKFLOWS.map((w, i) => (
              <motion.div key={w.id} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }} className="glass rounded-[24px] p-6">
                <p className="text-lg leading-snug font-semibold break-keep">{L(w.title)}</p>
                <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">{L(w.body)}</p>
                <ol className="mt-5 space-y-2">
                  {w.tools.map((id, k) => (
                    <li key={id} className="flex items-center gap-2.5 text-sm">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline font-mono text-[10px] text-fg-muted">{k + 1}</span>
                      <span className="break-keep">{name(id)}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 md:px-6">
          <motion.div {...reveal} className="max-w-2xl">
            <p className="text-sm font-medium text-studio-cyan">{L({ ko: "요금", en: "Pricing" })}</p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "모든 플랜에 모든 도구. 다른 건 크레딧뿐", en: "Every tool on every plan. Only credits differ" })}</h2>
            <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{L({ ko: "실패하거나 취소한 실행은 자동 환불되고, 내 API 키를 넣으면 크레딧이 들지 않아요.", en: "Failed or cancelled runs are refunded automatically, and with your own API key runs cost no credits." })}</p>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <motion.article key={p.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className={cn("glass relative flex flex-col rounded-[28px] p-7", p.id === "student" && "ring-1 ring-studio-cyan/50")}>
                {p.id === "student" ? <span className="studio-gradient-bg absolute -top-3 left-7 flex items-center gap-1.5 rounded-full px-3 py-1 text-2xs font-semibold text-white"><GraduationCap size={12} aria-hidden /> {L({ ko: "학생 추천", en: "For students" })}</span> : null}
                <p className="font-semibold">{L(p.name)}</p>
                <p className="mt-3 font-display text-4xl font-bold tracking-[-0.02em]">{L(p.price)}</p>
                <p className="mt-1 text-2xs text-fg-subtle">{L(p.note)}</p>
                <p className="mt-5 rounded-xl bg-surface-2/60 px-3 py-2 text-sm font-medium">{L(p.credits)}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-fg-muted">
                  {p.features.map((f) => <li key={f.en} className="flex gap-2 break-keep"><Check size={15} className="mt-0.5 shrink-0 text-studio-success" aria-hidden /> {L(f)}</li>)}
                </ul>
                <Link href="/auth" className={cn(p.id === "free" ? secondaryButton : primaryButton, "mt-7")}>{p.id === "student" ? L({ ko: "가입 후 인증하기", en: "Sign up, then verify" }) : L({ ko: "시작하기", en: "Get started" })}</Link>
              </motion.article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[900px] scroll-mt-24 px-4 py-16 md:px-6">
          <motion.h2 {...reveal} className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "시작하기 전에 궁금한 것", en: "Before you start" })}</motion.h2>
          <div className="glass mt-8 divide-y divide-hairline rounded-[28px]">
            {FAQ.filter((f) => ["start", "credits", "sources", "account"].includes(f.category)).slice(0, 6).map((f) => (
              <details key={f.q.en} className="smooth px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium break-keep">{L(f.q)}<Plus size={16} className="smooth-plus shrink-0 text-fg-subtle" aria-hidden /></summary>
                <div className="smooth-body"><div><p className="pt-3 text-sm leading-relaxed break-keep text-fg-muted">{L(f.a)}</p></div></div>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm text-fg-muted">{L({ ko: "더 있어요 →", en: "More →" })} <Link href="/help/faq" className="text-studio-cyan hover:underline">{L({ ko: "전체 질문 보기", en: "All questions" })}</Link></p>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-[1200px] px-4 pt-8 pb-20 md:px-6">
          <motion.div {...reveal} className="glass-strong relative overflow-hidden rounded-[36px] px-6 py-14 text-center md:px-12">
            <div className="studio-gradient-bg absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] leading-tight font-bold tracking-[-0.02em] break-keep">{L({ ko: "오늘 쓰는 브리프 하나가 이번 달 캠페인이 됩니다", en: "Today's brief becomes this month's campaign" })}</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-base leading-relaxed break-keep text-fg-muted">{L({ ko: "가입은 30초, 첫 결과까지 1분이면 충분해요.", en: "Thirty seconds to sign up, a minute to your first result." })}</p>
            <Link href="/auth" className={cn(primaryButton, "relative mt-8 h-12 px-7 text-[15px]")}>{L({ ko: "무료로 시작하기", en: "Start free" })} <ArrowRight size={16} aria-hidden /></Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-hairline px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold"><span className="studio-gradient-bg grid size-7 place-items-center rounded-lg font-display text-sm text-white">H</span> 해봇 AI</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted" aria-label={L({ ko: "바닥글", en: "Footer" })}>
            {[
              ["/tools", { ko: "도구", en: "Tools" }],
              ["/help", { ko: "도움말", en: "Help" }],
              ["/help/faq", { ko: "자주 묻는 질문", en: "FAQ" }],
              ["/help/api-guide", { ko: "API 키 설명서", en: "API key manual" }],
              ["/help/whats-new", { ko: "새로운 점", en: "What's new" }],
              ["/auth", { ko: "로그인", en: "Sign in" }],
            ].map(([href, label]) => <Link key={href as string} href={href as string} className="hover:text-fg">{L(label as { ko: string; en: string })}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}

export { Landing };
