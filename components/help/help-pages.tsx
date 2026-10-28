"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, CircleGauge, CircleHelp, Copy, Check, Crown, Download, ExternalLink, FileText, Headset, KeyRound, MonitorSmartphone, PlayCircle, Search, ShieldCheck, Sparkle, TriangleAlert, Rocket } from "lucide-react";
import { FAQ } from "@/lib/site/faq";
import { PATCH_NOTES } from "@/lib/site/patch-notes";
import { useBi, useLocale } from "@/lib/i18n/context";
import { PageHeader, primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { OWN_KEY_ONLY } from "@/lib/site/access";

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
    { href: "/onboarding", icon: Rocket, title: { ko: "처음 시작하기", en: "Getting started" }, body: { ko: "목표 → 프로젝트 → 첫 도구, 세 화면", en: "Goal → project → first tool, three screens" } },
    OWN_KEY_ONLY
      ? { href: "/pricing", icon: CircleGauge, title: { ko: "요금", en: "Pricing" }, body: { ko: "AI는 내 API 키로 실행", en: "The AI runs on your own key" } }
      : { href: "/pricing", icon: CircleGauge, title: { ko: "요금·크레딧", en: "Pricing & credits" }, body: { ko: "플랜과 도구별 예상 크레딧", en: "Plans and credits per tool" } },
    { href: "/account/membership", icon: Crown, title: { ko: "학생 멤버십", en: "Student membership" }, body: { ko: "재학 인증으로 무제한", en: "Unlimited with enrollment" } },
    { href: "/legal/terms", icon: ShieldCheck, title: { ko: "약관·정책", en: "Terms & policies" }, body: { ko: "이용약관·개인정보·환불", en: "Terms, privacy, refunds" } },
    { href: "/help/whats-new", icon: Sparkle, title: { ko: "새로운 점", en: "What's new" }, body: { ko: `v${PATCH_NOTES[0].version} · ${PATCH_NOTES[0].date}`, en: `v${PATCH_NOTES[0].version} · ${PATCH_NOTES[0].date}` } },
    { href: "/help/user-guide", icon: FileText, title: { ko: "도구 사용 설명서", en: "Tool user guide" }, body: { ko: "가입부터 인기 도구 6가지까지 (PDF)", en: "Sign-up to six popular tools (PDF)" } },
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
  { title: { ko: "Google AI Studio 열기", en: "Open Google AI Studio" }, body: { ko: "aistudio.google.com에 들어가 Google 계정으로 로그인해요. 처음이면 약관 동의 화면이 한 번 나와요.", en: "Go to aistudio.google.com and sign in with your Google account. The first time, you accept the terms once." } },
  { title: { ko: "키 만들기", en: "Create a key" }, body: { ko: "왼쪽 메뉴 「API Keys」 → 오른쪽 위 「Create API key」. 이름을 적고(예: 해바) 「Create key」를 눌러요. 프로젝트는 「Default Gemini Project」 그대로 두면 돼요.", en: "Left menu \"API Keys\" → \"Create API key\" at the top right. Name it (e.g. Haeba) and click \"Create key\". Leave the project as \"Default Gemini Project\"." } },
  { title: { ko: "키 복사", en: "Copy the key" }, body: { ko: "「Copy key」를 눌러 복사해요. 키는 AQ. 또는 AIza로 시작해요. 비밀번호처럼 다른 사람에게 보여 주지 마세요.", en: "Click \"Copy key\". Keys start with AQ. or AIza. Treat it like a password and don't share it." } },
  { title: { ko: "해바에 붙여넣고 「적용」", en: "Paste it into Haeba and click \"apply\"" }, body: { ko: "오른쪽 메뉴 「API 키」(또는 계정 → 내 API 키)에서 Google Gemini 「1순위」 칸에 붙여넣고 「적용」을 눌러요. 「적용됨 · **** 끝 4자리」가 보이면 연결 완료예요.", en: "Open \"Key\" in the right-hand menu (or Account → My API key), paste into the Google Gemini \"1st priority\" box and click \"apply\". \"Applied · **** last 4\" means you're connected." } },
  { title: { ko: "이미지 도구도 쓰려면 결제 켜기 (선택)", en: "Turn on billing for image tools (optional)" }, body: { ko: "무료 키로는 글·문서·리서치 도구를 쓸 수 있어요. 이미지·광고 사진·모델 컷은 AI Studio에서 키 옆 「Set up billing」으로 결제를 켜야 해요. 해바에서는 바꿀 것이 없어요.", en: "A free key runs the writing, document and research tools. Images, ad photos and model shots need billing: click \"Set up billing\" next to your key in AI Studio. Nothing changes in Haeba." } },
];

const TROUBLE = [
  { q: { ko: "「API 키 필요」가 나와요", en: "\"API key needed\"" }, a: { ko: "아직 키를 등록하지 않았어요. 위 영상과 순서대로 키를 만들어 오른쪽 메뉴 「API 키」에 등록하세요.", en: "No key is registered yet. Follow the video and steps above, then add the key under \"Key\" in the right-hand menu." } },
  { q: { ko: "「AI 엔진 사용 한도를 초과했습니다」가 나와요", en: "\"The AI engine's usage limit was reached\"" }, a: { ko: "무료 키의 오늘 한도를 다 썼어요. 다음 날 오전 9시(한국 시간) 이후 다시 하거나, AI Studio에서 결제를 켜세요. 키를 2·3순위에 더 등록해 두면 자동으로 넘어가요.", en: "The free key's daily limit is used up. Try again after 9 a.m. KST the next day, or turn on billing in AI Studio. Keys added as 2nd and 3rd priority take over automatically." } },
  { q: { ko: "「무료 Gemini 키로는 이미지를 만들 수 없습니다」가 나와요", en: "\"A free Gemini key can't make images\"" }, a: { ko: "이미지 도구는 결제를 켠 키에서만 돼요. AI Studio에서 키 옆 「Set up billing」으로 결제를 켜세요. 같은 키를 그대로 쓰면 돼요.", en: "Image tools need a key with billing on. Click \"Set up billing\" next to your key in AI Studio; keep using the same key." } },
  { q: { ko: "「AI 엔진 요청이 많아…」가 나와요", en: "\"The AI engine is busy right now\"" }, a: { ko: "Google 쪽이 잠시 붐벼요. 몇 분 뒤 「같은 입력으로 다시」를 눌러 주세요.", en: "Google is briefly overloaded. Wait a few minutes, then press \"Run again\"." } },
  { q: { ko: "「등록한 API 키가 거부되었습니다」·「제공사가 이 키를 거절했어요」가 나와요", en: "\"Your API key was refused\" / \"The provider rejected this key\"" }, a: { ko: "키가 지워졌거나, 복사할 때 잘렸거나, 결제가 멈췄을 수 있어요. 새 키를 만들어 다시 등록하고 Google 결제 상태를 확인하세요. 회사 계정이라면 관리자가 Gemini API를 막아 뒀을 수 있어요.", en: "The key may be deleted, cut off when copying, or its billing stopped. Create a new key, register it again and check your Google billing. On a work account, an admin may have blocked the Gemini API." } },
  { q: { ko: "「키 형식이 올바르지 않아요」가 나와요", en: "\"That doesn't look like a valid key\"" }, a: { ko: "다른 서비스 키(예: sk-…)가 아니라 Google AI Studio 키(AQ.… 또는 AIza…)여야 해요. 키 전체를 빠짐없이 복사했는지 확인하세요.", en: "It must be a Google AI Studio key (AQ.… or AIza…), not another provider's (e.g. sk-…). Make sure you copied the whole key." } },
  { q: { ko: "키를 바꾸고 싶어요", en: "I want to change keys" }, a: { ko: "내 API 키 화면에서 기존 키 옆 「삭제」를 누르고 새 키를 붙여넣어 「적용」하세요. 예전 키는 Google AI Studio에서도 지우세요.", en: "On My API key, press \"Delete\" next to the old key, paste the new one and click \"apply\". Delete the old key in Google AI Studio too." } },
];

/** /help/api-guide — the full manual. */
export function ApiGuide() {
  const L = useBi();
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  return (
    <>
      <PageHeader title={L({ ko: "API 키 설명서", en: "API key manual" })} lead={L(OWN_KEY_ONLY ? { ko: "해바의 도구는 내 Google AI Studio 키로 실행돼요. 발급과 등록은 5분이면 끝나요.", en: "Haeba's tools run on your own Google AI Studio key. Getting and adding one takes about 5 minutes." } : { ko: "내 Google AI Studio 키로 해바를 쓰면 크레딧이 차감되지 않아요. 5분이면 끝나요.", en: "Run Haeba on your own Google AI Studio key and no credits are charged. Takes five minutes." })} />
      {/* Watch first: the 8-step walkthrough (search → create → copy → paste → applied), then the full manuals with screenshots. */}
      <section id="video" className="mb-6 grid scroll-mt-24 grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><PlayCircle size={18} className="text-studio-cyan" aria-hidden /> {L({ ko: "영상으로 보기", en: "Watch how" })}</h2>
          <video
            controls
            playsInline
            preload="metadata"
            poster="/videos/api-key-walkthrough-poster.jpg"
            aria-label={L({ ko: "Google AI Studio 검색부터 키 만들기, 복사, 해바에 붙여넣기까지 8단계 영상 (1분 19초, 한국어 음성)", en: "Video: 8 steps from searching for Google AI Studio to creating, copying and pasting the key into Haeba (1 min 19 s, Korean voice)" })}
            className="aspect-video w-full rounded-[24px] border border-hairline bg-surface-2 object-contain"
          >
            <source src="/videos/api-key-walkthrough.mp4" type="video/mp4" />
            <track kind="captions" src="/videos/api-key-walkthrough.ko.vtt" srcLang="ko" label="한국어" default={locale === "ko"} />
            <track kind="captions" src="/videos/api-key-walkthrough.en.vtt" srcLang="en" label="English" default={locale === "en"} />
          </video>
          <p className="mt-2 text-xs text-fg-subtle">{L({ ko: "8단계 · 1분 19초 · 한국어 음성 · 자막 한국어/영어", en: "8 steps · 1 min 19 s · Korean voice · captions in Korean and English" })}</p>
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText size={18} className="text-studio-cyan" aria-hidden /> {L({ ko: "화면으로 따라 하는 설명서 (PDF)", en: "Illustrated manual (PDF)" })}</h2>
          <p className="mb-3 text-sm leading-relaxed text-fg-muted">{L({ ko: "키 발급, 해바에 연결, 첫 결과 받기까지 화면 캡처로 하나하나 보여 줘요. 12쪽.", en: "Screenshots of every step: getting a key, connecting it to Haeba and getting your first result. 12 pages." })}</p>
          <div className="space-y-2">
            {[
              { href: "/guides/ai-haeba-api-key-guide-ko.pdf", file: "AI해바_API키_연결가이드.pdf", title: "한국어 설명서", size: "3.0 MB" },
              { href: "/guides/ai-haeba-api-key-guide-en.pdf", file: "AI_Haeba_API_Key_Setup_Guide.pdf", title: "English manual", size: "2.7 MB" },
            ].map((d) => (
              <a key={d.href} href={d.href} download={d.file} className="glass glass-hover group flex items-center gap-3 rounded-2xl p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-studio-cyan/15 text-studio-cyan"><FileText size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.title}</span>
                  <span className="block text-xs text-fg-subtle">PDF · {d.size}</span>
                </span>
                <Download size={16} className="text-fg-subtle transition-transform duration-500 ease-[var(--spring)] group-hover:translate-y-0.5" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="glass min-w-0 rounded-[24px] p-6">
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
        <div className="min-w-0 space-y-6">
          <section className="glass rounded-[24px] p-6">
            <h2 className="text-lg font-semibold">{L({ ko: "키는 이렇게 생겼어요", en: "What a key looks like" })}</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-hairline bg-bg/40 p-3 font-mono text-sm">
              <span className="min-w-0 flex-1 truncate">AQ.Ab8RN6•••••••••••••••••••••••••••••••••Qx8</span>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText("AQ."); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ignore */ } }} className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:text-fg" aria-label={L({ ko: "접두어 복사", en: "Copy prefix" })}>
                {copied ? <Check size={14} className="text-studio-success" aria-hidden /> : <Copy size={14} aria-hidden />}
              </button>
            </div>
            <p className="mt-2 text-xs text-fg-subtle">{L({ ko: "'AQ.'로 시작 (예전 키는 'AIza…', 39자)", en: "Starts with \"AQ.\" (older keys: \"AIza…\", 39 characters)" })}</p>
          </section>
          <section className="glass rounded-[24px] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-studio-success" aria-hidden /> {L({ ko: "보안", en: "Security" })}</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>{L({ ko: "저장 전 Google에 확인 — 작동하는 키만 저장", en: "Checked with Google first — only working keys are saved" })}</li>
              <li>{L({ ko: "서버에서 AES-256-GCM 암호화, 화면엔 끝 4자리만", en: "AES-256-GCM on the server; only the last 4 characters shown" })}</li>
              <li>{L({ ko: "브라우저로 다시 보내지 않음, 실행할 때 서버에서만 사용", en: "Never sent back to the browser; used on the server only" })}</li>
            </ul>
          </section>
          {OWN_KEY_ONLY ? null : (
            <section className="rounded-[24px] bg-studio-warning/10 p-6">
              <p className="flex items-center gap-2 font-semibold text-fg"><TriangleAlert size={16} className="text-studio-warning" aria-hidden /> {L({ ko: "학생 멤버십이라면", en: "On Student membership?" })}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{L({ ko: "이미 크레딧 제한이 없어요. 키를 등록하면 더 높은 모델 한도를 내 계정으로 쓰게 돼요.", en: "You already have no credit limit. A key lets you use higher model quotas on your own account." })}</p>
            </section>
          )}
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

const GUIDE_FILES = [
  { lang: "ko", href: "/guides/ai-haeba-user-guide-ko.pdf", file: "AI해바_도구_사용설명서.pdf", title: "한국어 설명서", size: "4.8 MB" },
  { lang: "en", href: "/guides/ai-haeba-user-guide-en.pdf", file: "AI_Haeba_Tool_User_Guide.pdf", title: "English guide", size: "4.3 MB" },
] as const;

const GUIDE_CHAPTERS = [
  { ko: "가입하기", en: "Sign up" },
  { ko: "첫 안내 따라가기", en: "The first-time guide" },
  { ko: "내 API 키 연결하기", en: "Connect your API key" },
  { ko: "비즈니스 프로필 채우기", en: "Fill in your business profile" },
  { ko: "화면 둘러보기", en: "Finding your way around" },
  { ko: "바로 만들기로 첫 결과 만들기", en: "Your first result with Quick start" },
  { ko: "결과 보고 내려받기", en: "View and download results" },
  { ko: "보관함에서 다시 찾기", en: "Find it again in the Library" },
  { ko: "인기 도구 6가지 따라 하기", en: "Six popular tools, step by step" },
  { ko: "막혔을 때", en: "When you get stuck" },
];

const GUIDE_TOOLS = [
  { ko: "브랜드 DNA 스튜디오", en: "Brand DNA Studio" },
  { ko: "로고 디렉션 랩", en: "Logo Direction Lab" },
  { ko: "광고 크리에이티브 팩토리", en: "Ad Creative Factory" },
  { ko: "콘텐츠 변환기", en: "Content Transformer" },
  { ko: "피치 비주얼 디렉터", en: "Pitch Visual Director" },
  { ko: "웹 익스피리언스 빌더", en: "Web Experience Builder" },
];

/** /help/user-guide — the illustrated tool manual (PDF, Korean and English). */
export function UserGuide() {
  const L = useBi();
  const { locale } = useLocale();
  const mine = GUIDE_FILES.find((f) => f.lang === locale) ?? GUIDE_FILES[0];
  return (
    <>
      <PageHeader
        title={L({ ko: "도구 사용 설명서", en: "Tool user guide" })}
        lead={L({ ko: "처음 쓰는 사장님을 위해, 가입부터 결과물 내려받기까지 실제 화면으로 하나씩 보여 드려요. 27쪽.", en: "For first-time owners: every step from sign-up to downloading your results, shown on real screens. 27 pages." })}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <section className="min-w-0">
          <div className="grid grid-cols-3 gap-3">
            {["p01", "p15", "p17"].map((p) => (
              <a key={p} href={mine.href} target="_blank" rel="noreferrer" className="glass glass-hover block overflow-hidden rounded-2xl p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static page previews */}
                <img src={`/guides/ai-haeba-user-guide-${mine.lang}-${p}.jpg`} alt="" width={480} height={679} loading="lazy" className="w-full rounded-xl" />
              </a>
            ))}
          </div>
          <a href={mine.href} target="_blank" rel="noreferrer" className={cn(primaryButton, "mt-5 h-12 w-full")}>
            <BookOpenText size={16} aria-hidden /> {L({ ko: "설명서 열기", en: "Open the guide" })}
          </a>
          <div className="mt-3 space-y-2">
            {GUIDE_FILES.map((d) => (
              <a key={d.href} href={d.href} download={d.file} className="glass glass-hover group flex items-center gap-3 rounded-2xl p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-studio-cyan/15 text-studio-cyan"><FileText size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.title}</span>
                  <span className="block text-xs text-fg-subtle">PDF · {d.size}</span>
                </span>
                <Download size={16} className="text-fg-subtle transition-transform duration-500 ease-[var(--spring)] group-hover:translate-y-0.5" aria-hidden />
              </a>
            ))}
          </div>
        </section>
        <section className="glass min-w-0 rounded-[24px] p-6">
          <h2 className="text-lg font-semibold">{L({ ko: "이런 내용이 들어 있어요", en: "What's inside" })}</h2>
          <ol className="mt-4 space-y-2.5">
            {GUIDE_CHAPTERS.map((c, i) => (
              <li key={c.en} className="flex items-baseline gap-3 text-sm">
                <span className="w-5 shrink-0 font-mono text-xs text-studio-cyan">{i + 1}</span>
                <span className="text-fg">{L(c)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {GUIDE_TOOLS.map((t) => (
              <span key={t.en} className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-fg-muted">{L(t)}</span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-fg-muted">
            {L({ ko: "API 키를 받는 방법은 따로 정리해 뒀어요. ", en: "Getting an API key has its own guide: " })}
            <Link href="/help/api-guide" className="text-studio-cyan hover:underline">{L({ ko: "API 키 설명서 보기", en: "API key manual" })}</Link>
          </p>
        </section>
      </div>
    </>
  );
}
