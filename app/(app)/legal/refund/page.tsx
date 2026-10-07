import { LegalDocView } from "@/components/site/legal-doc";
import { REFUND } from "@/lib/site/legal";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("환불정책", "Refund policy");

export default function Page() {
  return <LegalDocView doc={REFUND} />;
}
