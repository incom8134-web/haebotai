import { HelpTitle } from "@/components/help/help-pages";
import { WhatsNew } from "@/components/help/help-view";
import { titled } from "@/lib/site/meta";
import { liveAnnouncements } from "@/lib/admin-ops-server";

export const generateMetadata = titled("새로운 점", "What's new");

// Patch notes written in /admin/announcements come first, then the
// history kept in code (lib/site/patch-notes.ts).
export default async function WhatsNewPage() {
  const published = (await liveAnnouncements())
    .filter((a) => a.kind === "patch")
    .map((a) => ({ id: a.id, version: a.version, date: new Date(new Date(a.startsAt ?? a.createdAt).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10), title: a.title, body: a.body }));
  return (
    <>
      <HelpTitle title={{ ko: "새로운 점", en: "What's new" }} lead={{ ko: "AI 해바에 생기거나 바뀐 것들이에요.", en: "What's been added or changed in AI Haeba." }} />
      <WhatsNew published={published} />
    </>
  );
}
