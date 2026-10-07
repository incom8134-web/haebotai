"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CircleCheck, CircleGauge, Crown, GraduationCap, KeyRound, LogOut, Trash2 } from "lucide-react";
import { PLANS } from "@/lib/site/plans";
import { requestStudentVerification, type StudentRequestState } from "@/lib/actions/membership";
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
import { OWN_KEY_ONLY } from "@/lib/site/access";

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

const PROVIDER_INFO: Record<ApiKeyProvider, { name: string; placeholder: string }> = {
  google: { name: "Google Gemini", placeholder: "AQ.… / AIza…" },
  anthropic: { name: "Anthropic (Claude)", placeholder: "sk-ant-…" },
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

function AccountOverview({ email, balance, membership, apiKey, brandName, signOut, consent }: { email: string; balance: number | null; membership: Membership; apiKey: ApiKeyStatus; brandName: string | null; signOut: () => void; consent: ConsentState | null }) {
  const L = useBi();
  const plan = PLANS.find((p) => p.id === membership.plan)!;
  const allDoors = [
    { href: "/account/credits", icon: CircleGauge, title: { ko: "크레딧·한도", en: "Credits & limits" }, value: membership.plan === "student" ? L({ ko: "제한 없음", en: "Unlimited" }) : L({ ko: `${(balance ?? 0).toLocaleString()} 남음`, en: `${(balance ?? 0).toLocaleString()} left` }) },
    { href: "/account/membership", icon: Crown, title: { ko: "학생 멤버십", en: "Student membership" }, value: membership.plan === "student" ? L({ ko: "사용 중", en: "Active" }) : membership.studentRequest === "pending" ? L({ ko: "검토 중", en: "Under review" }) : L({ ko: "신청 가능", en: "Available" }) },
    { href: "/account/api-key", icon: KeyRound, title: { ko: "내 API 키", en: "My API key" }, value: apiKey.connected ? L(OWN_KEY_ONLY ? { ko: "연결됨", en: "Connected" } : { ko: "연결됨 · 크레딧 미차감", en: "Connected · no credits" }) : L(OWN_KEY_ONLY ? { ko: "등록 필요", en: "Needed" } : { ko: "없음", en: "None" }) },
  ];
  // No credits or plans while members bring their own key (lib/site/access.ts): the key is the one door that matters.
  const doors = OWN_KEY_ONLY ? allDoors.filter((d) => d.href === "/account/api-key") : allDoors;
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
            <p className="font-mono text-2xl">{membership.plan === "student" ? "∞" : (balance ?? 0).toLocaleString()}</p>
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

      {!OWN_KEY_ONLY && membership.plan === "pro" && membership.daysLeft !== null && membership.daysLeft <= 7 ? (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-hairline bg-surface-2 p-5" aria-labelledby="pro-ending">
          <div className="min-w-0">
            <h2 id="pro-ending" className="font-semibold">{L({ ko: `프로가 ${membership.daysLeft}일 뒤 끝나요`, en: `Pro ends in ${membership.daysLeft} days` })}</h2>
            <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "자동 결제는 없어요. 계속 쓰려면 직접 연장해 주세요 — 남은 기간에 30일이 더해집니다.", en: "There's no automatic renewal. Extend it yourself to keep Pro — 30 days are added to what's left." })}</p>
          </div>
          <Link href="/account/membership/checkout" className={cn(primaryButton, "h-10")}>{L({ ko: "30일 연장하기", en: "Extend 30 days" })}</Link>
        </section>
      ) : null}

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
            <li>{L({ ko: "보관함의 모든 결과물과 파일, 비즈니스 프로필, 등록한 API 키가 바로 삭제됩니다.", en: "All results and files, your business profile and saved API keys are deleted right away." })}</li>
            {OWN_KEY_ONLY ? null : <li>{L({ ko: `남은 크레딧${balance ? ` ${balance.toLocaleString()}` : ""}은 사라지며 환불되지 않습니다. 결제 후 7일이 지나지 않은 Pro 결제는 탈퇴 전에 고객센터로 환불을 먼저 요청해 주세요.`, en: "Remaining credits are lost and not refunded. For a Pro payment made in the last 7 days, ask customer service for a refund before deleting." })}</li>}
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
      <PageHeader title={L({ ko: "학생 멤버십", en: "Student membership" })} lead={L({ ko: "모든 플랜에서 모든 도구를 똑같이 써요. 다른 건 크레딧뿐이에요. 학생은 인증하면 무제한이에요.", en: "Every plan gets every tool; only credits differ. Verified students get unlimited use." })} />
      {/* Plan */}
      <section>
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = p.id === membership.plan;
            return (
              <div key={p.id} className={cn("glass rounded-[24px] p-5", current && "ring-1 ring-studio-cyan/50")}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{L(p.name)}</p>
                  {current ? <span className="rounded-full bg-studio-cyan/15 px-2.5 py-0.5 text-2xs font-semibold text-studio-cyan">{L({ ko: "지금", en: "Current" })}</span> : null}
                </div>
                <p className="mt-2 font-display text-2xl font-bold">{L(p.price)}</p>
                <p className="mt-1 text-sm text-fg-muted">{L(p.credits)}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
                  {p.features.slice(0, 3).map((f) => <li key={f.en} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-studio-success" aria-hidden /> {L(f)}</li>)}
                </ul>
                {p.id === "pro" && membership.plan !== "student" ? (
                  <>
                    {current && membership.daysLeft ? <p className="mt-3 text-sm text-fg-muted">{L({ ko: `${membership.daysLeft}일 남음`, en: `${membership.daysLeft} days left` })}</p> : null}
                    <Link href="/account/membership/checkout" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-studio-cyan">
                      {current ? L({ ko: "30일 연장하기", en: "Extend 30 days" }) : L({ ko: "프로 시작하기", en: "Get Pro" })} <ArrowRight size={13} aria-hidden />
                    </Link>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

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

function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  const L = useBi();
  return (
    <section className="mt-8" aria-labelledby="payment-history">
      <h2 id="payment-history" className="font-semibold">{L({ ko: "결제 내역", en: "Payment history" })}</h2>
      <div className="glass mt-3 overflow-x-auto rounded-[24px]">
        <table className="w-full text-sm">
          <thead className="text-left text-2xs text-fg-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">{L({ ko: "날짜", en: "Date" })}</th>
              <th className="px-5 py-3 font-medium">{L({ ko: "금액", en: "Amount" })}</th>
              <th className="px-5 py-3 font-medium">{L({ ko: "상태", en: "Status" })}</th>
              <th className="px-5 py-3 font-medium">{L({ ko: "영수증", en: "Receipt" })}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.orderId} className="border-t border-hairline">
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">{p.createdAt.slice(0, 10)}</td>
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">₩{p.amount.toLocaleString()}</td>
                <td className={cn("px-5 py-3 text-xs whitespace-nowrap", p.status === "done" ? "text-studio-success" : p.status === "failed" ? "text-danger" : "text-fg-muted")}>{L(PAYMENT_STATUS[p.status])}</td>
                <td className="px-5 py-3 text-xs whitespace-nowrap">
                  {p.receiptUrl ? (
                    <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">{L({ ko: "영수증 보기", en: "View receipt" })}</a>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-2xs break-keep text-fg-subtle">{L({ ko: "영수증은 토스페이먼츠에서 발급해요. 현금영수증·세금계산서가 필요하면 고객센터로 문의해 주세요.", en: "Receipts are issued by Toss Payments. For a cash receipt or tax invoice, contact customer service." })}</p>
    </section>
  );
}

const PRIORITY_LABEL: Record<ApiKeyPriority, { ko: string; en: string }> = {
  1: { ko: "1순위", en: "1st priority" },
  2: { ko: "2순위 (대기)", en: "2nd priority (waitlist)" },
  3: { ko: "3순위 (대기)", en: "3rd priority (waitlist)" },
};

function KeySlotRow({ provider, slot, placeholder }: { provider: ApiKeyProvider; slot: ApiKeySlot; placeholder: string }) {
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
          <input name="apiKey" type="password" autoComplete="off" spellCheck={false} required className={cn(inputClass, "h-9 min-w-0 flex-1 font-mono text-sm")} placeholder={placeholder} aria-label={placeholder} />
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

function ApiKeyPanel({ apiKey }: { apiKey: ApiKeyStatus }) {
  const L = useBi();
  return (
    <>
      <PageHeader title={L({ ko: "내 API 키", en: "My API key" })} lead={L({ ko: "도구는 직접 발급받은 내 API 키로 실행돼요. 제공사마다 키를 최대 3개까지 우선순위로 등록할 수 있고, 한도가 차면 다음 키로 자동 전환돼요.", en: "Tools run on API keys you get yourself. Register up to 3 priority-ordered keys per provider — when one hits its quota, the next takes over." })} />
      <section className="space-y-6">
        {apiKey.enabled ? (
          <>
            <ProviderKeyCard provider="google" slots={apiKey.providers.google} />
            <ProviderKeyCard provider="anthropic" slots={apiKey.providers.anthropic} />
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
