"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FactChipProps {
  /** Addressable ref, e.g. "f1". */
  ref_: string;
  label: string;
  value: string;
  confidence?: number;
  editable?: boolean;
  /** External driver — true when a hovered caption cites this fact. */
  highlighted?: boolean;
  onEdit?: (patch: { label?: string; value?: string }) => void;
  onDelete?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  /** Position in a staggered list entrance — delay = index * 30ms. */
  index?: number;
  className?: string;
}

function FactChip({
  ref_,
  label,
  value,
  editable = true,
  highlighted = false,
  onEdit,
  onDelete,
  onHoverStart,
  onHoverEnd,
  index = 0,
  className,
}: FactChipProps) {
  const [editing, setEditing] = useState<"label" | "value" | null>(null);
  const [draft, setDraft] = useState(value);
  const [draftLabel, setDraftLabel] = useState(label);

  function commit() {
    if (draftLabel !== label || draft !== value) {
      onEdit?.({ label: draftLabel, value: draft });
    }
    setEditing(null);
  }

  return (
    <motion.div
      data-slot="fact-chip"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className={cn(
        "group/chip inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors duration-(--dur-fast)",
        highlighted
          ? "border-grounded/60 bg-grounded-dim"
          : "border-hairline bg-grounded-dim/40 hover:border-hairline-str",
        className,
      )}
    >
      <span className="text-grounded">{ref_}</span>

      {editing === "label" ? (
        <input
          autoFocus
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-16 bg-transparent text-fg-muted outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => editable && setEditing("label")}
          className="text-fg-muted disabled:cursor-default"
        >
          {draftLabel}
        </button>
      )}

      <span className="text-fg-subtle">·</span>

      {editing === "value" ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-20 bg-transparent text-fg outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => editable && setEditing("value")}
          className="text-fg disabled:cursor-default"
        >
          {draft}
        </button>
      )}

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${ref_} 삭제`}
          className="ml-0.5 -mr-0.5 rounded-sm p-0.5 text-fg-subtle opacity-0 transition-opacity duration-(--dur-fast) group-hover/chip:opacity-100 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </motion.div>
  );
}

export { FactChip };
