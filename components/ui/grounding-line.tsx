"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GroundingLineProps {
  /** Fact refs this output cites, e.g. ["f1", "f3"]. */
  refs: string[];
  label?: string;
  /** Parent uses this to highlight the matching FactChips while hovered. */
  onHoverRefs?: (refs: string[] | null) => void;
  className?: string;
}

function GroundingLine({
  refs,
  label = "grounded in",
  onHoverRefs,
  className,
}: GroundingLineProps) {
  return (
    <div
      data-slot="grounding-line"
      onMouseEnter={() => onHoverRefs?.(refs)}
      onMouseLeave={() => onHoverRefs?.(null)}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-2xs text-grounded tracking-[0.02em]",
        className,
      )}
    >
      <Link2 className="size-3" />
      <span className="text-fg-subtle">{label}:</span>
      <span>{refs.join(" · ")}</span>
    </div>
  );
}

export { GroundingLine };
