"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CircleCheck, CircleGauge, Crown, ExternalLink, GraduationCap, KeyRound, LogOut, PlayCircle, Trash2 } from "lucide-react";
import { PLANS, planName } from "@/lib/site/plans";
import { requestStudentVerification, requestTaxInvoice, type StudentRequestState, type TaxInvoiceState } from "@/lib/actions/membership";
import { deleteApiKey, saveApiKey, testApiKey, type ApiKeyActionState } from "@/lib/actions/api-keys";
import { useBi } from "@/lib/i18n/context";
import { useKeepInputForm } from "@/lib/hooks/use-keep-input-form";
import type { Membership, PaymentRecord } from "@/lib/membership";
import type { ApiKeyPriority, ApiKeyProvider, ApiKeySlot, ApiKeyStatus } from "@/lib/api-keys";
import { getToolCapability } from "@/lib/ai/capabilities";
import { listTools } from "@/lib/tools/registry";
import { PageHeader, inputClass, primaryButton, secondaryButton, textareaClass } from "@/components/site/page";
import { cn } from "@/lib/utils";
import type { ConsentState } from "@/lib/consent";
import { FREE_OWN_KEY, MEMBER_API_KEYS, MEMBER_KEY_PROVIDERS, OWN_KEY_ONLY, STUDENT_PLAN } from "@/lib/site/access";
import { isPaidPlan, PRODUCTS } from "@/lib/payments/pro";
import { UpgradeCard } from "@/components/upgrade-button";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

// Which tools currently run on a given provider, read live from the
// capability map so this list can never drift out of sync with reality.
function toolNamesForProvider(provider: ApiKeyProvider): { ko: string; en: string }[] {
  return listTools()
    .filter((tool) => getToolCapability(tool.id)?.providers.includes(provider))
    .map((tool) => ({ ko: tool.name_ko, en: tool.name_en }));
}

// Account pages, each its own URL under /account: overview, credits &
// limits (credits-view.tsx), student membership, and my API key.

const STUDENT_MSG: Record<string, { ko: string; en: string }> = {
  submitted: { ko: "신청했어요. 영업일 1~2일 안에 알려 드려요.", en: "Submitted — we'll reply within 1–2 business days." },
  closed: { ko: "학생 멤버십 신청을 받지 않아요. 내 API 키를 등록하면 모든 도구를 쓸 수 있어요.", en: "Student membership is closed. Add your own API key to use every tool." },
  school_required: { ko: "학교 이름을 입력해 주세요.", en: "Enter your school name." },
  school_email_invalid: { ko: "학교 이메일은 ac.kr 또는 edu 주소여야 해요. 없으면 비워 두고 비고에 적어 주세요.", en: "School emails end in ac.kr or edu. No school email? Leave it blank and add a note." },
  already_pending: { ko: "이미 검토 중인 신청이 있어요.", en: "You already have a request under review." },
  signed_out: { ko: "로그인이 필요해요.", en: "Please sign in." },
  rate_limited: { ko: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.", en: "Too many requests — try again in a few minutes." },
};
const KEY_MSG: Record<string, { ko: string; en: string }> = {
  saved: { ko: "확인하고 저장했어요.", en: "Verified and saved." },
  deleted: { ko: "삭제했어요.", en: "Deleted." },
  valid: { ko: "키가 잘 작동해요.", en: "Your key works." },
  invalid_format: { ko: "키 형식이 올바르지 않아요.", en: "That doesn't look like a valid key for this provider." },
  rejected_by_provider: { ko: "제공사가 이 키를 거절했어요. 키가 살아 있는지 확인해 주세요.", en: "The provider rejected this key. Check that it's still active." },
  server_disabled: { ko: "이 서버에는 키 저장이 설정되지 않았어요.", en: "Key storage isn't configured on this server." },
  no_key: { ko: "등록된 키가 없어요.", en: "No key saved." },
  signed_out: { ko: "로그인이 필요해요.", en: "Please sign in." },
  rate_limited: { ko: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.", en: "Too many requests — try again in a few minutes." },
  save_failed: { ko: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", en: "Couldn't save. Please try again shortly." },
};

// The placeholder is an example of the key's shape, never a real key.
const PROVIDER_INFO: Record<ApiKeyProvider, { name: string; placeholder: { ko: string; en: string } }> = {
  google: { name: "Google Gemini", placeholder: { ko: "예: AIzaSyA1b2C3d4… 또는 AQ.Ab8RN6…", en: "e.g. AIzaSyA1b2C3d4… or AQ.Ab8RN6…" } },
  anthropic: { name: "Anthropic (Claude)", placeholder: { ko: "예: sk-ant-api03-…", en: "e.g. sk-ant-api03-…" } },
};

function providerDescription(provider: ApiKeyProvider): { ko: string; en: string } {
  if (provider === "google") {
    return {
      ko: "1순위부터 차례로 쓰고, 한도가 차면 다음 순위 키로 자동 전환해요. 비용은 해바가 아닌 본인 Google 계정으로 청구돼요.",
      en: "Used in priority order, switching automatically when one hits its quota. Costs are billed to your own Google account, not Haeba.",
    };
  }
  const tools = toolNamesForProvider(provider);
  if (tools.length === 0) return { ko: "", en: "" };
  return {
    ko: `${tools.map((t) => t.ko).join(", ")}에 쓰여요. 1순위부터 차례로 자동 전환돼요.`,
    en: `Powers ${tools.map((t) => t.en).join(", ")}. Switches automatically in priority order.`,
  };
}

function AccountOverview({ email, balance, membership, apiKey, brandName, signOut, consent, host = false }: { email: string; balance: number | null; membership: Membership; apiKey: ApiKeyStatus; brandName: string | null; signOut: () => void; consent: ConsentState | null; host?: boolean }) {
  const L = useBi();
  const plan = { name: planName(membership.plan) };
  const allDoors = [
    { href: "/account/credits", icon: CircleGauge, title: { ko: "크레딧·한도", en: "Credits & limits" }, value: STUDENT_PLAN && membership.plan === "student" ? L({ ko: "제한 없음", en: "Unlimited" }) : L({ ko: `${(balance ?? 0).toLocaleString()} 남음`, en: `${(balance ?? 0).toLocaleString()} left` }) },
    { href: "/account/membership", icon: Crown, title: { ko: "멤버십", en: "Membership" }, value: isPaidPlan(membership.plan) ? L({ ko: `${plan.name.ko} · ${membership.daysLeft ?? 0}일 남음`, en: `${plan.name.en} · ${membership.daysLeft ?? 0} days left` }) : L({ ko: "플랜 고르기", en: "Choose a plan" }) },
    { href: "/account/api-key", icon: KeyRound, title: { ko: "내 API 키", en: "My API key" }, value: apiKey.connected ? L(OWN_KEY_ONLY ? { ko: "연결됨", en: "Connected" } : { ko: "연결됨 · 크레딧 미차감", en: "Connected · no credits" }) : L(OWN_KEY_ONLY ? { ko: "등록 필요", en: "Needed" } : { ko: "없음", en: "None" }) },
  ];
  // No credits or plans while members bring their own key (lib/site/access.ts): the key is the one door that matters.
  // SaaS mode hides members' own keys (lib/site/access.ts).
  const doors = OWN_KEY_ONLY ? allDoors.filter((d) => d.href === "/account/api-key") : MEMBER_API_KEYS ? allDoors : allDoors.filter((d) => d.href !== "/account/api-key");
  return (
    <>
      <h1 className="sr-only">{L({ ko: "내 계정", en: "My account" })}</h1>
      {/* Identity */}
      <section className="glass-strong flex flex-wrap items-center gap-4 rounded-[28px] p-6">
        <span className="studio-gradient-bg grid size-14 place-items-center rounded-[18px] text-lg font-semibold text-white">{email[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{email}</p>
          <p className="text-sm text-fg-muted">
            {OWN_KEY_ONLY ? L({ ko: "내 API 키로 사용", en: "On your own API key" }) : L(plan.name)}
            {!OWN_KEY_ONLY && membership.daysLeft !== null ? ` · D-${membership.daysLeft}` : ""} · {brandName ? <Link href="/brand" className="hover:text-fg">{brandName}</Link> : <Link href="/brand" className="text-studio-cyan">{L({ ko: "프로필 설정하기", en: "Set up profile" })}</Link>}
          </p>
        </div>
        {OWN_KEY_ONLY ? null : (
          <div className="text-right">
            <p className="font-mono text-2xl">{STUDENT_PLAN && membership.plan === "student" ? "∞" : (balance ?? 0).toLocaleString()}</p>
            <p className="text-2xs text-fg-subtle">{L({ ko: "크레딧", en: "credits" })}</p>
          </div>
        )}
        <form action={signOut}>
          <button type="submit" className={cn(secondaryButton, "h-10")}><LogOut size={14} aria-hidden /> {L({ ko: "로그아웃", en: "Sign out" })}</button>
        </form>
      </section>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {doors.map((d) => (
          <Link key={d.href} href={d.href} className="glass glass-hover group rounded-[24px] p-5">
            <d.icon size={20} className="text-studio-cyan" aria-hidden />
            <p className="mt-4 font-semibold">{L(d.title)}</p>
            <p className="mt-0.5 flex items-center justify-between text-sm text-fg-muted">{d.value}<ArrowRight size={15} className="transition-transform duration-500 ease-[var(--spring)] group-hover:translate-x-1" aria-hidden /></p>
          </Link>
        ))}
      </div>
      {OWN_KEY_ONLY ? null : <p className="mt-6 text-sm text-fg-muted">{L(plan.name)} · {brandName ?? L({ ko: "프로필 없음", en: "No profile" })}</p>}

      {!OWN_KEY_ONLY && isPaidPlan(membership.plan) && membership.daysLeft !== null && membership.daysLeft <= 7 ? (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-hairline bg-surface-2 p-5" aria-labelledby="plan-ending">
          <div className="min-w-0">
            <h2 id="plan-ending" className="font-semibold">{L({ ko: `${plan.name.ko}가 ${membership.daysLeft}일 뒤 끝나요`, en: `${plan.name.en} ends in ${membership.daysLeft} days` })}</h2>
            <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "자동 결제는 없어요. 계속 쓰려면 직접 연장해 주세요 — 남은 기간에 30일이 더해져요.", en: "There's no automatic renewal. Extend it yourself to keep going — 30 days are added to what's left." })}</p>
          </div>
          <Link href={`/account/membership/checkout?product=${membership.plan}`} className={cn(primaryButton, "h-10")}>{L({ ko: "30일 연장하기", en: "Extend 30 days" })}</Link>
        </section>
      ) : null}

      <UpgradeCard plan={membership.plan} host={host} className="mt-6" />

      <ConsentPanel consent={consent} />

      <p className="mt-16 text-right text-2xs text-fg-subtle">
        <Link href="/account/delete" className="underline-offset-4 hover:text-fg-muted hover:underline">{L({ ko: "회원 탈퇴", en: "Delete account" })}</Link>
      </p>
    </>
  );
}

/** What the member agreed to, and the marketing email switch (정보통신망법 §50). */
function ConsentPanel({ consent }: { consent: ConsentState | null }) {
  const L = useBi();
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);
  const [at, setAt] = useState(consent?.marketing_at ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—");
  const toggle = (next: boolean) =>
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/account/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optIn: next }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; at?: string };
      if (!res.ok) return setError(data.error ?? "저장하지 못했어요");
      setMarketing(next);
      setAt(data.at ?? new Date().toISOString());
    });
  return (
    <section className="mt-12 rounded-[24px] border border-hairline p-5 md:p-6" aria-labelledby="consents">
      <h2 id="consents" className="font-semibold">{L({ ko: "동의 내역과 수신 설정", en: "Consents and emails" })}</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-fg-muted">{L({ ko: "이용약관·개인정보 처리방침", en: "Terms · privacy policy" })}</dt>
        <dd>{L({ ko: `${day(consent?.terms_at)} 동의 (버전 ${consent?.v ?? "—"})`, en: `Agreed ${day(consent?.terms_at)} (version ${consent?.v ?? "—"})` })}</dd>
        <dt className="text-fg-muted">{L({ ko: "개인정보 국외 이전", en: "Transfer abroad" })}</dt>
        <dd>{L({ ko: `${day(consent?.overseas_at)} 동의`, en: `Agreed ${day(consent?.overseas_at)}` })}</dd>
        <dt className="text-fg-muted">{L({ ko: "만 14세 이상 확인", en: "Age 14+ confirmed" })}</dt>
        <dd>{day(consent?.age14_at)}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <div className="min-w-0">
          <p id="mk-label" className="text-sm font-medium">{L({ ko: "이벤트·새 기능 소식 이메일 (선택)", en: "Event and feature emails (optional)" })}</p>
          <p className="text-xs text-fg-muted">
            {marketing ? L({ ko: `수신 중 · ${day(at)} 동의`, en: `On · agreed ${day(at)}` }) : L({ ko: `받지 않음${at ? ` · ${day(at)} 변경` : ""}`, en: `Off${at ? ` · changed ${day(at)}` : ""}` })}
            {" · "}
            {L({ ko: "로그인·결제 안내 같은 필수 메일은 설정과 관계없이 보내요.", en: "Sign-in and payment notices are sent regardless." })}
          </p>
        </div>
        <button type="button" role="switch" aria-checked={marketing} aria-labelledby="mk-label" disabled={pending} onClick={() => toggle(!marketing)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2", marketing ? "bg-studio-cyan" : "bg-fg/20")}>
          <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", marketing ? "translate-x-5" : "")} />
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

/** 회원 탈퇴 (/account/delete): what goes, what the law keeps, then type "탈퇴" to confirm. */
function DeleteAccountPanel({ balance }: { balance: number | null }) {
  const L = useBi();
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: word.trim() }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(data.error ?? "탈퇴를 끝내지 못했습니다");
      router.replace("/?deleted=1");
      router.refresh();
    });
  return (
    <>
      <PageHeader title={L({ ko: "회원 탈퇴", en: "Delete account" })} lead={L({ ko: "계정과 모든 결과물을 지웁니다. 되돌릴 수 없어요. 아래 내용을 꼭 확인해 주세요.", en: "Deletes your account and every result. This can't be undone — please read the notes below first." })} />
      <section className="rounded-[24px] border border-danger/30 p-5 md:p-6" aria-labelledby="delete-account">
        <h2 id="delete-account" className="flex items-center gap-2 font-semibold text-danger dark:text-[#ff6b8b]">
          <AlertTriangle size={16} aria-hidden /> {L({ ko: "탈퇴 전에 확인하세요", en: "Before you delete" })}
        </h2>
        <div className="mt-3 space-y-4 text-sm">
          <ul className="list-disc space-y-1 pl-5 break-keep text-fg-muted">
            <li>{L(MEMBER_API_KEYS ? { ko: "보관함의 모든 결과물과 파일, 비즈니스 프로필, 등록한 API 키가 바로 삭제됩니다.", en: "All results and files, your business profile and saved API keys are deleted right away." } : { ko: "보관함의 모든 결과물과 파일, 비즈니스 프로필이 바로 삭제됩니다.", en: "All results and files and your business profile are deleted right away." })}</li>
            {OWN_KEY_ONLY ? null : <li>{L({ ko: `남은 크레딧${balance ? ` ${balance.toLocaleString()}` : ""}은 사라지며 환불되지 않습니다. 결제 후 7일이 지나지 않은 플랜·충전 결제는 탈퇴 전에 고객센터로 환불을 먼저 요청해 주세요.`, en: "Remaining credits are lost and not refunded. For a plan or top-up paid in the last 7 days, ask customer service for a refund before deleting." })}</li>}
            <li>{L(OWN_KEY_ONLY ? { ko: "계약 기록(5년)과 문의·분쟁 처리 기록(3년)은 전자상거래법에 따라 분리 보관한 뒤 파기합니다.", en: "Contract records (5 years) and complaint records (3 years) are kept separately as the e-commerce law requires, then destroyed." } : { ko: "결제·계약 기록(5년)과 문의·분쟁 처리 기록(3년)은 전자상거래법에 따라 분리 보관한 뒤 파기합니다.", en: "Payment and contract records (5 years) and complaint records (3 years) are kept separately as the e-commerce law requires, then destroyed." })}</li>
            <li>{L({ ko: "같은 이메일로 다시 가입할 수 있지만, 새 계정으로 시작합니다.", en: "You can sign up again with the same email, as a new account." })}</li>
          </ul>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-danger)]" />
            <span className="break-keep text-fg">{L({ ko: "위 내용을 모두 확인했고, 되돌릴 수 없다는 것을 이해했습니다.", en: "I've read the above and understand this can't be undone." })}</span>
          </label>
          <label className="block">
            <span className="text-fg">{L({ ko: "확인을 위해 '탈퇴'라고 입력해 주세요", en: "Type 탈퇴 to confirm" })}</span>
            <input value={word} onChange={(e) => setWord(e.target.value)} disabled={!understood} className={cn(inputClass, "mt-1.5 disabled:opacity-50")} autoComplete="off" />
          </label>
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!understood || word.trim() !== "탈퇴" || pending} onClick={run} className={cn(primaryButton, "h-10 bg-danger bg-none text-white shadow-none hover:shadow-none disabled:opacity-40")}>
              <Trash2 size={14} aria-hidden /> {pending ? L({ ko: "삭제하는 중…", en: "Deleting…" }) : L({ ko: "영구 탈퇴", en: "Delete permanently" })}
            </button>
            <Link href="/account" className={cn(secondaryButton, "h-10")}>
              {L({ ko: "취소", en: "Cancel" })}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function MembershipPanel({ membership, payments }: { membership: Membership; payments: PaymentRecord[] }) {
  const L = useBi();
  const [studentState, studentAction, studentPending] = useActionState<StudentRequestState, FormData>(requestStudentVerification, null);
  const [studentRef, onStudentSubmit] = useKeepInputForm(studentAction, studentState);
  const request = studentState?.ok ? "pending" : membership.studentRequest;
  return (
    <>
      <PageHeader
        title={L({ ko: "멤버십", en: "Membership" })}
        lead={L(FREE_OWN_KEY ? { ko: "무료 플랜은 내 Gemini API 키로, 플러스와 프로는 키 없이 크레딧으로 모든 도구를 실행해요. 30일 이용권이라 자동 결제는 없고, 남은 기간에 이어서 연장돼요.", en: "Free runs every tool on your own Gemini API key; Plus and Pro run on credits, without a key. Each is a 30-day pass with no auto-renewal, and buying again extends what's left." } : { ko: "무료로 둘러보고, 플러스나 프로로 모든 도구를 실행해요. 30일 이용권이라 자동 결제는 없고, 남은 기간에 이어서 연장돼요.", en: "Browse free; run every tool on Plus or Pro. Each is a 30-day pass with no auto-renewal, and buying again extends what's left." })}
      />
      {/* Plan */}
      <section>
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = p.id === membership.plan || (p.id === "free" && !isPaidPlan(membership.plan));
            return (
              <div key={p.id} className={cn("glass flex flex-col rounded-[24px] p-5", current && "ring-1 ring-studio-cyan/50")}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{L(p.name)}</p>
                  {current ? <span className="rounded-full bg-studio-cyan/15 px-2.5 py-0.5 text-2xs font-semibold text-studio-cyan">{L({ ko: "지금", en: "Current" })}</span> : null}
                </div>
                <p className="mt-2 font-display text-2xl font-bold">{L(p.price)}</p>
                <p className="mt-1 text-sm text-fg-muted">{L(p.credits)}</p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-fg-muted">
                  {p.features.slice(0, 3).map((f) => <li key={f.en} className="flex gap-2 break-keep"><Check size={14} className="mt-0.5 shrink-0 text-studio-success" aria-hidden /> {L(f)}</li>)}
                </ul>
                {p.id !== "free" ? (
                  <>
                    {current && membership.daysLeft ? <p className="mt-3 text-sm text-fg-muted">{L({ ko: `${membership.daysLeft}일 남음`, en: `${membership.daysLeft} days left` })}</p> : null}
                    <Link href={`/account/membership/checkout?product=${p.id}`} className={cn(current || !isPaidPlan(membership.plan) ? primaryButton : secondaryButton, "mt-4 h-10")}>
                      {current ? L({ ko: "30일 연장하기", en: "Extend 30 days" }) : L({ ko: `${p.name.ko} 시작하기`, en: `Get ${p.name.en}` })} <ArrowRight size={13} aria-hidden />
                    </Link>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        {isPaidPlan(membership.plan) ? (
          <div className="glass mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-5">
            <div className="min-w-0">
              <p className="font-semibold">{L({ ko: `크레딧 ${PRODUCTS.topup.credits} 충전 · ${won(PRODUCTS.topup.amount)}`, en: `Top up ${PRODUCTS.topup.credits} credits · ${won(PRODUCTS.topup.amount)}` })}</p>
              <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "이용 기간 중 크레딧이 모자라면 충전하세요. 충전한 크레딧은 유효기간이 없어요.", en: "Running low during your plan? Top up — top-up credits never expire." })}</p>
            </div>
            <Link href="/account/membership/checkout?product=topup" className={cn(primaryButton, "h-10")}>{L({ ko: "충전하기", en: "Top up" })}</Link>
          </div>
        ) : null}

        {STUDENT_PLAN ? (
        <div className="glass mt-4 grid gap-6 rounded-[24px] p-6 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 font-semibold"><GraduationCap size={18} className="text-studio-cyan" aria-hidden /> {L({ ko: "학생은 재학 인증 후 무제한", en: "Students: unlimited after verification" })}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{L({ ko: "재학 인증을 하면 1년 동안 크레딧 걱정 없이 써요. 학교 이메일이 있으면 가장 빨라요.", en: "Verify enrollment for a year without credit limits. A school email is fastest." })}</p>
          </div>
          {membership.plan === "student" ? (
            <p className="grid place-items-center rounded-2xl bg-studio-success/10 p-6 text-center text-sm text-studio-success">{L({ ko: "학생 멤버십을 쓰고 있어요.", en: "Your Student membership is active." })}</p>
          ) : request === "pending" ? (
            <p className="grid place-items-center rounded-2xl bg-studio-cyan/10 p-6 text-center text-sm">{L({ ko: "신청을 검토하고 있어요.", en: "We're reviewing your request." })}</p>
          ) : (
            <form ref={studentRef} onSubmit={onStudentSubmit} className="space-y-3">
              {request === "rejected" ? <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{L({ ko: "지난 신청은 승인되지 않았어요. 재학증명서 정보를 비고에 적어 다시 신청해 주세요.", en: "Your last request wasn't approved. Add certificate details in the note and try again." })}</p> : null}
              <input name="schoolName" required minLength={2} maxLength={80} className={inputClass} placeholder={L({ ko: "학교 이름 *", en: "School name *" })} aria-label={L({ ko: "학교 이름", en: "School name" })} />
              <input name="schoolEmail" type="email" className={inputClass} placeholder={L({ ko: "학교 이메일 (선택)", en: "School email (optional)" })} aria-label={L({ ko: "학교 이메일", en: "School email" })} />
              <textarea name="note" rows={2} maxLength={500} className={textareaClass} placeholder={L({ ko: "비고 (선택)", en: "Note (optional)" })} aria-label={L({ ko: "비고", en: "Note" })} />
              {studentState ? <p role="status" className={cn("text-sm", studentState.ok ? "text-studio-success" : "text-danger")}>{L(STUDENT_MSG[studentState.message] ?? { ko: studentState.message, en: studentState.message })}</p> : null}
              <button type="submit" disabled={studentPending} className={primaryButton}>{studentPending ? L({ ko: "보내는 중…", en: "Sending…" }) : L({ ko: "인증 신청", en: "Apply" })}</button>
            </form>
          )}
        </div>
        ) : null}
      </section>

      {payments.length > 0 ? <PaymentHistory payments={payments} /> : null}
    </>
  );
}

const PAYMENT_STATUS: Record<PaymentRecord["status"], { ko: string; en: string }> = {
  done: { ko: "결제 완료", en: "Paid" },
  pending: { ko: "확인 중", en: "Confirming" },
  failed: { ko: "실패", en: "Failed" },
  canceled: { ko: "취소·환불", en: "Canceled / refunded" },
};

const INVOICE_STATUS: Record<NonNullable<PaymentRecord["taxInvoice"]>, { ko: string; en: string }> = {
  requested: { ko: "세금계산서 신청됨", en: "Tax invoice requested" },
  issued: { ko: "세금계산서 발행됨", en: "Tax invoice issued" },
  rejected: { ko: "세금계산서 반려", en: "Tax invoice declined" },
};

const INVOICE_MSG: Record<string, { ko: string; en: string }> = {
  invoice_requested: { ko: "신청했어요. 영업일 2일 안에 적어 주신 메일로 발행해 드려요.", en: "Requested — we'll issue it to that email within 2 business days." },
  business_no_invalid: { ko: "사업자등록번호 10자리를 확인해 주세요.", en: "Check the 10-digit business registration number." },
  company_required: { ko: "상호와 대표자 이름을 적어 주세요.", en: "Enter the company and CEO name." },
  email_invalid: { ko: "받을 이메일 주소를 확인해 주세요.", en: "Check the email address." },
  already_requested: { ko: "이 결제는 이미 신청했어요.", en: "Already requested for this payment." },
  order_missing: { ko: "결제 완료된 주문만 신청할 수 있어요.", en: "Only paid orders can get a tax invoice." },
  rate_limited: { ko: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.", en: "Too many requests — try again shortly." },
  signed_out: { ko: "로그인이 필요해요.", en: "Please sign in." },
  save_failed: { ko: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", en: "Couldn't save. Please try again shortly." },
};

const PLAN_LABEL: Record<string, { ko: string; en: string }> = {
  plus: { ko: "플러스 30일", en: "Plus · 30 days" },
  pro: { ko: "프로 30일", en: "Pro · 30 days" },
  topup: { ko: "크레딧 충전", en: "Credit top-up" },
};

function TaxInvoiceForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const L = useBi();
  const [state, action, pending] = useActionState<TaxInvoiceState, FormData>(requestTaxInvoice, null);
  const [ref, onSubmit] = useKeepInputForm(action, state);
  if (state?.ok) {
    return (
      <p role="status" className="text-xs text-studio-success">
        {L(INVOICE_MSG.invoice_requested)}{" "}
        <button type="button" onClick={onDone} className="text-studio-cyan hover:underline">{L({ ko: "닫기", en: "Close" })}</button>
      </p>
    );
  }
  return (
    <form ref={ref} onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input name="businessNo" required inputMode="numeric" maxLength={12} className={cn(inputClass, "h-10")} placeholder={L({ ko: "사업자등록번호 (000-00-00000)", en: "Business reg. no. (000-00-00000)" })} aria-label={L({ ko: "사업자등록번호", en: "Business registration number" })} />
      <input name="company" required maxLength={80} className={cn(inputClass, "h-10")} placeholder={L({ ko: "상호", en: "Company name" })} aria-label={L({ ko: "상호", en: "Company name" })} />
      <input name="ceo" required maxLength={40} className={cn(inputClass, "h-10")} placeholder={L({ ko: "대표자 이름", en: "CEO name" })} aria-label={L({ ko: "대표자 이름", en: "CEO name" })} />
      <input name="email" type="email" required maxLength={120} className={cn(inputClass, "h-10")} placeholder={L({ ko: "받을 이메일", en: "Email to send it to" })} aria-label={L({ ko: "받을 이메일", en: "Email" })} />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-9 px-4 text-xs")}>{pending ? L({ ko: "보내는 중…", en: "Sending…" }) : L({ ko: "세금계산서 신청", en: "Request tax invoice" })}</button>
        <button type="button" onClick={onDone} className={cn(secondaryButton, "h-9 px-3 text-xs")}>{L({ ko: "취소", en: "Cancel" })}</button>
        {state && !state.ok ? <p role="status" className="text-xs text-danger">{L(INVOICE_MSG[state.message] ?? INVOICE_MSG.save_failed)}</p> : null}
      </div>
    </form>
  );
}

function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  const L = useBi();
  const [invoiceFor, setInvoiceFor] = useState<string | null>(null);
  return (
    <section className="mt-8" aria-labelledby="payment-history">
      <h2 id="payment-history" className="font-semibold">{L({ ko: "결제 내역 · 영수증", en: "Payments & receipts" })}</h2>
      <ul className="glass mt-3 divide-y divide-hairline rounded-[24px]">
        {payments.map((p) => {
          const refunded = p.refundedAmount > 0 && p.refundedAmount < p.amount;
          return (
            <li key={p.orderId} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-mono text-xs text-fg-muted">{p.createdAt.slice(0, 10)}</span>
                <span className="font-semibold">{p.plan && PLAN_LABEL[p.plan] ? L(PLAN_LABEL[p.plan]) : "—"}</span>
                <span className="font-mono text-xs">{won(p.amount)}</span>
                <span className={cn("text-xs", p.status === "done" ? "text-studio-success" : p.status === "failed" ? "text-danger" : "text-fg-muted")}>
                  {refunded ? L({ ko: `부분 환불 ${won(p.refundedAmount)}`, en: `Partly refunded ${won(p.refundedAmount)}` }) : L(PAYMENT_STATUS[p.status])}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-3 text-xs">
                  {p.receiptUrl ? (
                    <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-studio-cyan hover:underline">
                      {L({ ko: "영수증", en: "Receipt" })} <ExternalLink size={11} aria-hidden />
                    </a>
                  ) : null}
                  {p.taxInvoice ? (
                    <span className="text-fg-muted">{L(INVOICE_STATUS[p.taxInvoice])}</span>
                  ) : p.status === "done" && invoiceFor !== p.orderId ? (
                    <button type="button" onClick={() => setInvoiceFor(p.orderId)} className="text-studio-cyan hover:underline">{L({ ko: "세금계산서 신청", en: "Tax invoice" })}</button>
                  ) : null}
                </span>
              </div>
              {invoiceFor === p.orderId ? <div className="mt-3"><TaxInvoiceForm orderId={p.orderId} onDone={() => setInvoiceFor(null)} /></div> : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-2xs break-keep text-fg-subtle">
        {L({
          ko: "카드 영수증은 토스페이먼츠에서 발급해요. 계좌이체로 결제할 때 현금영수증 번호를 넣으면 자동으로 발급돼요. 사업자는 결제마다 세금계산서를 신청할 수 있어요.",
          en: "Card receipts come from Toss Payments. Paying by bank transfer, enter your cash-receipt number and it's issued automatically. Businesses can request a tax invoice for each payment.",
        })}
      </p>
    </section>
  );
}

const PRIORITY_LABEL: Record<ApiKeyPriority, { ko: string; en: string }> = {
  1: { ko: "1순위", en: "1st priority" },
  2: { ko: "2순위 (대기)", en: "2nd priority (waitlist)" },
  3: { ko: "3순위 (대기)", en: "3rd priority (waitlist)" },
};

function KeySlotRow({ provider, slot, placeholder }: { provider: ApiKeyProvider; slot: ApiKeySlot; placeholder: { ko: string; en: string } }) {
  const L = useBi();
  const [state, action, saving] = useActionState<ApiKeyActionState, FormData>(saveApiKey, null);
  const [other, setOther] = useState<ApiKeyActionState>(null);
  const [keyRef, onKeySubmit] = useKeepInputForm((fd) => {
    setOther(null);
    action(fd);
  }, state);
  const [busy, startTransition] = useTransition();
  const shown = other ?? state;
  const connected = other?.message === "deleted" ? false : state?.ok ? true : slot.connected;
  const broken = other?.ok ? false : slot.broken;

  return (
    <div className="rounded-xl bg-surface-2/50 p-3.5">
      <p className="text-2xs font-medium text-fg-subtle">{L(PRIORITY_LABEL[slot.priority])}</p>
      {connected ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-mono text-2xs text-fg-muted">
            <CircleCheck size={14} className="text-studio-success" aria-hidden />
            {L({ ko: "적용됨", en: "Applied" })} · **** {slot.last4}
          </span>
          {broken ? (
            <span className="flex items-center gap-1 text-2xs text-danger">
              <AlertTriangle size={12} aria-hidden />
              {L({ ko: "인증 실패 — 다시 확인하거나 교체하세요", en: "Auth failed — re-test or replace this key" })}
            </span>
          ) : null}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => startTransition(async () => setOther(await testApiKey(provider, slot.priority)))} className={cn(secondaryButton, "h-8 px-3 text-2xs")}>{L({ ko: "확인", en: "Test" })}</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (confirm(L({ ko: "키를 삭제할까요?", en: "Delete this key?" }))) startTransition(async () => setOther(await deleteApiKey(provider, slot.priority))); }}
              className={cn(secondaryButton, "h-8 px-3 text-2xs text-danger")}
            >
              <Trash2 size={12} aria-hidden /> {L({ ko: "삭제", en: "Delete" })}
            </button>
          </div>
        </div>
      ) : (
        <form ref={keyRef} onSubmit={onKeySubmit} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="priority" value={slot.priority} />
          {/* "new-password" (not "off", which browsers ignore on password fields) and the password-manager
              opt-outs keep a saved site password from being filled in, so the box starts empty. */}
          <input
            name="apiKey"
            type="password"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
            spellCheck={false}
            required
            className={cn(inputClass, "h-9 min-w-0 flex-1 font-mono text-sm placeholder:font-sans placeholder:text-fg-subtle/80")}
            placeholder={L(placeholder)}
            aria-label={L({ ko: `${PROVIDER_INFO[provider].name} API 키 붙여넣기`, en: `Paste your ${PROVIDER_INFO[provider].name} API key` })}
          />
          <button type="submit" disabled={saving} className={cn(primaryButton, "h-9 px-4 text-sm")}>{saving ? L({ ko: "확인 중…", en: "Checking…" }) : L({ ko: "적용", en: "apply" })}</button>
        </form>
      )}
      {shown ? <p role="status" className={cn("mt-2 text-2xs", shown.ok ? "text-studio-success" : "text-danger")}>{L(KEY_MSG[shown.message] ?? { ko: shown.message, en: shown.message })}</p> : null}
    </div>
  );
}

function ProviderKeyCard({ provider, slots }: { provider: ApiKeyProvider; slots: ApiKeySlot[] }) {
  const L = useBi();
  const info = PROVIDER_INFO[provider];
  return (
    <div className="glass rounded-[24px] p-6">
      <p className="font-semibold">{info.name}</p>
      <p className="text-2xs text-fg-subtle">{L({ ko: "API 키 (최대 3개)", en: "API Key (Maximum 3)" })}</p>
      <p className="mt-2 text-sm text-fg-muted">{L(providerDescription(provider))}</p>
      <div className="mt-4 space-y-2">
        {slots.map((slot) => (
          <KeySlotRow key={slot.priority} provider={provider} slot={slot} placeholder={info.placeholder} />
        ))}
      </div>
    </div>
  );
}

function ApiKeyPanel({ apiKey, paidPlan = false }: { apiKey: ApiKeyStatus; paidPlan?: boolean }) {
  const L = useBi();
  return (
    <>
      <PageHeader title={L({ ko: "내 API 키", en: "My API key" })} lead={L({ ko: "도구는 직접 발급받은 내 API 키로 실행돼요. 제공사마다 키를 최대 3개까지 우선순위로 등록할 수 있고, 한도가 차면 다음 키로 자동 전환돼요.", en: "Tools run on API keys you get yourself. Register up to 3 priority-ordered keys per provider — when one hits its quota, the next takes over." })} />
      <section className="space-y-6">
        {/* Plus and Pro run on credits; a saved key is only used on the Free plan (lib/run-access.ts). */}
        {paidPlan ? (
          <p className="flex items-start gap-2 rounded-2xl border border-hairline bg-surface-2/60 px-4 py-3 text-sm break-keep text-fg-muted">
            <Crown size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden />
            {L({ ko: "플러스·프로 플랜은 키 없이 크레딧으로 실행돼요. 여기 등록한 키는 무료 플랜일 때만 쓰여요.", en: "Plus and Pro run on credits, without a key. A key saved here is only used on the Free plan." })}
          </p>
        ) : null}
        {/* No Google key yet: how to get one comes first, not in small print at the bottom. */}
        {apiKey.enabled && !apiKey.providers.google.some((k) => k.connected) ? (
          <div className="rounded-[24px] border border-studio-cyan/40 bg-studio-cyan/10 p-5">
            <p className="flex items-center gap-2 text-base font-bold break-keep text-fg">
              <KeyRound size={18} className="shrink-0 text-studio-cyan" aria-hidden />
              {L({ ko: "아직 키가 없나요? 무료로 5분이면 받아요", en: "No key yet? It's free and takes about 5 minutes" })}
            </p>
            <p className="mt-1.5 text-sm break-keep text-fg-muted">
              {L({ ko: "Google AI Studio에서 키를 만들고 「Copy key」로 복사한 뒤, 아래 Google Gemini 「1순위」 칸에 붙여넣고 「적용」을 누르세요.", en: "Create a key in Google AI Studio, click \"Copy key\", then paste it into the Google Gemini \"1st priority\" box below and click \"apply\"." })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/help/api-guide#video" className={cn(primaryButton, "h-10 px-4")}>
                <PlayCircle size={16} aria-hidden /> {L({ ko: "키 받는 방법 보기", en: "How to get a key" })}
              </Link>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={cn(secondaryButton, "h-10 px-4")}>
                Google AI Studio <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        ) : null}
        {apiKey.enabled ? (
          <>
            {MEMBER_KEY_PROVIDERS.map((p) => (
              <ProviderKeyCard key={p} provider={p} slots={apiKey.providers[p]} />
            ))}
          </>
        ) : (
          <p className="rounded-xl bg-studio-warning/10 p-3 text-sm text-fg-muted">{L(KEY_MSG.server_disabled)}</p>
        )}
        <p className="text-sm text-fg-muted">
          {L({ ko: "처음이라면", en: "First time?" })} <Link href="/help/api-guide" className="text-studio-cyan underline underline-offset-2">{L({ ko: "API 키 설명서", en: "Read the API key manual" })}</Link>{L({ ko: "를 보세요 — 발급, 보안, 문제 해결까지 담겨 있어요.", en: " — getting a key, security and troubleshooting." })}
        </p>
      </section>
    </>
  );
}

export { AccountOverview, DeleteAccountPanel, MembershipPanel, ApiKeyPanel };
