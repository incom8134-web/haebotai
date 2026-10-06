import { LegalDocView } from "@/components/site/legal-doc";
import { PRIVACY } from "@/lib/site/legal";

export const metadata = { title: "개인정보 처리방침 — AI 해바" };

export default function Page() {
  return <LegalDocView doc={PRIVACY} />;
}
