import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";
// Korean UI text needs a Korean-native face — Geist has no Hangul glyphs.
// The dynamic subset splits Pretendard into ~90 unicode-range chunks, so
// a page downloads only the glyphs it shows instead of preloading the
// whole 2MB font (which made every page slow on phones).
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { CookieNotice } from "@/components/site/cookie-notice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the Studio (ported from the AI Haeba Studio design).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});


const description = "AI marketing and business tools for small businesses, built on your own facts — researched claims come with their sources.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "AI 해바",
  description,
  openGraph: { type: "website", siteName: "AI 해바", locale: "ko_KR", title: "AI 해바", description },
  twitter: { card: "summary_large_image", title: "AI 해바", description },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "ko";
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
            <Toaster />
            <CookieNotice />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
