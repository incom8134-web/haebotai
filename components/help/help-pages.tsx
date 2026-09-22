"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, CircleGauge, CircleHelp, Copy, Check, Crown, ExternalLink, Headset, KeyRound, MonitorSmartphone, Search, ShieldCheck, Sparkle, TriangleAlert } from "lucide-react";
import { FAQ } from "@/lib/site/faq";
import { PATCH_NOTES } from "@/lib/site/patch-notes";
import { useBi } from "@/lib/i18n/context";
import { PageHeader, primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

export function HelpTitle({ title, lead }: { title: { ko: string; en: string }; lead?: { ko: string; en: string } }) {
  const L = useBi();
  return <PageHeader title={L(title)} lead={lead ? L(lead) : undefined} />;
}

/** /help — a search box that answers from the FAQ inline, then doors to each help page. */
export function HelpHome() {
  const L = useBi();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits = q ? FAQ.filter((f) => [f.q.ko, f.q.en, f.a.ko, f.a.en].some((s) => s.toLowerCase().includes(q))).slice(0, 4) : [];
  const doors = [
    { href: "/help/faq", icon: CircleHelp, title: { ko: "자주 묻는 질문", en: "FAQ" }, body: { ko: `${FAQ.length}개 질문을 주제별로`, en: `${FAQ.length} answers by topic` } },
    { href: "/help/contact", icon: Headset, title: { ko: "고객센터", en: "Customer service" }, body: { ko: "1:1 문의와 원격 지원", en: "Tickets and remote help" } },
    { href: "/help/api-guide", icon: BookOpenText, title: { ko: "API 키 설명서", en: "API key manual" }, body: { ko: "발급부터 문제 해결까지", en: "From getting a key to fixing errors" } },
    { href: "/account/credits", icon: CircleGauge, title: { ko: "크레딧·한도", en: "Credits & limits" }, body: { ko: "도구별 비용과 사용 한도", en: "Cost per tool and usage limits" } },
    { href: "/account/membership", icon: Crown, title: { ko: "학생 멤버십", en: "Student membership" }, body: { ko: "재학 인증으로 무제한", en: "Unlimited with enrollment" } },
    { href: "/help/whats-new", icon: Sparkle, title: { ko: "새로운 점", en: "What's new" }, body: { ko: `v${PATCH_NOTES[0].version} · ${PATCH_NOTES[0].date}`, en: `v${PATCH_NOTES[0].version} · ${PATCH_NOTES[0].date}` } },
  ];
  return (
    <>
      <PageHeader title={L({ ko: "무엇을 도와드릴까요?", en: "How can we help?" })} lead={L({ ko: "질문을 적으면 바로 답을 찾아 드려요. 없으면 사람에게 물어보세요.", en: "Type a question and we'll find the answer. If not, ask a person." })} />
      <div className="relative mb-10 max-w-2xl">
        <label className="glass-strong flex h-14 items-center gap-3 rounded-2xl px-5">
          <Search size={18} className="text-fg-subtle" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L({ ko: "예: 크레딧이 언제 초기화되나요?", en: "e.g. When do credits reset?" })} className="min-w-0 flex-1 bg-transparent text-base outline-none" aria-label={L({ ko: "도움말 검색", en: "Search help" })} />
        </label>
        {q ? (
          <div className="glass-strong mt-2 rounded-2xl p-2">
            {hits.length ? (
              hits.map((f) => (
                <details key={f.q.en} className="smooth rounded-xl px-4 py-3 hover:bg-surface-2/40">
                  <summary className="cursor-pointer list-none text-sm font-medium">{L(f.q)}</summary>
                  <div className="smooth-body"><div><p className="pt-2 text-sm leading-relaxed text-fg-muted">{L(f.a)}</p></div></div>
                </details>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-fg-muted">
                {L({ ko: "맞는 답이 없어요.", en: "No answer found." })} <Link href="/help/contact" className="text-studio-cyan">{L({ ko: "고객센터에 물어보기", en: "Ask customer service" })}</Link>
              </p>
            )}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {doors.map((d) => (
          <Link key={d.href} href={d.href} className="glass glass-hover group flex items-center gap-4 rounded-[24px] p-5">
            <span className="studio-gradient-bg grid size-11 shrink-0 place-items-center rounded-2xl text-white"><d.icon size={19} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{L(d.title)}</span>
              <span className="block text-sm text-fg-muted">{L(d.body)}</span>
            </span>
            <ArrowRight size={16} className="text-fg-subtle transition-transform duration-500 ease-[var(--spring)] group-hover:translate-x-1" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  );
}

const STEPS = [
  { title: { ko: "Google AI Studio 열기", en: "Open Google AI Studio" }, body: { ko: "Google 계정으로 로그인합니다. 처음이면 약관 동의 화면이 한 번 나와요.", en: "Sign in with a Google account. First time, you'll accept the terms once." } },
  { title: { ko: "키 만들기", en: "Create a key" }, body: { ko: "왼쪽 메뉴 'Get API key' → 'Create API key'. 프로젝트를 물으면 기본 프로젝트를 고르면 됩니다.", en: "Left menu \"Get API key\" → \"Create API key\". If asked for a project, the default one is fine." } },
  { title: { ko: "키 복사", en: "Copy the key" }, body: { ko: "'AIza'로 시작하는 39자 문자열이 키예요. 다른 사람에게 보여 주지 마세요.", en: "The key is a 39-character string starting with \"AIza\". Don't share it." } },
  { title: { ko: "해봇에 등록", en: "Add it to Haebot" }, body: { ko: "계정 → 내 API 키에 붙여 넣고 '확인 후 저장'. Google에 실제로 확인한 뒤에만 저장돼요.", en: "Account → My API key, paste, \"Verify & save\". It's only saved after Google confirms it works." } },
  { title: { ko: "한도 설정 (권장)", en: "Set a limit (recommended)" }, body: { ko: "요금은 내 Google 계정에 청구돼요. Google Cloud 결제 화면에서 예산 알림을 걸어 두세요.", en: "Usage bills to your Google account. Add a budget alert in Google Cloud billing." } },
];

const TROUBLE = [
  { q: { ko: "'Google이 이 키를 거절했어요'가 나와요", en: "\"Google rejected this key\"" }, a: { ko: "키를 삭제했거나 복사할 때 앞뒤가 잘렸을 수 있어요. 새 키를 만들어 다시 붙여 넣으세요. 회사 계정이라면 관리자가 Gemini API를 막아 뒀을 수 있어요.", en: "The key may be deleted or cut off when copying. Create a new one and paste again. On a work account, an admin may have blocked the Gemini API." } },
  { q: { ko: "'형식이 아니에요'가 나와요", en: "\"Not a valid format\"" }, a: { ko: "OpenAI(sk-…) 등 다른 서비스 키가 아니라 Google AI Studio 키('AIza…')여야 해요. 앞뒤 공백도 확인하세요.", en: "It must be a Google AI Studio key (\"AIza…\"), not another provider's (e.g. sk-…). Check for stray spaces." } },
  { q: { ko: "등록했는데 실행이 실패해요", en: "Runs fail after adding a key" }, a: { ko: "내 Google 계정의 무료 한도를 다 썼을 수 있어요. 계정 → 내 API 키에서 '확인'을 눌러 보고, 안 되면 키를 삭제하면 다시 크레딧으로 실행돼요.", en: "Your Google free quota may be used up. Press \"Test\" in Account → My API key; if it fails, delete the key and runs go back to credits." } },
  { q: { ko: "키를 바꾸고 싶어요", en: "I want to change keys" }, a: { ko: "새 키를 붙여 넣으면 기존 키를 덮어써요. 예전 키는 Google AI Studio에서 삭제하세요.", en: "Pasting a new key replaces the old one. Delete the old key in Google AI Studio." } },
];

/** /help/api-guide — the full manual. */
export function ApiGuide() {
  const L = useBi();
  const [copied, setCopied] = useState(false);
  return (
    <>
      <PageHeader title={L({ ko: "API 키 설명서", en: "API key manual" })} lead={L({ ko: "내 Google AI Studio 키로 해봇을 쓰면 크레딧이 차감되지 않아요. 5분이면 끝나요.", en: "Run Haebot on your own Google AI Studio key and no credits are charged. Takes five minutes." })} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="glass rounded-[24px] p-6">
          <h2 className="text-lg font-semibold">{L({ ko: "순서대로 따라 하기", en: "Step by step" })}</h2>
          <ol className="relative mt-5 space-y-6 border-l border-hairline pl-7">
            {STEPS.map((s, i) => (
              <li key={s.title.en} className="relative">
                <span className="studio-gradient-bg absolute top-0 -left-[39px] grid size-6 place-items-center rounded-full font-mono text-[10px] text-white ring-4 ring-[var(--color-bg)]">{i + 1}</span>
                <p className="font-medium">{L(s.title)}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{L(s.body)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={primaryButton}>Google AI Studio <ExternalLink size={14} aria-hidden /></a>
            <Link href="/account/api-key" className={secondaryButton}><KeyRound size={14} aria-hidden /> {L({ ko: "내 API 키 등록", en: "Add my key" })}</Link>
          </div>
        </section>
        <div className="space-y-6">
          <section className="glass rounded-[24px] p-6">
            <h2 className="text-lg font-semibold">{L({ ko: "키는 이렇게 생겼어요", en: "What a key looks like" })}</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-hairline bg-bg/40 p-3 font-mono text-sm">
              <span className="min-w-0 flex-1 truncate">AIzaSyD•••••••••••••••••••••••••••Qx8</span>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText("AIza"); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ignore */ } }} className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:text-fg" aria-label={L({ ko: "접두어 복사", en: "Copy prefix" })}>
                {copied ? <Check size={14} className="text-studio-success" aria-hidden /> : <Copy size={14} aria-hidden />}
              </button>
            </div>
            <p className="mt-2 text-xs text-fg-subtle">{L({ ko: "'AIza'로 시작, 총 39자", en: "Starts with \"AIza\", 39 characters" })}</p>
          </section>
          <section className="glass rounded-[24px] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-studio-success" aria-hidden /> {L({ ko: "보안", en: "Security" })}</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>{L({ ko: "저장 전 Google에 확인 — 작동하는 키만 저장", en: "Checked with Google first — only working keys are saved" })}</li>
              <li>{L({ ko: "서버에서 AES-256-GCM 암호화, 화면엔 끝 4자리만", en: "AES-256-GCM on the server; only the last 4 characters shown" })}</li>
              <li>{L({ ko: "브라우저로 다시 보내지 않음, 실행할 때 서버에서만 사용", en: "Never sent back to the browser; used on the server only" })}</li>
            </ul>
          </section>
          <section className="rounded-[24px] bg-studio-warning/10 p-6">
            <p className="flex items-center gap-2 font-semibold text-studio-warning"><TriangleAlert size={16} aria-hidden /> {L({ ko: "학생 멤버십이라면", en: "On Student membership?" })}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{L({ ko: "이미 크레딧 제한이 없어요. 키를 등록하면 더 높은 모델 한도를 내 계정으로 쓰게 돼요.", en: "You already have no credit limit. A key lets you use higher model quotas on your own account." })}</p>
          </section>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{L({ ko: "문제 해결", en: "Troubleshooting" })}</h2>
        <div className="glass divide-y divide-hairline rounded-[24px]">
          {TROUBLE.map((t) => (
            <details key={t.q.en} className="smooth px-6 py-5">
              <summary className="cursor-pointer list-none font-medium">{L(t.q)}</summary>
              <div className="smooth-body"><div><p className="pt-3 text-sm leading-relaxed text-fg-muted">{L(t.a)}</p></div></div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          <MonitorSmartphone size={14} className="mr-1 inline" aria-hidden />
          {L({ ko: "그래도 안 되면", en: "Still stuck?" })} <Link href="/help/contact?kind=remote" className={cn("text-studio-cyan hover:underline")}>{L({ ko: "원격 지원을 신청하세요", en: "request remote help" })}</Link>
        </p>
      </section>
    </>
  );
}
