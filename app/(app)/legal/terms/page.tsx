import { LegalDocView } from "@/components/site/legal-doc";
import { TERMS } from "@/lib/site/legal";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("이용약관", "Terms of Service");

export default function Page() {
  return <LegalDocView doc={TERMS} />;
}
