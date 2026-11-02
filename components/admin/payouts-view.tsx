"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Banknote, Check, Eye, Hourglass, Wallet, X } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { processReferralPayout, revealReferralRrn, type AdminActionState } from "@/lib/actions/admin";
import type { AdminPayout, AdminPayoutSummary } from "@/lib/admin";
import { REVENUE_SHARE } from "@/lib/referral";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, Pill, StatCard } from "@/components/admin/ui";
import { ActionNote, btnGhost, btnPrimary, field, fmtDateTime, num } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

// /admin/payouts — referral revenue-share payouts (migration 0024). Staff
// transfer the net amount to the member's account by internet banking,
// then mark it paid; the withheld tax is reported with the month's
// 원천징수 return (홈택스). Rejecting returns the amount to the wallet.

const won = (n: number) => `₩${num(n)}`;

// Hints that the member bought through their own invite (lib/referral.ts referralRisks).
const RISK: Record<AdminPayout["risks"][number], { ko: string; en: string }> = {
  same_email: { ko: "친구와 같은 메일함", en: "Same mailbox as a friend" },
  same_card: { ko: "친구와 같은 카드", en: "Same card as a friend" },
  same_name: { ko: "친구와 같은 이름", en: "Same name as a friend" },
};

function RrnReveal({ userId, masked }: { userId: string; masked: string }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(revealReferralRrn, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <span className="font-mono text-xs">{state?.ok && state.id ? state.id : masked}</span>
      {state?.ok ? null : (
        <button type="submit" disabled={pending} className="text-xs text-accent hover:underline" title={L({ ko: "원천징수 신고용 · 조회 기록이 남아요", en: "For tax filing · every view is logged" })}>
          <Eye className="inline size-3.5" aria-hidden /> {L({ ko: "전체 보기", en: "Show" })}
        </button>
      )}
      {state && !state.ok ? <ActionNote state={state} /> : null}
    </form>
  );
}

function Decide({ p }: { p: AdminPayout }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(processReferralPayout, null);
  const [rejecting, setRejecting] = useState(false);
  if (state?.ok) return <ActionNote state={state} />;
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={p.id} />
      {rejecting ? (
        <div className="flex gap-2">
          <input name="note" required maxLength={200} placeholder={L({ ko: "반려 사유 (회원에게 보여요)", en: "Reason (the member sees it)" })} className={cn(field, "h-9 w-56")} />
          <button type="submit" name="decision" value="rejected" disabled={pending} className={cn(btnGhost, "h-9 px-3 text-danger")}>{L({ ko: "반려", en: "Reject" })}</button>
          <button type="button" onClick={() => setRejecting(false)} className={cn(btnGhost, "h-9 px-2")} aria-label={L({ ko: "취소", en: "Cancel" })}><X className="size-4" aria-hidden /></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="submit"
            name="decision"
            value="paid"
            disabled={pending || !p.bank}
            onClick={(e) => {
              if (!window.confirm(L({ ko: `${p.bank?.holder ?? ""}님 계좌로 ${won(p.net)}을 이체했나요? 입금 완료로 표시해요.`, en: `Did you transfer ${won(p.net)} to ${p.bank?.holder ?? ""}? This marks it paid.` }))) e.preventDefault();
            }}
            className={cn(btnPrimary, "h-9 px-3")}
          >
            <Check className="size-4" aria-hidden /> {L({ ko: "이체 완료", en: "Mark paid" })}
          </button>
          <button type="button" onClick={() => setRejecting(true)} className={cn(btnGhost, "h-9 px-3")}>{L({ ko: "반려", en: "Reject" })}</button>
        </div>
      )}
      <ActionNote state={state} />
    </form>
  );
}

const STATUS: Record<AdminPayout["status"], { ko: string; en: string; tone: "amber" | "green" | "red" }> = {
  requested: { ko: "이체 대기", en: "To transfer", tone: "amber" },
  paid: { ko: "입금 완료", en: "Paid", tone: "green" },
  rejected: { ko: "반려", en: "Rejected", tone: "red" },
};

export function PayoutsView({ summary }: { summary: AdminPayoutSummary | null }) {
  const L = useBi();
  if (!summary) {
    return (
      <div>
        <AdminPageHeader title={L({ ko: "추천 정산", en: "Referral payouts" })} />
        <Card><p className="text-sm text-fg-muted">{L({ ko: "데이터베이스 마이그레이션 0024가 아직 적용되지 않았어요.", en: "Database migration 0024 isn't applied yet." })}</p></Card>
      </div>
    );
  }
  const open = summary.rows.filter((r) => r.status === "requested");
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "추천 정산", en: "Referral payouts" })}
        lead={L({
          ko: `초대한 친구의 결제(부가세 제외)의 ${Math.round(REVENUE_SHARE.rate * 100)}%가 ${REVENUE_SHARE.holdDays}일 보류 뒤 회원 지갑에 쌓여요. 회원이 정산을 신청하면 아래 계좌로 실수령액을 이체하고 '이체 완료'를 눌러 주세요. 떼어 둔 ${(REVENUE_SHARE.withholdingRate * 100).toFixed(1)}%는 다음 달 10일까지 홈택스 원천징수 신고·납부하고, 지급명세서도 제출해야 해요. 첫 지급 전에 세무사에게 소득 구분(사업소득 3.3% / 기타소득 8.8%)을 확인하세요 — 바꾸려면 lib/referral.ts의 withholdingRate.`,
          en: `${Math.round(REVENUE_SHARE.rate * 100)}% of invited friends' payments (excl. VAT) builds up in members' wallets after a ${REVENUE_SHARE.holdDays}-day hold. When a member requests a payout, transfer the net amount to the account below and press 'Mark paid'. File and pay the ${(REVENUE_SHARE.withholdingRate * 100).toFixed(1)}% withheld via Hometax by the 10th of next month, and file the payment statement. Before the first payout, confirm the income type with the tax adviser (business 3.3% / other 8.8%) — lib/referral.ts withholdingRate.`,
        })}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={L({ ko: "이체 대기", en: "To transfer" })} value={won(open.reduce((s, r) => s + r.net, 0))} icon={Banknote} tone="campaign" alert={open.length > 0} note={L({ ko: `${open.length}건 · 세전 ${won(open.reduce((s, r) => s + r.gross, 0))}`, en: `${open.length} requests · gross ${won(open.reduce((s, r) => s + r.gross, 0))}` })} />
        <StatCard label={L({ ko: "보류 중 수익", en: "On hold" })} value={won(summary.held)} icon={Hourglass} tone="operate" note={L({ ko: `환불되면 취소돼요 (${REVENUE_SHARE.holdDays}일)`, en: `Canceled if refunded (${REVENUE_SHARE.holdDays} days)` })} />
        <StatCard label={L({ ko: "지급 예정 (미신청)", en: "Owed, not requested" })} value={won(summary.owed)} icon={Wallet} tone="discover" />
        <StatCard label={L({ ko: "이번 달 지급 (세전)", en: "Paid this month (gross)" })} value={won(summary.paidThisMonth)} icon={Check} tone="brand" note={L({ ko: `30일 수익 발생 ${summary.commissions30d.count}건 · ${won(summary.commissions30d.amount)}`, en: `${summary.commissions30d.count} shares in 30 days · ${won(summary.commissions30d.amount)}` })} />
      </div>
      <Card title={L({ ko: "정산 신청", en: "Payout requests" })} bodyClassName="px-0 py-0">
        {summary.rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{L({ ko: "아직 정산 신청이 없어요.", en: "No payout requests yet." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-hairline text-left text-xs text-fg-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">{L({ ko: "회원", en: "Member" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "이체할 계좌", en: "Transfer to" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "주민등록번호", en: "Resident no." })}</th>
                  <th className="px-3 py-3 text-right font-medium">{L({ ko: "세전 · 세금 · 실수령", en: "Gross · tax · net" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "상태", en: "Status" })}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((p) => (
                  <tr key={p.id} className="border-b border-hairline align-top last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/members/${p.userId}`} className="font-semibold text-accent hover:underline">{p.name || p.email}</Link>
                      <span className="block text-xs text-fg-muted">{p.email}</span>
                      <span className="block text-[11px] text-fg-subtle">{fmtDateTime(p.requestedAt)}</span>
                      <span className="block text-[11px] text-fg-subtle">{L({ ko: `결제한 친구 ${p.buyers}명`, en: `${p.buyers} paying friends` })}</span>
                      {p.risks.length ? (
                        <span className="mt-1 flex flex-wrap gap-1" title={L({ ko: "본인이 다른 계정으로 결제했을 수 있어요. 확인 후 이체하세요.", en: "They may have paid from a second account. Check before transferring." })}>
                          {p.risks.map((r) => <Pill key={r} tone="red">{L(RISK[r])}</Pill>)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {p.bank ? (
                        <>
                          <span className="block font-semibold">{p.bank.bank}</span>
                          <span className="block font-mono text-xs select-all">{p.bank.account}</span>
                          <span className="block text-xs text-fg-muted">{L({ ko: `예금주 ${p.bank.holder}`, en: `Holder ${p.bank.holder}` })}</span>
                        </>
                      ) : (
                        <Pill tone="red">{L({ ko: "계좌 없음", en: "No account" })}</Pill>
                      )}
                    </td>
                    <td className="px-3 py-3">{p.bank ? <RrnReveal userId={p.userId} masked={p.bank.rrnMasked} /> : "—"}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      <span className="block">{won(p.gross)}</span>
                      <span className="block text-fg-muted">− {won(p.tax)}</span>
                      <span className="block font-semibold text-fg">{won(p.net)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={STATUS[p.status].tone}>{L(STATUS[p.status])}</Pill>
                      {p.note ? <span className="mt-1 block text-xs text-fg-muted">{p.note}</span> : null}
                      {p.processedAt ? <span className="mt-1 block text-[11px] text-fg-subtle">{fmtDateTime(p.processedAt)}</span> : null}
                    </td>
                    <td className="px-5 py-3">{p.status === "requested" ? <Decide p={p} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
