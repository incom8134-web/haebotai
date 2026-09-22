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

export function Panel({ children, className, as: Tag = "div", id }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article"; id?: string }) {
  return (
    <Tag id={id} className={cn("glass rounded-[24px] p-6", className)}>
      {children}
    </Tag>
  );
}

export const primaryButton =
  "studio-gradient-bg inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%),0_12px_32px_-12px_var(--studio-violet)] transition-[transform,box-shadow] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_oklch(1_0_0/35%),0_18px_40px_-12px_var(--studio-violet)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0";
export const secondaryButton =
  "glass inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium text-fg transition-[transform,background] duration-500 ease-[var(--spring)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60";
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
