"use client";

import { LayoutGroup, motion } from "motion/react";
import { cn } from "@/lib/utils";

// Shared page scaffolding. Pages sit on the app backdrop; content blocks
// are liquid-glass panels.

export function Page({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto px-4 pt-6 pb-10 md:px-8 md:pt-10", wide ? "max-w-[1240px]" : "max-w-[900px]", className)}>{children}</div>;
}

export function PageHeader({ title, lead, actions, eyebrow }: { title: string; lead?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? <p className="mb-2 text-sm font-medium text-studio-cyan">{eyebrow}</p> : null}
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] text-fg">{title}</h1>
        {lead ? <p className="mt-3 text-base leading-relaxed text-fg-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export const primaryButton =
  "studio-gradient-bg btn-sheen inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_oklch(1_0_0/22%),0_1px_2px_oklch(0.25_0.03_60/20%),0_10px_24px_-12px_var(--color-accent)] transition-[transform,box-shadow,background-color] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_oklch(1_0_0/26%),0_2px_4px_oklch(0.25_0.03_60/18%),0_18px_36px_-14px_var(--color-accent)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-hairline-str bg-surface px-5 text-sm font-medium text-fg shadow-[0_1px_2px_oklch(0.25_0.03_60/8%)] transition-[transform,background-color,border-color] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2/60 active:scale-[0.98] disabled:opacity-60";
export const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-bg/40 px-3.5 text-sm text-fg outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-300 placeholder:text-fg-subtle focus:border-studio-cyan focus:shadow-[0_0_0_4px_color-mix(in_oklch,var(--studio-cyan)_15%,transparent)]";
export const textareaClass =
  "w-full rounded-xl border border-hairline bg-bg/40 px-3.5 py-3 text-sm leading-relaxed text-fg outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-300 placeholder:text-fg-subtle focus:border-studio-cyan focus:shadow-[0_0_0_4px_color-mix(in_oklch,var(--studio-cyan)_15%,transparent)]";

/** Segmented control with a sliding glass thumb (used for tabs and filters). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <LayoutGroup id={label}>
    <div role="tablist" aria-label={label} className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-300",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active ? <SegThumb /> : null}
            <span className="relative">
              {o.label}
              {o.count !== undefined ? <span className="ml-1.5 font-mono text-[10px] opacity-60">{o.count}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
    </LayoutGroup>
  );
}

function SegThumb() {
  return (
    <motion.span
      layoutId="seg-thumb"
      className="absolute inset-0 rounded-xl bg-[color-mix(in_oklch,var(--studio-cyan)_16%,var(--glass-tint-strong))] shadow-[inset_0_1px_0_var(--glass-rim)]"
      transition={{ type: "spring", stiffness: 480, damping: 36 }}
    />
  );
}
