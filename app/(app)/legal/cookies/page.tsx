import { LegalDocView } from "@/components/site/legal-doc";
import { COOKIES } from "@/lib/site/legal";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("쿠키 정책", "Cookie policy");

export default function Page() {
  return <LegalDocView doc={COOKIES} />;
}
