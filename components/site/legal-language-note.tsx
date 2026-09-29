"use client";

import { useLocale } from "@/lib/i18n/context";

// The terms, privacy policy and refund policy are Korean legal documents;
// in English mode say so up front rather than leaving it unexplained.
export function LegalLanguageNote() {
  const { locale } = useLocale();
  if (locale !== "en") return null;
  return (
    <p className="mb-6 rounded-2xl border border-hairline bg-surface/60 p-4 text-sm leading-relaxed text-fg-muted">
      These policies are written in Korean under Korean law, and the Korean text is the binding version. In short: you keep the rights to what you enter and create, we never use it to train AI models, results are yours to use commercially, a Pro payment can be refunded within 7 days (pro-rated by the credits you haven&apos;t used), and you can delete your account any time from My account. Questions: incom2794@naver.com.
    </p>
  );
}
