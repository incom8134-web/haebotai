"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CircleCheck, Crown } from "lucide-react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { useBi } from "@/lib/i18n/context";
import type { Membership } from "@/lib/membership";
import { PRO_ORDER } from "@/lib/payments/pro";
import { PageHeader, primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// Pro checkout with the Toss Payments 결제위젯 (redirect flow):
// render widget → POST /api/payments/pro/order (server records the
// order + amount) → widgets.requestPayment redirects to Toss → back to
// /checkout/success, which asks the server to confirm.

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

function BackLink() {
  const L = useBi();
  return (
    <Link href="/account/membership" className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg">
      <ArrowLeft size={15} aria-hidden /> {L({ ko: "멤버십", en: "Membership" })}
    </Link>
  );
}

function CheckoutView({ customerKey, membership }: { customerKey: string; membership: Membership }) {
  const L = useBi();
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = !CLIENT_KEY || membership.plan === "student";

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    (async () => {
      try {
        const toss = await loadTossPayments(CLIENT_KEY!);
        const widgets = toss.widgets({ customerKey });
        await widgets.setAmount({ currency: "KRW", value: PRO_ORDER.amount });
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        if (cancelled) return;
        widgetsRef.current = widgets;
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blocked, customerKey]);

  async function pay() {
    const widgets = widgetsRef.current;
    if (!widgets) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/pro/order", { method: "POST" });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "주문을 만들지 못했습니다");
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/account/membership/checkout/success`,
        failUrl: `${window.location.origin}/account/membership/checkout/fail`,
        ...(order.customerEmail ? { customerEmail: order.customerEmail } : {}),
      });
    } catch (err) {
      // Closing the payment window lands here too — not worth an alarm.
      const code = (err as { code?: string } | null)?.code;
      if (code !== "USER_CANCEL") setError(err instanceof Error ? err.message : String(err));
      setPaying(false);
    }
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={L({ ko: "프로 시작하기", en: "Get Pro" })}
        lead={L({
          ko: `${won(PRO_ORDER.amount)}로 ${PRO_ORDER.days}일 동안 프로를 쓰고 ${PRO_ORDER.credits.toLocaleString()} 크레딧을 받아요. 자동 결제는 없어요.`,
          en: `${won(PRO_ORDER.amount)} for ${PRO_ORDER.days} days of Pro and ${PRO_ORDER.credits.toLocaleString()} credits. No automatic renewal.`,
        })}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="overflow-hidden rounded-[24px] bg-white p-2 text-black">
          {blocked ? (
            <p className="p-6 text-sm text-neutral-600">
              {membership.plan === "student"
                ? L({ ko: "학생 멤버십은 이미 크레딧 제한이 없어요.", en: "Your Student membership already has unlimited credits." })
                : L({ ko: "결제가 아직 준비되지 않았어요.", en: "Checkout isn't set up yet." })}
            </p>
          ) : (
            <>
              <div id="payment-method" />
              <div id="agreement" />
              {!ready && !error ? <p className="p-6 text-sm text-neutral-500">{L({ ko: "결제 화면을 불러오는 중…", en: "Loading checkout…" })}</p> : null}
            </>
          )}
        </section>

        <aside className="glass rounded-[24px] p-5 lg:sticky lg:top-24">
          <p className="flex items-center gap-2 font-semibold">
            <Crown size={17} className="text-studio-warning" aria-hidden /> {L({ ko: "해봇 AI 프로", en: "Haebot AI Pro" })}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-fg-muted">{L({ ko: "기간", en: "Period" })}</dt><dd>{L({ ko: `${PRO_ORDER.days}일`, en: `${PRO_ORDER.days} days` })}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-muted">{L({ ko: "크레딧", en: "Credits" })}</dt><dd>+{PRO_ORDER.credits.toLocaleString()}</dd></div>
            {membership.plan === "pro" && membership.daysLeft ? (
              <div className="flex justify-between"><dt className="text-fg-muted">{L({ ko: "남은 기간", en: "Remaining" })}</dt><dd>{L({ ko: `${membership.daysLeft}일 + ${PRO_ORDER.days}일`, en: `${membership.daysLeft} + ${PRO_ORDER.days} days` })}</dd></div>
            ) : null}
            <div className="flex justify-between border-t border-hairline pt-2 font-semibold"><dt>{L({ ko: "결제 금액", en: "Total" })}</dt><dd>{won(PRO_ORDER.amount)}</dd></div>
          </dl>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
          <button type="button" onClick={pay} disabled={!ready || paying || blocked} className={cn(primaryButton, "mt-5 w-full")}>
            {paying ? L({ ko: "결제창 여는 중…", en: "Opening…" }) : L({ ko: `${won(PRO_ORDER.amount)} 결제하기`, en: `Pay ${won(PRO_ORDER.amount)}` })}
          </button>
          <p className="mt-3 text-2xs leading-relaxed text-fg-subtle">
            {L({ ko: "결제는 토스페이먼츠가 처리해요. 카드 정보는 해봇 AI에 저장되지 않아요.", en: "Payments are processed by Toss Payments. Card details never reach Haebot AI." })}
          </p>
        </aside>
      </div>
    </>
  );
}

function CheckoutSuccess({ paymentKey, orderId, amount }: { paymentKey: string; orderId: string; amount: string }) {
  const L = useBi();
  const [state, setState] = useState<{ status: "confirming" } | { status: "done" } | { status: "error"; message: string }>({ status: "confirming" });
  const sent = useRef(false);

  useEffect(() => {
    // Strict-mode double effects must not confirm twice (the server is
    // idempotent anyway, but one request is enough).
    if (sent.current) return;
    sent.current = true;
    (async () => {
      const res = await fetch("/api/payments/pro/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok) setState({ status: "done" });
      else setState({ status: "error", message: data.error ?? L({ ko: "결제를 확인하지 못했어요.", en: "Couldn't confirm the payment." }) });
    })();
  }, [paymentKey, orderId, amount, L]);

  return (
    <>
      <BackLink />
      <section className="glass mx-auto max-w-lg rounded-[28px] p-8 text-center">
        {state.status === "confirming" ? (
          <p className="text-fg-muted">{L({ ko: "결제를 확인하고 있어요…", en: "Confirming your payment…" })}</p>
        ) : state.status === "done" ? (
          <>
            <CircleCheck size={40} className="mx-auto text-studio-success" aria-hidden />
            <h1 className="mt-4 font-display text-2xl font-bold">{L({ ko: "프로가 시작됐어요", en: "You're on Pro" })}</h1>
            <p className="mt-2 text-sm text-fg-muted">
              {L({ ko: `${PRO_ORDER.days}일 이용권과 ${PRO_ORDER.credits.toLocaleString()} 크레딧이 적용됐어요.`, en: `${PRO_ORDER.days} days of Pro and ${PRO_ORDER.credits.toLocaleString()} credits were added.` })}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/studio" className={primaryButton}>{L({ ko: "스튜디오로", en: "Go to Studio" })}</Link>
              <Link href="/account/credits" className={secondaryButton}>{L({ ko: "크레딧 보기", en: "View credits" })}</Link>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle size={40} className="mx-auto text-danger" aria-hidden />
            <h1 className="mt-4 font-display text-2xl font-bold">{L({ ko: "결제를 완료하지 못했어요", en: "Payment not completed" })}</h1>
            <p className="mt-2 text-sm text-fg-muted">{state.message}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/account/membership/checkout" className={primaryButton}>{L({ ko: "다시 시도", en: "Try again" })}</Link>
              <Link href="/help/contact?kind=billing" className={secondaryButton}>{L({ ko: "문의하기", en: "Contact us" })}</Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CheckoutFail({ code, message }: { code: string | null; message: string | null }) {
  const L = useBi();
  const userCancelled = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";
  return (
    <>
      <BackLink />
      <section className="glass mx-auto max-w-lg rounded-[28px] p-8 text-center">
        <AlertTriangle size={40} className="mx-auto text-studio-warning" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold">
          {userCancelled ? L({ ko: "결제를 취소했어요", en: "Payment cancelled" }) : L({ ko: "결제에 실패했어요", en: "Payment failed" })}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {userCancelled ? L({ ko: "결제되지 않았어요. 언제든 다시 시작할 수 있어요.", en: "You weren't charged. You can start again anytime." }) : (message ?? L({ ko: "알 수 없는 오류", en: "Unknown error" }))}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/account/membership/checkout" className={primaryButton}>{L({ ko: "다시 시도", en: "Try again" })}</Link>
          <Link href="/account/membership" className={secondaryButton}>{L({ ko: "멤버십으로", en: "Back to membership" })}</Link>
        </div>
      </section>
    </>
  );
}

export { CheckoutView, CheckoutSuccess, CheckoutFail };
