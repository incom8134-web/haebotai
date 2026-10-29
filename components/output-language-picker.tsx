"use client";

import { Languages } from "lucide-react";
import { useBi, useLocale } from "@/lib/i18n/context";
import { useLocalValue } from "@/lib/hooks/use-local-list";
import { cn } from "@/lib/utils";

export type OutputLang = "ko" | "en";

// The language a result is written in (lib/ai/output-language.ts), chosen
// before a run. Remembered per browser, so 바로 만들기 and every tool page
// share the choice; until the member picks, it follows the site language.
export function useOutputLanguage(): [OutputLang, (next: OutputLang) => void] {
  const { locale } = useLocale();
  const [saved, setSaved] = useLocalValue("haeba-output-lang");
  const lang: OutputLang = saved === "ko" || saved === "en" ? saved : locale === "en" ? "en" : "ko";
  return [lang, setSaved];
}

const OPTIONS: { value: OutputLang; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
];

export function OutputLanguagePicker({ className }: { className?: string }) {
  const L = useBi();
  const [lang, setLang] = useOutputLanguage();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted">
        <Languages size={15} className="text-accent" aria-hidden /> {L({ ko: "결과 언어", en: "Result language" })}
      </span>
      <div role="radiogroup" aria-label={L({ ko: "결과 언어", en: "Result language" })} className="inline-flex rounded-xl border border-hairline bg-surface p-0.5">
        {OPTIONS.map((o) => {
          const on = lang === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setLang(o.value)}
              className={cn("h-8 rounded-[10px] px-3 text-sm font-medium transition-colors", on ? "bg-accent text-white" : "text-fg-muted hover:text-fg")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
