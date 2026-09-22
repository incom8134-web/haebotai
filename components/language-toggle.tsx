"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n/context";

function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const label = locale === "ko" ? "Switch to English" : "한국어로 전환";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={label}
            onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
          >
            {locale === "ko" ? "EN" : "한"}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export { LanguageToggle };
