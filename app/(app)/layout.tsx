import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { getBalance } from "@/lib/credits";
import { getMembership } from "@/lib/membership";

// Shell data only: who's signed in, credits, plan, and whether a support
// reply is waiting (dot on the Help dock item). Sign-out lives on /account.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [balance, membership, answered] = user
    ? await Promise.all([
        getBalance(),
        getMembership(),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "answered"),
      ])
    : [null, null, null];

  return (
    <AppShell user={user?.email ? { email: user.email } : null} balance={balance} plan={membership?.plan ?? "free"} answeredTickets={answered?.count ?? 0}>
      {children}
    </AppShell>
  );
}
