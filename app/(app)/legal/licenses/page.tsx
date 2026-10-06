import { LegalDocView } from "@/components/site/legal-doc";
import { LICENSES } from "@/lib/site/legal";

export const metadata = { title: "오픈소스·서체 라이선스 — AI 해바" };

export default function Page() {
  return <LegalDocView doc={LICENSES} />;
}
