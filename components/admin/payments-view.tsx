"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Banknote, Bot, Check, Percent, ReceiptText, RotateCcw, TrendingUp, Undo2, X } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { processTaxInvoice, refundPayment, type AdminActionState } from "@/lib/actions/admin";
import type { AdminPaymentRow, AdminPayments, AdminTaxInvoice } from "@/lib/admin";
import { COSTS } from "@/lib/admin-revenue";
import { formatBusinessNo } from "@/lib/tax-invoice";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, Pill, StatCard } from "@/components/admin/ui";
import { ActionNote, btnGhost, btnPrimary, field, fmtDateTime, num } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

// /admin/payments — what came in against what it cost, every order with a
// refund button (Toss refund → credits and days taken back, migration
// 0025), and 세금계산서 requests to issue on 홈택스.

const won = (n: number) => `₩${num(n)}`;

const PLAN: Record<string, { ko: string; en: string }> = {
  plus: { ko: "플러스", en: "Plus" },
  pro: { ko: "프로", en: "Pro" },
  topup: { ko: "충전", en: "Top-up" },
};

const STATUS: Record<string, { ko: string; en: string; tone: "green" | "amber" | "red" | "gray" }> = {
  done: { ko: "결제 완료", en: "Paid", tone: "green" },
  pending: { ko: "확인 중", en: "Pending", tone: "amber" },
  failed: { ko: "실패", en: "Failed", tone: "red" },
  canceled: { ko: "취소·환불", en: "Canceled", tone: "gray" },
};

function Refund({ row }: { row: AdminPaymentRow }) {
  const L = useBi();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AdminActionState, FormData>(refundPayment, null);
  if (state?.ok) return <ActionNote state={state} />;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(btnGhost, "h-8 px-3 text-xs")}>
        <Undo2 className="size-3.5" aria-hidden /> {L({ ko: "환불", en: "Refund" })}
      </button>
    );
  }
  const left = row.amount - row.refunded;
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="orderId" value={row.orderId} />
      <div className="flex flex-wrap justify-end gap-2">
        <input name="amount" inputMode="numeric" placeholder={L({ ko: `전액 ${won(left)} (부분이면 금액)`, en: `All ${won(left)} (or an amount)` })} className={cn(field, "h-9 w-48")} aria-label={L({ ko: "환불 금액", en: "Refund amount" })} />
        <input name="reason" required maxLength={200} placeholder={L({ ko: "사유 (토스 기록에 남아요)", en: "Reason (kept at Toss)" })} className={cn(field, "h-9 w-56")} aria-label={L({ ko: "사유", en: "Reason" })} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (!window.confirm(L({ ko: `${row.email}님 결제를 토스페이먼츠에서 환불할까요? 되돌릴 수 없고, 환불 비율만큼 크레딧과 이용 기간을 거둬들여요.`, en: `Refund ${row.email}'s payment at Toss Payments? This can't be undone; credits and plan days are taken back in proportion.` }))) e.preventDefault();
          }}
          className={cn(btnPrimary, "h-9 bg-danger px-3 hover:bg-danger/90")}
        >
          {L({ ko: "환불하기", en: "Refund" })}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={cn(btnGhost, "h-9 px-2")} aria-label={L({ ko: "취소", en: "Cancel" })}><X className="size-4" aria-hidden /></button>
      </div>
      <ActionNote state={state} />
    </form>
  );
}

function InvoiceDecide({ inv }: { inv: AdminTaxInvoice }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(processTaxInvoice, null);
  const [rejecting, setRejecting] = useState(false);
  if (state?.ok) return <ActionNote state={state} />;
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={inv.id} />
      {rejecting ? (
        <div className="flex gap-2">
          <input name="note" required maxLength={200} placeholder={L({ ko: "반려 사유", en: "Reason" })} className={cn(field, "h-9 w-48")} />
          <button type="submit" name="decision" value="rejected" disabled={pending} className={cn(btnGhost, "h-9 px-3 text-danger")}>{L({ ko: "반려", en: "Reject" })}</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="submit" name="decision" value="issued" disabled={pending} className={cn(btnPrimary, "h-9 px-3")}><Check className="size-4" aria-hidden /> {L({ ko: "발행 완료", en: "Issued" })}</button>
          <button type="button" onClick={() => setRejecting(true)} className={cn(btnGhost, "h-9 px-3")}>{L({ ko: "반려", en: "Reject" })}</button>
        </div>
      )}
      <ActionNote state={state} />
    </form>
  );
}

export function PaymentsView({ data }: { data: AdminPayments }) {
  const L = useBi();
  const s = data.summary;
  const open = data.invoices?.filter((i) => i.status === "requested") ?? [];
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "매출·결제", en: "Revenue & payments" })}
        lead={L({
          ko: `최근 ${data.days}일 매출과 비용 추정이에요. 수수료는 ${(COSTS.tossFeeRate * 100).toFixed(1)}%로 잡았어요(토스 계약 요율로 바꾸세요: lib/admin-revenue.ts). AI 비용은 회사 키로 쓴 크레딧 × ₩${COSTS.wonPerCredit}, 내 키로 실행한 무료 회원은 비용이 없어요. 호스트 실행은 [호스트]에서 봐요.`,
          en: `Revenue and estimated costs for the last ${data.days} days. Fees are assumed at ${(COSTS.tossFeeRate * 100).toFixed(1)}% (set the Toss contract rate in lib/admin-revenue.ts). AI cost is credits spent on the company key × ₩${COSTS.wonPerCredit}; Free members on their own key cost nothing. Host runs are on Hosts.`,
        })}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={L({ ko: "순매출 (환불 뺌)", en: "Net revenue" })} value={won(s.net)} icon={Banknote} tone="brand" note={L({ ko: `${s.orders}건 · 환불 ${won(s.refunds)}`, en: `${s.orders} orders · refunds ${won(s.refunds)}` })} />
        <StatCard label={L({ ko: "부가세 · 결제 수수료", en: "VAT · payment fees" })} value={won(s.vat + s.tossFee)} icon={Percent} tone="operate" note={L({ ko: `부가세 ${won(s.vat)} · 수수료 ${won(s.tossFee)}`, en: `VAT ${won(s.vat)} · fees ${won(s.tossFee)}` })} />
        <StatCard label={L({ ko: "AI 비용 · 추천 수익", en: "AI cost · referral shares" })} value={won(s.aiCost + s.referral)} icon={Bot} tone="discover" note={L({ ko: `AI ${won(s.aiCost)} · 추천 ${won(s.referral)}`, en: `AI ${won(s.aiCost)} · referrals ${won(s.referral)}` })} />
        <StatCard label={L({ ko: "남는 돈 (추정)", en: "Margin (est.)" })} value={won(s.margin)} icon={TrendingUp} tone="campaign" alert={s.margin < 0} note={s.net ? L({ ko: `순매출의 ${Math.round((s.margin / s.net) * 100)}%`, en: `${Math.round((s.margin / s.net) * 100)}% of net` }) : undefined} />
      </div>

      {Object.keys(s.byPlan).length ? (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {Object.entries(s.byPlan).map(([plan, v]) => (
            <span key={plan} className="rounded-full border border-hairline bg-surface px-3 py-1">
              {L(PLAN[plan] ?? { ko: plan, en: plan })} · {v.orders}{L({ ko: "건", en: "" })} · {won(v.net)}
            </span>
          ))}
        </div>
      ) : null}

      <Card title={L({ ko: `세금계산서 신청${open.length ? ` (${open.length})` : ""}`, en: `Tax invoice requests${open.length ? ` (${open.length})` : ""}` })} lead={L({ ko: "홈택스에서 발행한 뒤 '발행 완료'를 눌러 주세요. 회원 결제 내역에 바로 보여요.", en: "Issue it on Hometax, then press 'Issued'. It shows in the member's payment history." })} className="mb-5" bodyClassName="px-0 py-0">
        {data.invoices === null ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{L({ ko: "데이터베이스 마이그레이션 0025가 아직 적용되지 않았어요.", en: "Database migration 0025 isn't applied yet." })}</p>
        ) : data.invoices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{L({ ko: "아직 신청이 없어요.", en: "No requests yet." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-hairline text-left text-xs text-fg-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">{L({ ko: "사업자", en: "Business" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "보낼 곳", en: "Send to" })}</th>
                  <th className="px-3 py-3 text-right font-medium">{L({ ko: "공급가액 · 세액", en: "Supply · VAT" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "상태", en: "Status" })}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((i) => (
                  <tr key={i.id} className="border-b border-hairline align-top last:border-0">
                    <td className="px-5 py-3">
                      <span className="block font-semibold">{i.company}</span>
                      <span className="block font-mono text-xs select-all">{formatBusinessNo(i.businessNo)}</span>
                      <span className="block text-xs text-fg-muted">{L({ ko: `대표 ${i.ceo}`, en: `CEO ${i.ceo}` })} · {i.email}</span>
                    </td>
                    <td className="px-3 py-3 text-xs select-all">{i.sendTo}<span className="block text-[11px] text-fg-subtle">{fmtDateTime(i.createdAt)}</span></td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      <span className="block">{won(i.amount - Math.round(i.amount / 11))}</span>
                      <span className="block text-fg-muted">{won(Math.round(i.amount / 11))}</span>
                    </td>
                    <td className="px-3 py-3"><Pill tone={i.status === "requested" ? "amber" : i.status === "issued" ? "green" : "red"}>{L(i.status === "requested" ? { ko: "발행 대기", en: "To issue" } : i.status === "issued" ? { ko: "발행 완료", en: "Issued" } : { ko: "반려", en: "Rejected" })}</Pill></td>
                    <td className="px-5 py-3">{i.status === "requested" ? <InvoiceDecide inv={i} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={L({ ko: "최근 결제", en: "Latest payments" })} lead={L({ ko: "환불하면 토스페이먼츠에서 돈이 돌아가고, 환불 비율만큼 크레딧·이용 기간을 거둬들이고, 추천 수익도 취소·감액돼요.", en: "A refund returns the money through Toss Payments, takes back credits and plan days in proportion, and cancels or shrinks the referral share." })} bodyClassName="px-0 py-0">
        {data.rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{L({ ko: "아직 결제가 없어요.", en: "No payments yet." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-hairline text-left text-xs text-fg-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">{L({ ko: "회원", en: "Member" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "상품", en: "Product" })}</th>
                  <th className="px-3 py-3 text-right font-medium">{L({ ko: "금액", en: "Amount" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "상태", en: "Status" })}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.orderId} className="border-b border-hairline align-top last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/members/${r.userId}`} className="font-semibold text-accent hover:underline">{r.email || r.userId.slice(0, 8)}</Link>
                      <span className="block text-[11px] text-fg-subtle">{fmtDateTime(r.approvedAt ?? r.createdAt)} · {r.method ?? "—"}</span>
                      <span className="block font-mono text-[11px] text-fg-subtle">{r.orderId}</span>
                    </td>
                    <td className="px-3 py-3">{L(PLAN[r.plan ?? ""] ?? { ko: r.plan ?? "—", en: r.plan ?? "—" })}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      {won(r.amount)}
                      {r.refunded > 0 ? <span className="block text-danger">− {won(r.refunded)}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={(STATUS[r.status] ?? STATUS.pending).tone}>{L(STATUS[r.status] ?? { ko: r.status, en: r.status })}</Pill>
                      {r.status === "done" && r.refunded > 0 ? <span className="mt-1 flex items-center gap-1 text-[11px] text-fg-muted"><RotateCcw className="size-3" aria-hidden /> {L({ ko: "부분 환불", en: "Partly refunded" })}</span> : null}
                    </td>
                    <td className="px-5 py-3 text-right">{r.refundable ? <Refund row={r} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
        <ReceiptText className="size-3.5" aria-hidden />
        {L({ ko: "카드 영수증은 토스페이먼츠가 회원에게 직접 발급해요. 추천 수익 지급은 [추천 정산]에서 해요.", en: "Toss Payments issues card receipts to members directly. Referral payouts are under Referral payouts." })}
      </p>
    </div>
  );
}
