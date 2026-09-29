"use client";

import { useBi } from "@/lib/i18n/context";
import { BUSINESS, biz } from "@/lib/site/business";
import { cn } from "@/lib/utils";

// The operator details Korean e-commerce law requires on the site
// (전자상거래법 §10): shown in the landing footer and under each legal page.
// Values stay as registered (the Korean legal name and address); the
// labels follow the UI language.
export function BusinessInfo({ className }: { className?: string }) {
  const L = useBi();
  const pending = (v: string) => (v.trim() ? v : L({ ko: "(등록 예정)", en: "(pending)" }));
  const rows: [string, string][] = [
    [L({ ko: "상호", en: "Company" }), pending(BUSINESS.companyName)],
    [L({ ko: "대표", en: "CEO" }), L({ ko: biz(BUSINESS.representative), en: BUSINESS.representativeEn || biz(BUSINESS.representative) })],
    [L({ ko: "사업자등록번호", en: "Business reg. no." }), pending(BUSINESS.registrationNumber)],
    [L({ ko: "통신판매업 신고", en: "Mail-order reg. no." }), pending(BUSINESS.mailOrderNumber)],
    [L({ ko: "주소", en: "Address" }), pending(BUSINESS.address)],
    [L({ ko: "고객센터", en: "Customer service" }), [BUSINESS.phone, BUSINESS.email].filter(Boolean).join(" · ") || L({ ko: "서비스 내 1:1 문의 (평일 10–18시)", en: "1:1 inquiry in the app (weekdays 10–18 KST)" })],
    [L({ ko: "호스팅", en: "Hosting" }), BUSINESS.hostingProvider],
  ];
  return (
    <dl className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs leading-relaxed text-fg-subtle", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-1">
          <dt>{k}</dt>
          <dd className="text-fg-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
