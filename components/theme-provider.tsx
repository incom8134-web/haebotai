"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light is the default: Haebot's identity is light-first (warm paper base,
// one signature colour). Dark stays available via the toggle.
function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark"]}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider };
