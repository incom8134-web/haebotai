"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useBi } from "@/lib/i18n/context";
import { useLocalValue } from "@/lib/hooks/use-local-list";
import { cn } from "@/lib/utils";

// Small pieces shared by the discover tools' result views.

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const L = useBi();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error(L({ ko: "복사하지 못했어요", en: "Couldn't copy" }));
        }
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-hairline px-2 py-1 text-2xs text-fg-muted transition-colors hover:border-hairline-str hover:text-fg",
        className,
      )}
      aria-label={label ?? L({ ko: "복사", en: "Copy" })}
    >
      {done ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {done ? L({ ko: "복사됨", en: "Copied" }) : (label ?? L({ ko: "복사", en: "Copy" }))}
    </button>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-2xs font-semibold tracking-wide text-accent uppercase">{children}</p>;
}

export function SectionTitle({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <header className="mb-3">
      <Kicker>{kicker}</Kicker>
      <h3 className="mt-0.5 text-lg font-bold text-fg break-keep">{title}</h3>
      {lead ? <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{lead}</p> : null}
    </header>
  );
}

/** A set of string ids kept per run in this browser (favourites, checked items). */
export function useLocalSet(key: string) {
  const [raw, setRaw] = useLocalValue(key);
  let set = new Set<string>();
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) set = new Set(parsed.map(String));
  } catch {
    /* ignore a corrupted value */
  }
  const toggle = (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRaw(JSON.stringify([...next]));
  };
  return [set, toggle] as const;
}

export const won = (n: number) => (Number.isFinite(n) && n !== 0 ? `${Math.round(n).toLocaleString("ko-KR")}원` : "—");
