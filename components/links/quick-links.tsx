"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpenText, CircleGauge, CircleHelp, Crown, ExternalLink, Headset, Keyboard, LayoutGrid, Library, Sparkle, Sparkles, Star, UserRound } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { WORKFLOWS } from "@/lib/site/guides";
import { useFavorites } from "@/lib/hooks/use-local-list";
import { useBi, useLocale } from "@/lib/i18n/context";
import { PageHeader } from "@/components/site/page";

// /links — one screen of shortcuts: pinned tools, latest results, every
// app page, flows, outside services small businesses use alongside
// Haebot, and keyboard shortcuts.

const PAGES = [
  { href: "/studio", icon: Sparkles, label: { ko: "스튜디오", en: "Studio" } },
  { href: "/tools", icon: LayoutGrid, label: { ko: "전체 도구", en: "All tools" } },
  { href: "/library", icon: Library, label: { ko: "보관함", en: "Library" } },
  { href: "/brand", icon: UserRound, label: { ko: "비즈니스 프로필", en: "Business Profile" } },
  { href: "/account/credits", icon: CircleGauge, label: { ko: "크레딧·한도", en: "Credits & limits" } },
  { href: "/account/membership", icon: Crown, label: { ko: "학생 멤버십", en: "Student membership" } },
  { href: "/help/contact", icon: Headset, label: { ko: "고객센터", en: "Customer service" } },
  { href: "/help/faq", icon: CircleHelp, label: { ko: "자주 묻는 질문", en: "FAQ" } },
  { href: "/help/api-guide", icon: BookOpenText, label: { ko: "API 키 설명서", en: "API key manual" } },
  { href: "/help/whats-new", icon: Sparkle, label: { ko: "새로운 점", en: "What's new" } },
];

const OUTSIDE = [
  { href: "https://aistudio.google.com/apikey", label: { ko: "Google AI Studio", en: "Google AI Studio" }, note: { ko: "내 API 키 발급", en: "Get your API key" } },
  { href: "https://new.smartplace.naver.com", label: { ko: "네이버 스마트플레이스", en: "Naver Smart Place" }, note: { ko: "플레이스 최적화 결과 반영", en: "Apply Place Optimization results" } },
  { href: "https://blog.naver.com", label: { ko: "네이버 블로그", en: "Naver Blog" }, note: { ko: "블로그 원고 발행", en: "Publish blog drafts" } },
  { href: "https://sell.smartstore.naver.com", label: { ko: "스마트스토어 센터", en: "Smartstore Center" }, note: { ko: "상세페이지 업로드", en: "Upload detail pages" } },
  { href: "https://www.k-startup.go.kr", label: { ko: "K-Startup", en: "K-Startup" }, note: { ko: "정부지원사업 공고 원문", en: "Official grant listings" } },
];

function QuickLinks({ recent }: { recent: { id: string; toolId: string; createdAt: string }[] }) {
  const L = useBi();
  const { locale } = useLocale();
  const favorites = useFavorites();
  const pinned = favorites.list.map((id) => getTool(id)).filter((t): t is NonNullable<typeof t> => !!t);
  const name = (id: string) => { const t = getTool(id); return t ? (locale === "en" ? t.name_en : t.name_ko) : id; };
  const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <PageHeader eyebrow={L({ ko: "바로가기", en: "Quick links" })} title={L({ ko: "자주 가는 곳, 한 화면에", en: "Everywhere you go, on one screen" })} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass rounded-[24px] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Star size={17} className="text-studio-warning" aria-hidden /> {L({ ko: "고정한 도구", en: "Pinned tools" })}</h2>
          {pinned.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {pinned.map((t) => (
                <Link key={t.id} href={`/tools/${t.id}/run`} className="glass glass-hover flex items-center gap-3 rounded-2xl p-3">
                  <span className="studio-gradient-bg grid size-9 shrink-0 place-items-center rounded-xl text-white"><t.icon size={16} aria-hidden /></span>
                  <span className="min-w-0 truncate text-sm font-medium">{locale === "en" ? t.name_en : t.name_ko}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-fg-muted">{L({ ko: "도구 화면에서 ★를 누르면 여기와 스튜디오 맨 앞에 고정돼요.", en: "Tap ★ on any tool to pin it here and at the front of the Studio." })} <Link href="/tools" className="text-studio-cyan">{L({ ko: "도구 보기", en: "Browse tools" })}</Link></p>
          )}
          <h2 className="mt-8 text-lg font-semibold">{L({ ko: "최근 결과", en: "Latest results" })}</h2>
          {recent.length ? (
            <ul className="mt-3 divide-y divide-hairline">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/library/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-studio-cyan">
                    <span className="truncate">{name(r.toolId)}</span>
                    <span className="font-mono text-2xs text-fg-subtle">{fmt.format(new Date(r.createdAt))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">{L({ ko: "아직 결과가 없어요.", en: "No results yet." })}</p>
          )}
        </section>

        <section className="glass rounded-[24px] p-6">
          <h2 className="text-lg font-semibold">{L({ ko: "앱 안의 모든 곳", en: "Every page in the app" })}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-2/50">
                <p.icon size={15} className="text-studio-cyan" aria-hidden /> {L(p.label)}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">{L({ ko: "흐름", en: "Flows" })}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.map((w) => (
            <Link key={w.id} href={`/tools/${w.tools[0]}/run`} className="glass glass-hover rounded-[20px] p-4">
              <p className="text-sm font-semibold">{L(w.title)}</p>
              <p className="mt-1 text-2xs text-fg-muted">{w.tools.map(name).join(" → ")}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass rounded-[24px] p-6">
          <h2 className="text-lg font-semibold">{L({ ko: "함께 쓰는 외부 서비스", en: "Services you'll use alongside" })}</h2>
          <ul className="mt-3 divide-y divide-hairline">
            {OUTSIDE.map((o) => (
              <li key={o.href}>
                <a href={o.href} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block text-sm font-medium">{L(o.label)}</span>
                    <span className="block text-2xs text-fg-muted">{L(o.note)}</span>
                  </span>
                  <ExternalLink size={14} className="text-fg-subtle transition-colors group-hover:text-studio-cyan" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="glass rounded-[24px] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Keyboard size={17} className="text-studio-cyan" aria-hidden /> {L({ ko: "단축키", en: "Keyboard shortcuts" })}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["⌘ K", { ko: "도구·페이지 찾기", en: "Find a tool or page" }],
              ["⌘ ↵", { ko: "도구 실행 / 스튜디오 생성", en: "Run a tool / generate in Studio" }],
              ["Esc", { ko: "창 닫기", en: "Close dialogs" }],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">{L(v as { ko: string; en: string })}</dt>
                <dd><kbd className="rounded-lg border border-hairline bg-bg/40 px-2 py-1 font-mono text-xs">{k as string}</kbd></dd>
              </div>
            ))}
          </dl>
          <Link href="/help" className="mt-6 inline-flex items-center gap-1 text-sm text-studio-cyan">{L({ ko: "도움말 홈", en: "Help home" })} <ArrowUpRight size={13} aria-hidden /></Link>
        </section>
      </div>
    </div>
  );
}

export { QuickLinks };
