import { LegalDocView } from "@/components/site/legal-doc";
import { LICENSES } from "@/lib/site/legal";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("오픈소스·서체 라이선스", "Open-source & font licenses");

export default function Page() {
  return <LegalDocView doc={LICENSES} />;
}
