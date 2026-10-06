import { verifyUnsubscribeToken } from "@/lib/consent-server";
import { UnsubscribeCard } from "./unsubscribe-card";

export const metadata = { title: "수신 거부 — AI 해바", robots: { index: false } };

// Landing page for the unsubscribe link in every marketing email. No
// login: the signed token in the link is the proof. One button, no
// questions, no "are you sure you want to miss out" (정보통신망법 §50④ —
// withdrawing must be as easy as agreeing, at no cost).
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u = "", t = "" } = await searchParams;
  const valid = !!u && !!t && verifyUnsubscribeToken(u, t);
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <UnsubscribeCard u={u} t={t} valid={valid} />
    </main>
  );
}
