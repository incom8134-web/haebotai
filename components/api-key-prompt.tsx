"use client";

import Link from "next/link";
import { KeyRound, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// Shown to a signed-in member with no working API key, before a tool can
// run: on opening a tool, on pressing Run, and on Quick start's Make.
// Without it, members who skipped the key step hit a greyed-out Run button
// and left. "How to get a key" opens the guide's video; "Add my key"
// returns to `next` once the key is saved.

const STEPS = [
  { ko: "Google AI Studio에서 무료 키 만들기", en: "Get a free key in Google AI Studio" },
  { ko: "해바 「내 API 키」에 붙여넣고 「적용」", en: "Paste it into My API key and click \"apply\"" },
  { ko: "돌아와서 바로 실행", en: "Come back and run" },
];

export function ApiKeyPrompt({ open, onOpenChange, next }: { open: boolean; onOpenChange: (open: boolean) => void; next: string }) {
  const L = useBi();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-[24px] p-6 sm:max-w-md">
        <span className="studio-gradient-bg mb-4 grid size-12 place-items-center rounded-2xl text-white" aria-hidden>
          <KeyRound size={22} />
        </span>
        <DialogTitle className="text-xl font-bold break-keep">{L({ ko: "먼저 API 키를 등록해 주세요", en: "Add your API key first" })}</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">
          {L({
            ko: "해바의 도구는 내 Google API 키로 실행돼요. 키가 없으면 실행할 수 없어요. 무료로 발급되고 5분이면 끝나요.",
            en: "Haeba's tools run on your own Google API key, so nothing can run without one. It's free to get and takes about 5 minutes.",
          })}
        </DialogDescription>
        <ol className="mt-4 space-y-2">
          {STEPS.map((s, i) => (
            <li key={s.en} className="flex items-center gap-3 text-sm break-keep text-fg">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-studio-cyan/15 text-xs font-bold text-studio-cyan">{i + 1}</span>
              {L(s)}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/help/api-guide#video" className={cn(secondaryButton, "h-11 flex-1 font-semibold")}>
            <PlayCircle size={16} aria-hidden /> {L({ ko: "키 받는 방법 보기", en: "How to get a key" })}
          </Link>
          <Link href={`/account/api-key?next=${encodeURIComponent(next)}`} className={cn(primaryButton, "h-11 flex-1")}>
            <KeyRound size={16} aria-hidden /> {L({ ko: "API 키 등록하기", en: "Add my key" })}
          </Link>
        </div>
        <button type="button" onClick={() => onOpenChange(false)} className="mx-auto mt-3 text-xs text-fg-subtle hover:text-fg">
          {L({ ko: "나중에 할게요", en: "Maybe later" })}
        </button>
      </DialogContent>
    </Dialog>
  );
}
