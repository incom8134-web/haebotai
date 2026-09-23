"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { createProCheckout } from "@/lib/actions/payments";
import { useBi } from "@/lib/i18n/context";
import { PageHeader, primaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// One-time charge per Pro period, not silent recurring billing — see
// supabase/migrations/0014_payments.sql for why. The widget only needs
// a placeholder amount to render; the real order (with its own
// server-generated orderId) is created at the moment "결제하기" is
// clicked, not on page load, so refreshing this page never litters the
// payments table with abandoned pending rows.

export function ProCheckout({ clientKey, customerKey, customerEmail, amount }: { clientKey: string; customerKey: string; customerEmail?: string; amount: number }) {
  const L = useBi();
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tossPayments = await loadTossPayments(clientKey);
      const widgets = tossPayments.widgets({ customerKey });
      if (cancelled) return;
      await widgets.setAmount({ value: amount, currency: "KRW" });
      await widgets.renderPaymentMethods({ selector: "#toss-payment-methods" });
      await widgets.renderAgreement({ selector: "#toss-agreement" });
      if (cancelled) return;
      widgetsRef.current = widgets;
      setReady(true);
    })().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [clientKey, customerKey, amount]);

  async function handlePay() {
    if (!widgetsRef.current) return;
    setSubmitting(true);
    setError(null);
    const result = await createProCheckout();
    if (!result.ok) {
      setError(result.message === "payments_disabled" ? L({ ko: "결제가 아직 설정되지 않았어요.", en: "Payments aren't configured yet." }) : result.message);
      setSubmitting(false);
      return;
    }
    try {
      await widgetsRef.current.requestPayment({
        orderId: result.orderId,
        orderName: result.orderName,
        customerEmail,
        successUrl: `${window.location.origin}/api/payments/toss/success`,
        failUrl: `${window.location.origin}/api/payments/toss/fail`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={L({ ko: "프로 결제", en: "Upgrade to Pro" })}
        lead={L({
          ko: `월 ${amount.toLocaleString("ko-KR")}원, 1개월 단위로 결제해요. 기간이 끝나면 다시 결제해서 연장해요.`,
          en: `₩${amount.toLocaleString("en-US")}/month, charged one month at a time — renew by paying again when it expires.`,
        })}
      />
      <div className="glass rounded-[24px] p-6">
        <div id="toss-payment-methods" />
        <div id="toss-agreement" className="mt-4" />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <button type="button" onClick={handlePay} disabled={!ready || submitting} className={cn(primaryButton, "mt-4 h-11 w-full")}>
          {submitting
            ? L({ ko: "처리 중…", en: "Processing…" })
            : L({ ko: `${amount.toLocaleString("ko-KR")}원 결제하기`, en: `Pay ₩${amount.toLocaleString("en-US")}` })}
        </button>
      </div>
    </div>
  );
}
