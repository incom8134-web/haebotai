// Tax invoice (세금계산서) requests for paid orders (migration 0025).
// Members send their business details from Membership → payment history;
// staff issue the invoice on 홈택스 and mark it issued in /admin/payments.

/** A 사업자등록번호 as 10 digits when its check digit is right, else null (국세청 checksum). */
export function normalizeBusinessNo(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(d)) return null;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]) ? d : null;
}

/** "5288800923" → "528-88-00923". */
export function formatBusinessNo(d: string): string {
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d;
}

export type TaxInvoiceStatus = "requested" | "issued" | "rejected";
