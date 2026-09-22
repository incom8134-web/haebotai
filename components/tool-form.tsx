"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { ToolField } from "@/lib/tools/types";

// HAEBOT_A_TOOLS_SPEC.md §3.1 — renders a form from a manifest's
// `inputs: ToolField[]`. The generic fallback; per-tool controls live in
// components/tools/experience/controls.tsx.

export type ToolFormValues = Record<string, unknown>;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium break-keep text-fg">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function TagList({
  values,
  max,
  onChange,
  placeholder,
}: {
  values: string[];
  max?: number;
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5">
      {values.map((v, i) => (
        <Badge key={`${v}-${i}`} variant="secondary" className="gap-1">
          {v}
          <button type="button" aria-label={`${v} 삭제`} onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {(!max || values.length < max) && (
        <input
          className="min-w-24 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          placeholder={values.length === 0 ? placeholder : ""}
          onKeyDown={(e) => {
            const target = e.currentTarget;
            if (e.key === "Enter" && target.value.trim()) {
              e.preventDefault();
              onChange([...values, target.value.trim()]);
              target.value = "";
            } else if (e.key === "Backspace" && !target.value && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
        />
      )}
    </div>
  );
}

function ToolForm({
  fields,
  values,
  onChange,
  className,
}: {
  fields: ToolField[];
  values: ToolFormValues;
  onChange: (id: string, value: unknown) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {fields.map((f) => {
        const value = values[f.id];
        switch (f.kind) {
          case "text":
          case "url":
            return (
              <Field key={f.id} label={f.label} required={f.required}>
                <Input
                  type={f.kind === "url" ? "url" : "text"}
                  value={(value as string) ?? ""}
                  maxLength={f.kind === "text" ? f.max : undefined}
                  placeholder={f.kind === "text" ? f.placeholder : undefined}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              </Field>
            );

          case "textarea":
            return (
              <Field key={f.id} label={f.label} required={f.required}>
                <Textarea
                  rows={f.rows ?? 3}
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  value={(value as string) ?? ""}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              </Field>
            );

          case "number":
            return (
              <Field key={f.id} label={f.label} required={f.required}>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={(value as number) ?? ""}
                    onChange={(e) => onChange(f.id, e.target.valueAsNumber)}
                  />
                  {f.unit ? <span className="text-xs text-fg-subtle">{f.unit}</span> : null}
                </div>
              </Field>
            );

          case "select":
            return (
              <Field key={f.id} label={f.label} required={f.required}>
                <Select
                  value={(value as string) ?? ""}
                  onValueChange={(v) => onChange(f.id, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );

          case "multiselect": {
            const selected = (value as string[]) ?? [];
            return (
              <Field key={f.id} label={f.label}>
                <div className="flex flex-wrap gap-1.5">
                  {f.options.map((o) => {
                    const active = selected.includes(o.value);
                    return (
                      <Toggle
                        key={o.value}
                        pressed={active}
                        onPressedChange={(pressed) =>
                          onChange(
                            f.id,
                            pressed
                              ? [...selected, o.value].slice(0, f.max)
                              : selected.filter((v) => v !== o.value),
                          )
                        }
                        size="sm"
                        className={cn(
                          "h-auto rounded-md border px-2 py-1 text-xs font-normal",
                          active
                            ? "border-accent/60 bg-accent-dim text-fg data-pressed:bg-accent-dim"
                            : "border-hairline text-fg-muted hover:border-hairline-str hover:bg-transparent",
                        )}
                      >
                        {o.label}
                      </Toggle>
                    );
                  })}
                </div>
              </Field>
            );
          }

          case "chips":
            return (
              <Field key={f.id} label={f.label}>
                <TagList
                  values={(value as string[]) ?? []}
                  max={f.max}
                  onChange={(next) => onChange(f.id, next)}
                  placeholder={f.placeholder ?? "입력 후 Enter"}
                />
              </Field>
            );

          case "image":
            return (
              <Field key={f.id} label={f.label}>
                <Dropzone
                  maxFiles={f.maxFiles ?? 1}
                  onFiles={(files) => onChange(f.id, files)}
                />
              </Field>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

export { ToolForm, TagList };
