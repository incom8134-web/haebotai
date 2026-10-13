import { notFound } from "next/navigation";
import { SubNav } from "@/components/site/sub-nav";
import { ADMIN_NAV } from "@/lib/site/sections";
import { getAdminUser } from "@/lib/admin";

// Staff only: ADMIN_EMAILS (lib/admin.ts). Everyone else, signed in or
// not, gets a plain 404, so the route's existence isn't revealed.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminUser())) notFound();
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <SubNav items={ADMIN_NAV} id="admin" />
      {children}
    </div>
  );
}
