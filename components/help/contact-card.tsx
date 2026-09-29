"use client";

import { useBi } from "@/lib/i18n/context";
import { BUSINESS } from "@/lib/site/business";

/** Phone, email and operator on the customer-service page (tap to call / mail). */
export function ContactCard() {
  const L = useBi();
  if (!BUSINESS.phone && !BUSINESS.email) return null;
  return (
    <section className="glass mb-6 grid gap-3 rounded-[24px] p-5 sm:grid-cols-3" aria-label={L({ ko: "연락처", en: "Contact" })}>
      {BUSINESS.phone ? (
        <a href={`tel:${BUSINESS.phone.replace(/[^0-9]/g, "")}`} className="rounded-2xl border border-hairline p-4 hover:border-hairline-str">
          <p className="text-2xs text-fg-subtle">{L({ ko: "전화 (평일 10–18시)", en: "Phone (weekdays 10–18 KST)" })}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{BUSINESS.phone}</p>
        </a>
      ) : null}
      {BUSINESS.email ? (
        <a href={`mailto:${BUSINESS.email}`} className="rounded-2xl border border-hairline p-4 hover:border-hairline-str">
          <p className="text-2xs text-fg-subtle">{L({ ko: "이메일", en: "Email" })}</p>
          <p className="mt-1 text-lg font-semibold break-all">{BUSINESS.email}</p>
        </a>
      ) : null}
      <div className="rounded-2xl border border-hairline p-4">
        <p className="text-2xs text-fg-subtle">{L({ ko: "운영", en: "Operated by" })}</p>
        <p className="mt-1 text-sm font-medium break-keep">{BUSINESS.companyName || L({ ko: "해봇 AI", en: "Haebot AI" })}</p>
        <p className="text-2xs break-keep text-fg-muted">{BUSINESS.address}</p>
      </div>
    </section>
  );
}
