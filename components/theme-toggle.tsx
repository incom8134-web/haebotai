"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // A returning visitor's persisted theme choice lives in localStorage,
  // invisible to the server — SSR and the first client render both fall
  // back to defaultTheme ("light"), but next-themes' mount effect then
  // immediately overwrites resolvedTheme with the real stored value,
  // which is a genuine, unavoidable mismatch for anyone who'd picked
  // dark before. Rendering a neutral icon+label until mount sidesteps
  // it instead of fighting it with suppressHydrationWarning.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- detecting "past hydration" is unavoidably effect-based
  useEffect(() => setMounted(true), []);
  const isLight = !mounted || resolvedTheme === "light";
  const label = !mounted ? "테마 전환" : isLight ? "다크 모드로 전환" : "라이트 모드로 전환";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={() => setTheme(isLight ? "dark" : "light")}
          >
            {isLight ? <Moon /> : <Sun />}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export { ThemeToggle };
