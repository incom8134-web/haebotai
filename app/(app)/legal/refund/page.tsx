import { LegalDocView } from "@/components/site/legal-doc";
import { REFUND } from "@/lib/site/legal";

export const metadata = { title: "환불정책 — AI 해바" };

export default function Page() {
  return <LegalDocView doc={REFUND} />;
}
