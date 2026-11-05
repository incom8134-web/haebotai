"use client";

import { useEffect, useMemo } from "react";
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
import { useBi } from "@/lib/i18n/context";
import type { ToolField } from "@/lib/tools/types";

// HAEBOT_A_TOOLS_SPEC.md §3.1 — renders a form from a manifest's
// `inputs: ToolField[]`. The generic fallback; per-tool controls live in
// components/tools/experience/controls.tsx.

export type ToolFormValues = Record<string, unknown>;

// A single control is wrapped in its <label> (so the label names it for
// screen readers and clicking it focuses the control); a group of
// controls (toggles, chips, uploads) is a fieldset with a legend.
function Field({ label, required, group, children }: { label: string; required?: boolean; group?: boolean; children: React.ReactNode }) {
  const L = useBi();
  const caption = (
    <>
      {label}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : null}
      {required ? <span className="sr-only"> ({L({ ko: "필수", en: "required" })})</span> : null}
    </>
  );
  if (group) {
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium break-keep text-fg">{caption}</legend>
        {children}
      </fieldset>
    );
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium break-keep text-fg">{caption}</span>
      {children}
    </label>
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
        <Badge key={`${v}-${i}`} variant="secondary" className="gap-1" title={v}>
          <span className="min-w-0 truncate">{v}</span>
          <button type="button" className="shrink-0" aria-label={`${v} 삭제`} onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {(!max || values.length < max) && (
        <input
          className="min-w-24 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          placeholder={values.length === 0 ? placeholder : ""}
          onKeyDown={(e) => {
            // Korean IME: Enter first commits the syllable being composed;
            // acting on that press left a stray syllable in the box.
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            const target = e.currentTarget;
            if (e.key === "Enter" && target.value.trim()) {
              e.preventDefault();
              onChange([...values, target.value.trim()]);
              target.value = "";
            } else if (e.key === "Backspace" && !target.value && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          // Text typed but not yet added with Enter would be lost on Save/Run.
          onBlur={(e) => {
            const text = e.currentTarget.value.trim();
            if (text) {
              onChange([...values, text]);
              e.currentTarget.value = "";
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
                  placeholder={f.placeholder ?? (f.kind === "url" ? "https://" : undefined)}
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
                  items={f.options}
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
              <Field key={f.id} label={f.label} group>
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
              <Field key={f.id} label={f.label} group>
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
              <Field key={f.id} label={f.label} group>
                <ImageField max={f.maxFiles ?? 1} value={value} onChange={(files) => onChange(f.id, files)} />
              </Field>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// Uploaded photos as thumbnails with a remove button; new drops add to the
// list until it is full, instead of replacing it.
function ImageField({ max, value, onChange }: { max: number; value: unknown; onChange: (files: File[]) => void }) {
  const L = useBi();
  const files = useMemo(() => (Array.isArray(value) ? value.filter((v): v is File => typeof File !== "undefined" && v instanceof File) : []), [value]);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const room = max - files.length;
  return (
    <div className="flex flex-col gap-2">
      {files.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={urls[i]} alt={f.name} className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 text-[10px] font-semibold text-white tabular-nums">{i + 1}</span>
              <button type="button" onClick={() => onChange(files.filter((_, k) => k !== i))} aria-label={L({ ko: `${i + 1}번 사진 빼기`, en: `Remove photo ${i + 1}` })} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {room > 0 ? (
        <Dropzone maxFiles={room} onFiles={(added) => onChange([...files, ...added].slice(0, max))} className={files.length ? "[&_[data-slot=dropzone]]:!min-h-0 [&_[data-slot=dropzone]]:!p-3 [&_[data-slot=dropzone]>p:nth-of-type(2)]:hidden" : undefined} />
      ) : (
        <p className="text-xs text-fg-subtle">{L({ ko: `최대 ${max}장까지 올렸어요. 바꾸려면 사진을 빼 주세요.`, en: `That's the maximum of ${max}. Remove one to swap it.` })}</p>
      )}
      {files.length > 0 ? <p className="text-2xs text-fg-subtle">{L({ ko: `${files.length}/${max}장 · 번호 순서대로 결과에 쓰여요`, en: `${files.length}/${max} · used in this order` })}</p> : null}
    </div>
  );
}

export { ToolForm, TagList };
