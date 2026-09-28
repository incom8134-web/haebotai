"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CircleCheck, CircleGauge, Crown, GraduationCap, KeyRound, LogOut, Trash2 } from "lucide-react";
import { PLANS } from "@/lib/site/plans";
import { requestStudentVerification, type StudentRequestState } from "@/lib/actions/membership";
import { deleteApiKey, saveApiKey, testApiKey, type ApiKeyActionState } from "@/lib/actions/api-keys";
import { useBi } from "@/lib/i18n/context";
import type { Membership } from "@/lib/membership";
import type { ApiKeyPriority, ApiKeyProvider, ApiKeySlot, ApiKeyStatus } from "@/lib/api-keys";
import { getToolCapability } from "@/lib/ai/capabilities";
import { listTools } from "@/lib/tools/registry";
import { PageHeader, inputClass, primaryButton, secondaryButton, textareaClass } from "@/components/site/page";
import { cn } from "@/lib/utils";

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
  school_required: { ko: "학교 이름을 입력해 주세요.", en: "Enter your school name." },
  school_email_invalid: { ko: "학교 이메일은 ac.kr 또는 edu 주소여야 해요. 없으면 비워 두고 비고에 적어 주세요.", en: "School emails end in ac.kr or edu. No school email? Leave it blank and add a note." },
  already_pending: { ko: "이미 검토 중인 신청이 있어요.", en: "You already have a request under review." },
  signed_out: { ko: "로그인이 필요해요.", en: "Please sign in." },
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
};

const PROVIDER_INFO: Record<ApiKeyProvider, { name: string; placeholder: string }> = {
  google: { name: "Google Gemini", placeholder: "AIza…" },
  anthropic: { name: "Anthropic (Claude)", placeholder: "sk-ant-…" },
  openai: { name: "ChatGPT (OpenAI)", placeholder: "sk-…" },
};

/** Static fallback for a provider with no tools enabled yet (openai, pre-Stage-5). */
const PROVIDER_FALLBACK_DESCRIPTION: Partial<Record<ApiKeyProvider, { ko: string; en: string }>> = {
  openai: { ko: "GPT 기반 도구가 추가되면 사용돼요. 지금은 안전하게 등록·보관만 해요.", en: "Will be used once GPT-based tools are added. For now it's only securely registered and stored." },
};

function providerDescription(provider: ApiKeyProvider): { ko: string; en: string } {
  if (provider === "google") {
    return {
      ko: "1순위부터 차례로 쓰고, 한도가 차면 다음 순위 키로 자동 전환해요. 비용은 해봇이 아닌 본인 Google 계정으로 청구돼요.",
      en: "Used in priority order, switching automatically when one hits its quota. Costs are billed to your own Google account, not Haebot.",
    };
  }
  const tools = toolNamesForProvider(provider);
  if (tools.length === 0) return PROVIDER_FALLBACK_DESCRIPTION[provider] ?? { ko: "", en: "" };
  return {
    ko: `${tools.map((t) => t.ko).join(", ")}에 쓰여요. 1순위부터 차례로 자동 전환돼요.`,
    en: `Powers ${tools.map((t) => t.en).join(", ")}. Switches automatically in priority order.`,
  };
}

function AccountOverview({ email, balance, membership, apiKey, brandName, signOut }: { email: string; balance: number | null; membership: Membership; apiKey: ApiKeyStatus; brandName: string | null; signOut: () => void }) {
  const L = useBi();
  const plan = PLANS.find((p) => p.id === membership.plan)!;
  const doors = [
    { href: "/account/credits", icon: CircleGauge, title: { ko: "크레딧·한도", en: "Credits & limits" }, value: membership.plan === "student" ? L({ ko: "제한 없음", en: "Unlimited" }) : L({ ko: `${(balance ?? 0).toLocaleString()} 남음`, en: `${(balance ?? 0).toLocaleString()} left` }) },
    { href: "/account/membership", icon: Crown, title: { ko: "학생 멤버십", en: "Student membership" }, value: membership.plan === "student" ? L({ ko: "사용 중", en: "Active" }) : membership.studentRequest === "pending" ? L({ ko: "검토 중", en: "Under review" }) : L({ ko: "신청 가능", en: "Available" }) },
    { href: "/account/api-key", icon: KeyRound, title: { ko: "내 API 키", en: "My API key" }, value: apiKey.connected ? L({ ko: "연결됨 · 크레딧 미차감", en: "Connected · no credits" }) : L({ ko: "없음", en: "None" }) },
  ];
  return (
    <>
      {/* Identity */}
      <section className="glass-strong flex flex-wrap items-center gap-4 rounded-[28px] p-6">
        <span className="studio-gradient-bg grid size-14 place-items-center rounded-[18px] text-lg font-semibold text-white">{email[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{email}</p>
          <p className="text-sm text-fg-muted">
            {L(plan.name)}
            {membership.daysLeft !== null ? ` · D-${membership.daysLeft}` : ""} · {brandName ? <Link href="/brand" className="hover:text-fg">{brandName}</Link> : <Link href="/brand" className="text-studio-cyan">{L({ ko: "프로필 설정하기", en: "Set up profile" })}</Link>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl">{membership.plan === "student" ? "∞" : (balance ?? 0).toLocaleString()}</p>
          <p className="text-2xs text-fg-subtle">{L({ ko: "크레딧", en: "credits" })}</p>
        </div>
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
      <p className="mt-6 text-sm text-fg-muted">{L(plan.name)} · {brandName ?? L({ ko: "프로필 없음", en: "No profile" })}</p>
    </>
  );
}

function MembershipPanel({ membership }: { membership: Membership }) {
  const L = useBi();
  const [studentState, studentAction, studentPending] = useActionState<StudentRequestState, FormData>(requestStudentVerification, null);
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
            <p className="flex items-center gap-2 font-semibold"><GraduationCap size={18} className="text-studio-cyan" aria-hidden /> {L({ ko: "학생이라면 무료로 무제한", en: "Students: unlimited, free" })}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{L({ ko: "재학 인증을 하면 1년 동안 크레딧 걱정 없이 써요. 학교 이메일이 있으면 가장 빨라요.", en: "Verify enrollment for a year without credit limits. A school email is fastest." })}</p>
          </div>
          {membership.plan === "student" ? (
            <p className="grid place-items-center rounded-2xl bg-studio-success/10 p-6 text-center text-sm text-studio-success">{L({ ko: "학생 멤버십을 쓰고 있어요.", en: "Your Student membership is active." })}</p>
          ) : request === "pending" ? (
            <p className="grid place-items-center rounded-2xl bg-studio-cyan/10 p-6 text-center text-sm">{L({ ko: "신청을 검토하고 있어요.", en: "We're reviewing your request." })}</p>
          ) : (
            <form action={studentAction} className="space-y-3">
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

    </>
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
  const [busy, startTransition] = useTransition();
  const shown = other ?? state;
  const connected = state?.ok ? true : other?.message === "deleted" ? false : slot.connected;
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
        <form action={(fd) => { setOther(null); action(fd); }} className="mt-2 flex flex-wrap gap-2">
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
      <PageHeader title={L({ ko: "내 API 키", en: "My API key" })} lead={L({ ko: "직접 발급받은 키를 넣으면 그 도구는 크레딧을 쓰지 않아요. 각 제공사마다 우선순위 키를 최대 3개까지 등록할 수 있고, 한도가 차면 다음 키로 자동 전환돼요.", en: "Bring your own key and that provider's tools stop using credits. Register up to 3 priority-ordered keys per provider — quota runs out on one, it switches to the next." })} />
      <section className="space-y-6">
        {apiKey.enabled ? (
          <>
            <ProviderKeyCard provider="google" slots={apiKey.providers.google} />
            <ProviderKeyCard provider="anthropic" slots={apiKey.providers.anthropic} />
            <ProviderKeyCard provider="openai" slots={apiKey.providers.openai} />
          </>
        ) : (
          <p className="rounded-xl bg-studio-warning/10 p-3 text-sm text-fg-muted">{L(KEY_MSG.server_disabled)}</p>
        )}
        <p className="text-sm text-fg-muted">
          {L({ ko: "처음이라면", en: "First time?" })} <Link href="/help/api-guide" className="text-studio-cyan hover:underline">{L({ ko: "API 키 설명서", en: "Read the API key manual" })}</Link>{L({ ko: "를 보세요 — 발급, 보안, 문제 해결까지 담겨 있어요.", en: " — getting a key, security and troubleshooting." })}
        </p>
      </section>
    </>
  );
}

export { AccountOverview, MembershipPanel, ApiKeyPanel };
