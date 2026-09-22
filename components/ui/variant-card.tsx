"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GroundingLine } from "@/components/ui/grounding-line";

export interface VariantCardProps {
  headline?: string;
  caption: string;
  refs: string[];
  selected?: boolean;
  /** True when a sibling card is selected instead — recedes visually. */
  dimmed?: boolean;
  onSelect?: () => void;
  onHoverRefs?: (refs: string[] | null) => void;
  /** Scopes the shared selection-ring layout animation to one card group. */
  groupId?: string;
  className?: string;
}

function VariantCard({
  headline,
  caption,
  refs,
  selected = false,
  dimmed = false,
  onSelect,
  onHoverRefs,
  groupId = "variant-card",
  className,
}: VariantCardProps) {
  return (
    <motion.button
      type="button"
      data-slot="variant-card"
      onClick={onSelect}
      animate={{ opacity: dimmed ? 0.55 : 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex w-full flex-col gap-3 rounded-lg border bg-surface p-4 text-left transition-colors duration-(--dur-fast)",
        selected ? "border-transparent" : "border-hairline hover:border-hairline-str",
        className,
      )}
    >
      {selected ? (
        <motion.span
          layoutId={`${groupId}-ring`}
          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      ) : null}

      {headline ? (
        <p className="text-sm font-medium text-fg">{headline}</p>
      ) : null}
      <p className="text-sm text-fg-muted whitespace-pre-wrap">{caption}</p>
      <GroundingLine refs={refs} onHoverRefs={onHoverRefs} />
    </motion.button>
  );
}

export { VariantCard };
