import { BUSINESS, biz } from "@/lib/site/business";
import { cn } from "@/lib/utils";

// The operator details Korean e-commerce law requires on the site
// (전자상거래법 §10): shown in the landing footer and under each legal page.
export function BusinessInfo({ className }: { className?: string }) {
  const rows: [string, string][] = [
    ["상호", biz(BUSINESS.companyName)],
    ["대표", biz(BUSINESS.representative)],
    ["사업자등록번호", biz(BUSINESS.registrationNumber)],
    ["통신판매업 신고", biz(BUSINESS.mailOrderNumber)],
    ["주소", biz(BUSINESS.address)],
    ["고객센터", [BUSINESS.phone, BUSINESS.email].filter(Boolean).join(" · ") || "서비스 내 1:1 문의 (평일 10–18시)"],
    ["호스팅", BUSINESS.hostingProvider],
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
