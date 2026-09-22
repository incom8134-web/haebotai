"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Dark is the default: the Studio's liquid-glass look (cyan → violet over
// deep navy) is designed dark-first. Light stays available via the toggle.
function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      themes={["light", "dark"]}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider };
