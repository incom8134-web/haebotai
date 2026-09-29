import { SubNav } from "@/components/site/sub-nav";
import { LEGAL_NAV } from "@/lib/site/sections";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[960px] px-4 pt-6 pb-16 md:px-8 md:pt-10">
      <SubNav items={LEGAL_NAV} id="legal" />
      {children}
    </div>
  );
}
