"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Banknote, Check, Copy, Gift, Hourglass, Landmark, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { PageHeader, inputClass, primaryButton, secondaryButton } from "@/components/site/page";
import { useBi } from "@/lib/i18n/context";
import { PAYOUT_BANKS, REVENUE_SHARE, commissionFor } from "@/lib/referral";
import { PRODUCTS } from "@/lib/payments/pro";
import { requestReferralPayout, saveReferralPayoutAccount, type ReferralActionState } from "@/lib/actions/referral";
import type { RevenueShareStatus } from "@/lib/referral-server";
import { cn } from "@/lib/utils";

// /account/referral in SaaS mode: the invite link, what each friend's
// purchase earns, the wallet (held → withdrawable → paid), the payout
// account and the payout request. Rules in lib/referral.ts REVENUE_SHARE.

type Bi = { ko: string; en: string };
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const pct = `${Math.round(REVENUE_SHARE.rate * 100)}%`;
const taxPct = `${(REVENUE_SHARE.withholdingRate * 100).toFixed(1)}%`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—");

const MSG: Record<string, Bi> = {
  account_saved: { ko: "정산 계좌를 저장했어요. 계좌번호와 주민등록번호는 암호화해 보관해요.", en: "Payout account saved. The account and ID numbers are stored encrypted." },
  payout_requested: { ko: "정산을 신청했어요. 영업일 기준 5일 안에 입금해 드려요.", en: "Payout requested. We'll transfer it within 5 business days." },
  consent_required: { ko: "개인정보 수집·이용에 동의해 주세요.", en: "Please agree to the collection of this information." },
  holder_required: { ko: "예금주 이름을 적어 주세요.", en: "Enter the account holder's name." },
  bank_required: { ko: "은행을 골라 주세요.", en: "Choose a bank." },
  account_invalid: { ko: "계좌번호는 숫자 10~16자리예요.", en: "Account numbers are 10–16 digits." },
  rrn_invalid: { ko: "주민등록번호 13자리를 확인해 주세요.", en: "Check the 13-digit resident registration number." },
  no_account: { ko: "먼저 정산 계좌를 등록해 주세요.", en: "Add a payout account first." },
  open_request: { ko: "이미 처리 중인 정산 신청이 있어요.", en: "A payout request is already being processed." },
  too_small: { ko: `정산은 ${won(REVENUE_SHARE.minPayout)}부터 신청할 수 있어요.`, en: `Payouts start at ${won(REVENUE_SHARE.minPayout)}.` },
  server_disabled: { ko: "지금은 계좌를 저장할 수 없어요. 고객센터로 알려 주세요.", en: "Accounts can't be saved right now. Please contact support." },
  rate_limited: { ko: "요청이 너무 잦아요. 잠시 뒤 다시 해 주세요.", en: "Too many requests. Try again shortly." },
  signed_out: { ko: "로그인이 필요해요.", en: "Please sign in." },
  save_failed: { ko: "저장하지 못했어요. 잠시 뒤 다시 해 주세요.", en: "Couldn't save. Try again shortly." },
  closed: { ko: "추천 수익 공유를 운영하지 않아요.", en: "The referral program is closed." },
};

function Note({ state }: { state: ReferralActionState }) {
  const L = useBi();
  if (!state) return null;
  return <p role="status" className={cn("text-sm", state.ok ? "text-studio-success" : "text-danger")}>{L(MSG[state.message] ?? { ko: state.message, en: state.message })}</p>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Wallet; label: string; value: string; note?: string }) {
  return (
    <div className="glass rounded-[22px] p-4">
      <p className="flex items-center gap-1.5 text-xs text-fg-muted"><Icon size={13} className="text-studio-cyan" aria-hidden /> {label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      {note ? <p className="mt-0.5 text-2xs text-fg-subtle">{note}</p> : null}
    </div>
  );
}

function PayoutAccountForm({ account }: { account: RevenueShareStatus["account"] }) {
  const L = useBi();
  const [state, action, pending] = useActionState<ReferralActionState, FormData>(saveReferralPayoutAccount, null);
  const [editing, setEditing] = useState(!account);
  if (account && !editing && !state?.ok) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{account.bank} ····{account.last4} · {account.holder}</p>
        <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButton, "h-9 px-3 text-xs")}>{L({ ko: "계좌 바꾸기", en: "Change" })}</button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="holder" required maxLength={40} placeholder={L({ ko: "예금주 (본인 명의)", en: "Account holder (your own name)" })} aria-label={L({ ko: "예금주", en: "Holder" })} className={inputClass} />
        <select name="bank" required defaultValue="" aria-label={L({ ko: "은행", en: "Bank" })} className={inputClass}>
          <option value="" disabled>{L({ ko: "은행 선택", en: "Choose a bank" })}</option>
          {PAYOUT_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input name="account" required inputMode="numeric" autoComplete="off" placeholder={L({ ko: "계좌번호 (- 없이)", en: "Account number" })} aria-label={L({ ko: "계좌번호", en: "Account number" })} className={inputClass} />
        <input name="rrn" required inputMode="numeric" autoComplete="off" placeholder={L({ ko: "주민등록번호 13자리", en: "Resident registration number (13 digits)" })} aria-label={L({ ko: "주민등록번호", en: "Resident registration number" })} className={inputClass} />
      </div>
      <label className="flex items-start gap-2 rounded-2xl bg-surface-2/60 p-3 text-xs leading-relaxed break-keep text-fg-muted">
        <input type="checkbox" name="agree" className="mt-0.5" />
        <span>
          {L({
            ko: "[필수] 추천 수익 지급과 원천징수·지급명세서 제출(소득세법 §127·§164)을 위해 예금주, 은행, 계좌번호, 주민등록번호를 수집·이용하는 데 동의합니다. 계좌번호와 주민등록번호는 암호화해 보관하고, 지급 기록은 국세기본법에 따라 5년간 보관한 뒤 파기합니다. 동의하지 않으면 현금 정산을 받을 수 없어요.",
            en: "[Required] I agree to the collection and use of the holder name, bank, account number and resident registration number to pay referral earnings and to withhold and report tax (Income Tax Act §127, §164). Account and ID numbers are stored encrypted; payment records are kept 5 years under the Framework Act on National Taxes, then destroyed. Without consent, cash payouts aren't possible.",
          })}{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2">{L({ ko: "개인정보 처리방침", en: "Privacy policy" })}</Link>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}><Landmark size={15} aria-hidden /> {L({ ko: "정산 계좌 저장", en: "Save payout account" })}</button>
        {account ? <button type="button" onClick={() => setEditing(false)} className={cn(secondaryButton, "h-10")}>{L({ ko: "취소", en: "Cancel" })}</button> : null}
        <Note state={state} />
      </div>
    </form>
  );
}

function PayoutRequest({ status }: { status: RevenueShareStatus }) {
  const L = useBi();
  const [state, action, pending] = useActionState<ReferralActionState>(requestReferralPayout, null);
  const available = status.wallet.available;
  const tax = Math.floor((Math.max(available, 0) * REVENUE_SHARE.withholdingRate) / 10) * 10;
  const ready = available >= REVENUE_SHARE.minPayout && !!status.account && status.wallet.requested === 0;
  return (
    <form action={action} className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-semibold">{L({ ko: `출금 가능 ${won(Math.max(available, 0))}`, en: `Withdrawable ${won(Math.max(available, 0))}` })}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {available > 0
            ? L({ ko: `원천징수 ${taxPct} ${won(tax)} 제외 후 ${won(available - tax)} 입금`, en: `${won(available - tax)} after ${taxPct} withholding (${won(tax)})` })
            : available < 0
              ? L({ ko: `환불로 ${won(-available)}이 차감돼 있어요. 다음 수익에서 먼저 메워져요.`, en: `${won(-available)} owed from a refund; it comes out of your next earnings.` })
              : L({ ko: `${won(REVENUE_SHARE.minPayout)}부터 신청할 수 있어요.`, en: `Payouts start at ${won(REVENUE_SHARE.minPayout)}.` })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Note state={state} />
        <button type="submit" disabled={pending || !ready} className={cn(primaryButton, "h-10")}><Banknote size={15} aria-hidden /> {L({ ko: "정산 신청", en: "Request payout" })}</button>
      </div>
    </form>
  );
}

const C_STATUS: Record<RevenueShareStatus["commissions"][number]["status"], { label: Bi; cls: string }> = {
  held: { label: { ko: "보류 중", en: "On hold" }, cls: "text-fg-muted" },
  available: { label: { ko: "확정", en: "Confirmed" }, cls: "text-studio-success" },
  canceled: { label: { ko: "환불로 취소", en: "Refunded" }, cls: "text-danger" },
};
const P_STATUS: Record<RevenueShareStatus["payouts"][number]["status"], { label: Bi; cls: string }> = {
  requested: { label: { ko: "처리 중", en: "Processing" }, cls: "text-fg-muted" },
  paid: { label: { ko: "입금 완료", en: "Paid" }, cls: "text-studio-success" },
  rejected: { label: { ko: "반려", en: "Rejected" }, cls: "text-danger" },
};

export function RevenueSharePanel({ status, link }: { status: RevenueShareStatus | null; link: string | null }) {
  const L = useBi();
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  // What a friend reads in KakaoTalk: what the site does and why the link.
  const message = L({
    ko: "가게 홍보 글·로고·광고 문구·상세페이지를 AI로 바로 만들어 주는 'AI 해바' 써 보세요. 무료로 시작할 수 있어요.",
    en: "Try AI Haeba: it makes posts, logos, ad copy and product pages for your shop with AI. You can start free.",
  });
  async function copy(what: "link" | "message") {
    if (!link) return;
    const text = what === "link" ? link : `${message}
${link}`;
    const ok = await navigator.clipboard.writeText(text).then(() => true, () => false);
    if (!ok) return void window.prompt(L({ ko: "아래 내용을 복사해 주세요", en: "Copy this" }), text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }
  // Phones open the share sheet (KakaoTalk, 문자, 밴드…); elsewhere the message is copied to paste.
  async function share() {
    if (!link) return;
    if (typeof navigator.share === "function") {
      const done = await navigator.share({ title: "AI 해바", text: message, url: link }).then(() => true, (e: unknown) => (e as Error)?.name === "AbortError");
      if (done) return;
    }
    await copy("message");
  }
  const plus = commissionFor(PRODUCTS.plus.amount).commission;
  const pro = commissionFor(PRODUCTS.pro.amount).commission;
  return (
    <>
      <PageHeader
        title={L({ ko: "친구 초대 · 수익 공유", en: "Invite friends · revenue share" })}
        lead={L({
          ko: `초대 링크로 가입한 친구가 ${REVENUE_SHARE.windowDays}일 안에 결제할 때마다, 결제 금액(부가세 제외)의 ${pct}를 현금으로 드려요. 플러스 한 번이면 ${won(plus)}, 프로면 ${won(pro)}이에요.`,
          en: `Whenever a friend who joined through your link pays within ${REVENUE_SHARE.windowDays} days, you earn ${pct} of the payment (excluding VAT) in cash: ${won(plus)} per Plus, ${won(pro)} per Pro.`,
        })}
      />
      {!status || !link ? (
        <p className="glass rounded-[24px] p-6 text-sm text-fg-muted">{L({ ko: "초대 기능을 준비하고 있어요. 잠시 뒤 다시 열어 주세요.", en: "Invites aren't ready yet. Please check back shortly." })}</p>
      ) : (
        <div className="space-y-6">
          <section className="glass-strong rounded-[28px] p-6">
            <p className="flex items-center gap-2 font-semibold"><Gift size={17} className="text-studio-cyan" aria-hidden /> {L({ ko: "내 초대 링크", en: "Your invite link" })}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-2/70 px-3 py-2.5 font-mono text-sm">{link}</code>
              <button type="button" onClick={share} className={cn(primaryButton, "h-10")}>{copied === "message" ? <Check size={15} aria-hidden /> : <MessageCircle size={15} aria-hidden />} {copied === "message" ? L({ ko: "메시지를 복사했어요 — 카톡에 붙여 넣으세요", en: "Message copied — paste it in a chat" }) : L({ ko: "카카오톡 등으로 보내기", en: "Share (KakaoTalk…)" })}</button>
              <button type="button" onClick={() => copy("link")} className={cn(secondaryButton, "h-10")}>{copied === "link" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied === "link" ? L({ ko: "복사했어요", en: "Copied" }) : L({ ko: "링크 복사", en: "Copy link" })}</button>
            </div>
            <p className="mt-2 text-xs text-fg-muted">{L({ ko: `초대 코드 ${status.code} · 친구가 링크로 들어와 가입하거나, 가입 동의 화면에 코드를 적으면 연결돼요.`, en: `Invite code ${status.code}. It links when a friend signs up through the link, or types the code on the sign-up consent screen.` })}</p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Gift} label={L({ ko: "초대한 친구", en: "Friends invited" })} value={status.invited.toLocaleString()} note={L({ ko: `결제한 친구 ${status.buyers}명`, en: `${status.buyers} have paid` })} />
            <Stat icon={Hourglass} label={L({ ko: "보류 중", en: "On hold" })} value={won(status.wallet.pending)} note={L({ ko: `결제 후 ${REVENUE_SHARE.holdDays}일 뒤 확정`, en: `Confirmed ${REVENUE_SHARE.holdDays} days after payment` })} />
            <Stat icon={Wallet} label={L({ ko: "출금 가능", en: "Withdrawable" })} value={won(Math.max(status.wallet.available, 0))} note={status.wallet.requested ? L({ ko: `처리 중 ${won(status.wallet.requested)}`, en: `${won(status.wallet.requested)} processing` }) : undefined} />
            <Stat icon={Banknote} label={L({ ko: "받은 금액 (세전)", en: "Paid out (gross)" })} value={won(status.wallet.paid)} />
          </div>

          <section className="glass rounded-[28px] p-6">
            <p className="mb-4 flex items-center gap-2 font-semibold"><Landmark size={17} className="text-studio-cyan" aria-hidden /> {L({ ko: "정산", en: "Payout" })}</p>
            <PayoutRequest status={status} />
            <div className="mt-5 border-t border-hairline pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><ShieldCheck size={13} aria-hidden /> {L({ ko: "정산 계좌 (본인 명의)", en: "Payout account (in your name)" })}</p>
              <PayoutAccountForm account={status.account} />
            </div>
          </section>

          <section className="glass rounded-[28px] p-6">
            <p className="font-semibold">{L({ ko: "수익 내역", en: "Earnings" })}</p>
            {status.commissions.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">{L({ ko: "아직 수익이 없어요. 링크를 공유해 보세요.", en: "No earnings yet. Share your link." })}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-2xs text-fg-subtle">
                    <tr><th className="py-2 font-medium">{L({ ko: "날짜", en: "Date" })}</th><th className="py-2 font-medium">{L({ ko: "친구", en: "Friend" })}</th><th className="py-2 text-right font-medium">{L({ ko: "결제", en: "Payment" })}</th><th className="py-2 text-right font-medium">{L({ ko: "내 수익", en: "Your share" })}</th><th className="py-2 pl-4 font-medium">{L({ ko: "상태", en: "Status" })}</th></tr>
                  </thead>
                  <tbody>
                    {status.commissions.map((c) => (
                      <tr key={c.id} className="border-t border-hairline">
                        <td className="py-2 font-mono text-xs">{date(c.createdAt)}</td>
                        <td className="py-2 text-xs">{c.buyer}</td>
                        <td className="py-2 text-right font-mono text-xs">{won(c.amount)}</td>
                        <td className="py-2 text-right font-mono text-xs font-semibold">{won(c.commission)}</td>
                        <td className={cn("py-2 pl-4 text-xs", C_STATUS[c.status].cls)}>{L(C_STATUS[c.status].label)}{c.status === "held" ? ` · ${date(c.availableAt)}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {status.payouts.length ? (
              <>
                <p className="mt-6 font-semibold">{L({ ko: "정산 내역", en: "Payouts" })}</p>
                <ul className="mt-2 divide-y divide-hairline text-sm">
                  {status.payouts.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="font-mono text-xs">{date(p.requestedAt)}</span>
                      <span className="text-xs">{L({ ko: `${won(p.gross)} − 세금 ${won(p.tax)} = ${won(p.net)}`, en: `${won(p.gross)} − tax ${won(p.tax)} = ${won(p.net)}` })}</span>
                      <span className={cn("text-xs", P_STATUS[p.status].cls)}>{L(P_STATUS[p.status].label)}{p.note ? ` · ${p.note}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-hairline p-5 text-xs leading-relaxed break-keep text-fg-muted">
            <p className="mb-2 font-semibold text-fg">{L({ ko: "알아 두세요", en: "Good to know" })}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{L({ ko: `친구가 초대 링크로 가입한 날부터 ${REVENUE_SHARE.windowDays}일 동안의 플랜·충전 결제가 대상이에요.`, en: `Plan and top-up payments in the ${REVENUE_SHARE.windowDays} days after your friend joins count.` })}</li>
              <li>{L({ ko: `수익은 결제 후 ${REVENUE_SHARE.holdDays}일(환불 가능 기간) 동안 보류돼요. 그 사이 환불되면 취소되고, 출금 뒤 환불되면 다음 수익에서 차감돼요.`, en: `Earnings are held ${REVENUE_SHARE.holdDays} days (the refund window). A refund in that time cancels them; a refund after payout comes out of your next earnings.` })}</li>
              <li>{L({ ko: `${won(REVENUE_SHARE.minPayout)} 이상이면 정산을 신청할 수 있고, 사업소득세 3.3%(지방세 포함)를 떼고 본인 명의 계좌로 입금돼요.`, en: `From ${won(REVENUE_SHARE.minPayout)} you can request a payout; 3.3% tax (incl. local tax) is withheld and the rest goes to an account in your name.` })}</li>
              <li>{L({ ko: "내 다른 계정을 초대하는 등 부정한 방법으로 얻은 수익은 지급하지 않아요.", en: "Earnings from abuse, such as inviting your own other accounts, aren't paid." })}{" "}<Link href="/legal/terms#referral" className="underline underline-offset-2">{L({ ko: "이용약관", en: "Terms" })}</Link></li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
