import { notFound } from "next/navigation";
import { SubNav } from "@/components/site/sub-nav";
import { ADMIN_NAV } from "@/lib/site/sections";
import { getAdminUser } from "@/lib/admin";

// Gated by ADMIN_EMAILS (lib/admin.ts), not a role/permissions system —
// a plain 404 for anyone not on the list, not a redirect to sign-in,
// so the route's existence isn't revealed to a signed-in non-admin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <SubNav items={ADMIN_NAV} id="admin" />
      {children}
    </div>
  );
}
