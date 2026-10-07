import { HelpTitle } from "@/components/help/help-pages";
import { WhatsNew } from "@/components/help/help-view";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("새로운 점", "What's new");

export default function WhatsNewPage() {
  return (
    <>
      <HelpTitle title={{ ko: "새로운 점", en: "What's new" }} lead={{ ko: "AI 해바에 생기거나 바뀐 것들이에요.", en: "What's been added or changed in AI Haeba." }} />
      <WhatsNew />
    </>
  );
}
