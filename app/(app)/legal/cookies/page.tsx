import { LegalDocView } from "@/components/site/legal-doc";
import { COOKIES } from "@/lib/site/legal";

export const metadata = { title: "쿠키 정책 — 해봇 AI" };

export default function Page() {
  return <LegalDocView doc={COOKIES} />;
}
