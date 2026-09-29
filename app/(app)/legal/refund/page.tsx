import { LegalDocView } from "@/components/site/legal-doc";
import { REFUND } from "@/lib/site/legal";

export const metadata = { title: "환불정책 — 해봇 AI" };

export default function Page() {
  return <LegalDocView doc={REFUND} />;
}
