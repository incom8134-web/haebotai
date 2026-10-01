"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useBi } from "@/lib/i18n/context";
import { LABELS, humanize } from "@/lib/tools/output-labels";
import { REGENERATE_PRESETS, regenerateCost, regeneratableSections } from "@/lib/projects/regenerate";

// "이 부분만 다시": pick one part of the result and say how to change it.
// The rewrite is saved as a new version; this one stays as it is.

export function RegeneratePanel({ runId, toolId, output, estimatedCredits, isFree }: { runId: string; toolId: string; output: unknown; estimatedCredits: number; isFree?: boolean }) {
  const L = useBi();
  const router = useRouter();
  const sections = regeneratableSections(toolId, output);
  const [section, setSection] = useState(sections[0] ?? "");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  if (!sections.length) return null;
  const cost = regenerateCost(estimatedCredits);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/runs/${runId}/regenerate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, instruction }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(L({ ko: "새 버전을 만들었어요", en: "New version created" }));
      router.push(`/library/${json.runId}`);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <details className="mt-4 rounded-2xl border border-hairline bg-surface px-4 py-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg">
        <Wand2 className="size-4 text-accent" aria-hidden /> {L({ ko: "이 부분만 다시 만들기", en: "Redo one part" })}
        <span className="ml-auto text-2xs font-normal text-fg-subtle">{isFree ? L({ ko: "무료", en: "Free" }) : L({ ko: `${cost} 크레딧`, en: `${cost} credits` })}</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          {L({ ko: "다시 만들 부분", en: "Part to redo" })}
          <select value={section} onChange={(e) => setSection(e.target.value)} className="rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg">
            {sections.map((s) => (
              <option key={s} value={s}>{LABELS[s] ?? humanize(s)}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {REGENERATE_PRESETS.map((p) => (
            <button key={p.ko} type="button" onClick={() => setInstruction(L(p))} className="rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted hover:border-accent hover:text-fg">
              {L(p)}
            </button>
          ))}
        </div>
        <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={500} rows={2} aria-label={L({ ko: "어떻게 바꿀까요", en: "How to change it" })} placeholder={L({ ko: "어떻게 바꿀까요? 예: 20대가 쓰는 말투로", en: "How should it change? e.g. in the voice of people in their 20s" })} className="rounded-lg border border-hairline bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
        <div className="flex items-center gap-2">
          <p className="text-2xs text-fg-subtle">{L({ ko: "새 버전으로 저장돼요. 지금 결과는 그대로 남습니다.", en: "Saved as a new version; this result stays as it is." })}</p>
          <button type="button" disabled={busy || !instruction.trim() || !section} onClick={run} className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? L({ ko: "만드는 중…", en: "Working…" }) : L({ ko: "다시 만들기", en: "Redo" })}
          </button>
        </div>
      </div>
    </details>
  );
}
