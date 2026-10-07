import { HelpTitle } from "@/components/help/help-pages";
import { Faq } from "@/components/help/help-view";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("자주 묻는 질문", "FAQ");

export default function FaqPage() {
  return (
    <>
      <HelpTitle title={{ ko: "자주 묻는 질문", en: "Frequently asked questions" }} lead={{ ko: "주제를 고르거나 검색해 보세요.", en: "Pick a topic or search." }} />
      <Faq />
    </>
  );
}
