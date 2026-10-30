import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";
import { getCurrentUser } from "@/lib/supabase/user";
import { isHost } from "@/lib/platform-access-server";
import { liveAnnouncements, unreadNotices } from "@/lib/admin-ops-server";
import { ShellNotices, type ShellNotice } from "@/components/site/service-banner";
import { dismissMemberNotice } from "@/lib/actions/notices";

// Shell data only: who's signed in, credits, plan, whether a support
// reply is waiting (dot on the Help dock item), and banners from /admin.
// Sign-out lives on /account.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [balance, membership, answered] = user
    ? await Promise.all([
        getBalance(),
        getMembership(),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "answered"),
      ])
    : [null, null, null];

  // Site banners from /admin/announcements, then notices staff sent this member.
  const [banners, notices] = await Promise.all([liveAnnouncements().then((a) => a.filter((x) => x.kind === "banner")), user ? unreadNotices(user.id) : []]);
  const shellNotices: ShellNotice[] = [
    ...notices.map((n) => ({ id: n.id, source: "notice" as const, tone: "warning" as const, title: { ko: n.title, en: n.title }, body: { ko: n.body, en: n.body }, link: n.link })),
    ...banners.map((b) => ({ id: `a:${b.id}`, source: "announcement" as const, tone: b.level, title: b.title, body: b.body, link: b.link })),
  ];

  return (
    <AppShell
      user={user?.email ? { email: user.email } : null}
      balance={balance}
      plan={membership?.plan ?? "free"}
      host={await isHost(user?.email)}
      answeredTickets={answered?.count ?? 0}
      notices={shellNotices.length ? <ShellNotices items={shellNotices} dismissNotice={dismissMemberNotice} /> : null}
    >
      {children}
    </AppShell>
  );
}
