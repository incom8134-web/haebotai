import type { Metadata } from "next";
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

// Display face for the Studio (ported from the Haebot AI Studio design).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});


export const metadata: Metadata = {
  title: "해봇 AI",
  description:
    "AI marketing and business tools for small businesses, built on your own facts — researched claims come with their sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LocaleProvider>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
            <Toaster />
            <CookieNotice />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
