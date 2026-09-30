"use client";

import { Check, Loader2, Minus } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import type { AgentEvent } from "@/lib/agents/types";

// The run's real steps as they happen (events from the run, not a timer):
// each stage starting and finishing, the understanding, the chosen
// strategy, review scores and revisions.

export function AgentTimeline({ events }: { events: AgentEvent[] }) {
  const L = useBi();
  // One row per stage (its latest status), plus the notes stages emitted.
  const rows: { key: string; label: { ko: string; en: string }; detail?: { ko: string; en: string }; status: AgentEvent["status"]; note: boolean }[] = [];
  const index = new Map<string, number>();
  for (const e of events) {
    if (e.kind === "handoff") continue;
    if (e.kind === "stage") {
      const at = index.get(e.stage);
      if (at !== undefined && rows[at].status === "start") {
        rows[at] = { ...rows[at], status: e.status };
        continue;
      }
      index.set(e.stage, rows.length);
      rows.push({ key: `${e.stage}-${rows.length}`, label: e.label, status: e.status, note: false });
    } else {
      rows.push({ key: `${e.kind}-${rows.length}`, label: e.label, detail: e.detail, status: "done", note: true });
    }
  }
  if (!rows.length) return null;
  return (
    <ol aria-live="polite" className="mt-3 space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className={r.note ? "flex items-start gap-2 pl-6 text-xs break-keep text-fg-muted" : "flex items-start gap-2 text-sm break-keep"}>
          {r.note ? null : r.status === "start" ? (
            <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-studio-violet" aria-hidden />
          ) : r.status === "skipped" ? (
            <Minus size={15} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
          ) : (
            <Check size={15} className="mt-0.5 shrink-0 text-grounded" aria-hidden />
          )}
          <span>
            {L(r.label)}
            {r.detail ? <span className="text-fg-subtle"> — {L(r.detail)}</span> : null}
            {!r.note && r.status === "skipped" ? <span className="text-fg-subtle"> ({L({ ko: "건너뜀", en: "skipped" })})</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
