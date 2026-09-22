import { SubNav } from "@/components/site/sub-nav";
import { ACCOUNT_NAV } from "@/lib/site/sections";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <SubNav items={ACCOUNT_NAV} id="account" />
      {children}
    </div>
  );
}
