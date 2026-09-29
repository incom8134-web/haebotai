import { LegalDocView } from "@/components/site/legal-doc";
import { TERMS } from "@/lib/site/legal";

export const metadata = { title: "이용약관 — 해봇 AI" };

export default function Page() {
  return <LegalDocView doc={TERMS} />;
}
