import { LegalDocView } from "@/components/site/legal-doc";
import { LICENSES } from "@/lib/site/legal";

export const metadata = { title: "오픈소스·서체 라이선스 — 해봇 AI" };

export default function Page() {
  return <LegalDocView doc={LICENSES} />;
}
