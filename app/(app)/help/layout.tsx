import { SubNav } from "@/components/site/sub-nav";
import { HELP_NAV } from "@/lib/site/sections";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <SubNav items={HELP_NAV} id="help" />
      {children}
    </div>
  );
}
