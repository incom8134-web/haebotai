import { HelpTitle } from "@/components/help/help-pages";
import { ShortcutsView } from "@/components/help/shortcuts";

export const metadata = { title: "단축키 — 해봇 AI" };

export default function ShortcutsPage() {
  return (
    <>
      <HelpTitle title={{ ko: "단축키", en: "Keyboard shortcuts" }} lead={{ ko: "마우스 없이 더 빠르게 쓰는 방법이에요.", en: "Faster without the mouse." }} />
      <ShortcutsView />
    </>
  );
}
