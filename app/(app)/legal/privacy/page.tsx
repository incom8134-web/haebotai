import { LegalDocView } from "@/components/site/legal-doc";
import { PRIVACY } from "@/lib/site/legal";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("개인정보 처리방침", "Privacy policy");

export default function Page() {
  return <LegalDocView doc={PRIVACY} />;
}
