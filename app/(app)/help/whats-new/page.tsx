import { HelpTitle } from "@/components/help/help-pages";
import { WhatsNew } from "@/components/help/help-view";

export const metadata = { title: "새로운 점 — AI 해바" };

export default function WhatsNewPage() {
  return (
    <>
      <HelpTitle title={{ ko: "새로운 점", en: "What's new" }} lead={{ ko: "AI 해바에 생기거나 바뀐 것들이에요.", en: "What's been added or changed in AI Haeba." }} />
      <WhatsNew />
    </>
  );
}
