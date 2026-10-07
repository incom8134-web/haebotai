import "server-only";
import type { Metadata } from "next";
import { cookies } from "next/headers";

// Page titles in the site's language (the `locale` cookie, as in
// app/layout.tsx). The browser tab then reads "Pricing — AI Haeba" on the
// English site instead of a Korean title a phone's translator turns into
// "AI Sunflower".

export const BRAND_NAME = { ko: "AI 해바", en: "AI Haeba" } as const;

export async function siteLocale(): Promise<"ko" | "en"> {
  return (await cookies()).get("locale")?.value === "en" ? "en" : "ko";
}

/** generateMetadata for a page called `ko` / `en`, plus any other fields. */
export function titled(ko: string, en: string, extra: Omit<Metadata, "title"> = {}) {
  return async (): Promise<Metadata> => {
    const locale = await siteLocale();
    return { ...extra, title: `${locale === "en" ? en : ko} — ${BRAND_NAME[locale]}` };
  };
}
