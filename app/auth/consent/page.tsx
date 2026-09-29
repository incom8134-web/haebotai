import { redirect } from "next/navigation";
import { ConsentForm } from "@/components/auth/consent-form";
import { getCurrentUser } from "@/lib/supabase/user";
import { hasConsent, safeNext } from "@/lib/consent";

export const metadata = { title: "이용 동의 — 해봇 AI", robots: { index: false } };

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(next)}`);
  if (hasConsent(user.user_metadata)) redirect(next);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div className="app-backdrop" aria-hidden>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <ConsentForm next={next} />
    </main>
  );
}
