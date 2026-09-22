"use client";

import { Check } from "lucide-react";
import { ToolForm } from "@/components/tool-form";
import { useBi } from "@/lib/i18n/context";
import type { FieldUi } from "@/lib/tools/experience";
import type { ToolField } from "@/lib/tools/types";
import { cn } from "@/lib/utils";
import { xIcon } from "./icons";

// Tool-specific controls. Everything wraps instead of truncating, and
// Korean text uses keep-all so words never split mid-syllable.

type Option = { value: string; label: string };

const SWATCHES: Record<string, string[]> = {
  mono: ["#111827", "#6b7280", "#e5e7eb"],
  vivid: ["#ef4444", "#f59e0b", "#3b82f6"],
  pastel: ["#fbcfe8", "#bfdbfe", "#bbf7d0"],
  brand: ["var(--studio-cyan)", "var(--studio-violet)", "#ffffff"],
};

function Label({ field, extra }: { field: ToolField; extra?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium break-keep text-fg">
        {field.label}
        {"required" in field && field.required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {extra}
    </div>
  );
}

export function ExField({ field, ui, value, onChange }: { field: ToolField; ui?: FieldUi; value: unknown; onChange: (v: unknown) => void }) {
  const L = useBi();
  const options: Option[] = "options" in field ? field.options : [];
  const display = ui?.display;

  if (display === "cards" && field.kind === "select") {
    return (
      <div>
        <Label field={field} />
        <div role="radiogroup" aria-label={field.label} className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {options.map((o) => {
            const meta = ui?.options?.[o.value];
            const Icon = xIcon(meta?.icon);
            const on = value === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(on && !("required" in field && field.required) ? undefined : o.value)}
                className={cn(
                  "group relative flex min-h-[92px] flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-[transform,border-color,background] duration-500 ease-[var(--spring)] hover:-translate-y-0.5",
                  on ? "border-studio-cyan/55 bg-studio-cyan/10 shadow-[inset_0_0_24px_color-mix(in_oklch,var(--studio-cyan)_8%,transparent)]" : "border-hairline bg-bg/30 hover:border-hairline-str",
                )}
              >
                <Icon size={18} className={on ? "text-studio-cyan" : "text-fg-subtle"} aria-hidden />
                <span className="text-sm leading-snug font-medium break-keep">{o.label}</span>
                {meta?.desc ? <span className="text-2xs leading-snug break-keep text-fg-muted">{L(meta.desc)}</span> : null}
                {on ? <Check size={14} className="absolute top-3 right-3 text-studio-cyan" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if ((display === "segmented" && field.kind === "select") || (display === "swatches" && field.kind === "select")) {
    return (
      <div>
        <Label field={field} />
        <div role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = value === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(on ? undefined : o.value)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm break-keep transition-colors duration-300",
                  on ? "border-transparent bg-fg text-bg" : "border-hairline bg-bg/30 text-fg-muted hover:text-fg",
                )}
              >
                {display === "swatches" ? (
                  <span className="flex -space-x-1" aria-hidden>
                    {(SWATCHES[o.value] ?? []).map((c) => <span key={c} className="size-4 rounded-full border border-hairline" style={{ background: c }} />)}
                  </span>
                ) : null}
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (display === "ratio" && field.kind === "select") {
    return (
      <div>
        <Label field={field} />
        <div role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-2">
          {options.map((o) => {
            const [w, h] = o.value.split(":").map(Number);
            const on = value === o.value;
            const scale = 36 / Math.max(w, h);
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(on ? undefined : o.value)}
                className={cn("flex w-[76px] flex-col items-center gap-2 rounded-2xl border p-3 transition-colors duration-300", on ? "border-studio-cyan/55 bg-studio-cyan/10" : "border-hairline bg-bg/30 hover:border-hairline-str")}
              >
                <span className="grid h-10 place-items-center" aria-hidden>
                  <span className={cn("rounded-[4px] border-2", on ? "border-studio-cyan" : "border-fg-subtle")} style={{ width: w * scale, height: h * scale }} />
                </span>
                <span className="font-mono text-xs">{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (display === "slider" && field.kind === "number") {
    const min = ui?.min ?? field.min ?? 0;
    const max = ui?.max ?? field.max ?? 100;
    const v = typeof value === "number" && !Number.isNaN(value) ? value : undefined;
    return (
      <div>
        <Label field={field} extra={<span className="font-mono text-sm text-studio-cyan">{v ?? "—"} <span className="text-fg-subtle">{ui?.unit ? L(ui.unit) : ""}</span></span>} />
        <input
          type="range"
          min={min}
          max={max}
          step={ui?.step ?? 1}
          value={v ?? min}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          aria-label={field.label}
          className="ex-range w-full"
          style={{ ["--fill" as string]: `${(((v ?? min) - min) / (max - min)) * 100}%` }}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-fg-subtle"><span>{min}</span><span>{max}</span></div>
      </div>
    );
  }

  if (display === "slider-select" && field.kind === "select") {
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    return (
      <div>
        <Label field={field} extra={<span className="text-sm font-medium text-studio-cyan">{value ? options[idx]?.label : "—"}</span>} />
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={idx}
          onChange={(e) => onChange(options[e.target.valueAsNumber]?.value)}
          aria-label={field.label}
          aria-valuetext={options[idx]?.label}
          className="ex-range w-full"
          style={{ ["--fill" as string]: `${(idx / Math.max(1, options.length - 1)) * 100}%` }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-fg-subtle">{options.map((o) => <span key={o.value}>{o.label}</span>)}</div>
      </div>
    );
  }

  if (display === "toggles" && field.kind === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <Label field={field} extra={<span className="text-2xs text-fg-subtle">{arr.length}/{options.length}</span>} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          {options.map((o) => {
            const on = arr.includes(o.value);
            const desc = ui?.options?.[o.value]?.desc;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={cn("flex min-h-12 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-300", on ? "border-studio-cyan/55 bg-studio-cyan/10" : "border-hairline bg-bg/30 hover:border-hairline-str")}
              >
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border", on ? "border-studio-cyan bg-studio-cyan text-bg" : "border-fg-subtle")} aria-hidden>
                  {on ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-snug break-keep">{o.label}</span>
                  {desc ? <span className="block text-2xs leading-snug break-keep text-fg-muted">{L(desc)}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (display === "date" && field.kind === "text") {
    return (
      <div>
        <Label field={field} />
        <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={field.label} className="h-11 w-full rounded-xl border border-hairline bg-bg/40 px-3.5 text-sm text-fg outline-none focus:border-studio-cyan sm:max-w-xs" />
      </div>
    );
  }

  // Fallback: the generic renderer, one field at a time, with a better placeholder.
  const withPlaceholder = ui?.placeholder && (field.kind === "text" || field.kind === "textarea" || field.kind === "chips") ? ({ ...field, placeholder: L(ui.placeholder) } as ToolField) : field;
  return <ToolForm fields={[withPlaceholder]} values={{ [field.id]: value }} onChange={(_, v) => onChange(v)} />;
}
