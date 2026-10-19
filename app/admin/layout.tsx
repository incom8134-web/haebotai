import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { countOpenTickets, getAdminUser } from "@/lib/admin";
import { getFailureAlerts, getSiteSettings } from "@/lib/admin-ops-server";

// Staff only: ADMIN_EMAILS (lib/admin.ts). Everyone else, signed in or
// not, gets a plain 404, so the route's existence isn't revealed. Its own
// frame (components/admin/admin-shell.tsx), outside the member app shell.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getAdminUser();
  if (!staff) notFound();
  const [openTickets, alerts, settings] = await Promise.all([countOpenTickets(), getFailureAlerts(), getSiteSettings()]);
  return (
    <AdminShell staff={{ email: staff.email, name: staff.name }} openTickets={openTickets} alerts={alerts.length} opsActive={settings.maintenance.on || Object.keys(settings.pausedTools).length > 0}>
      {children}
    </AdminShell>
  );
}
