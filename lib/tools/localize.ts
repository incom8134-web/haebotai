import type { ToolField } from "./types";

// Pure helpers that apply a tool's English strings. They take the strings
// as data, so client code can use them with one tool's pack (lib/tools/
// pack.ts) instead of importing every tool's English labels and presets.

export type FieldEn = { label: string; placeholder?: string; unit?: string; options?: Record<string, string> };
export type FieldsEn = Record<string, FieldEn>;
export type PresetsEn = Record<number, Record<string, string | string[]>>;

/** A field with its English label, placeholder, unit and option labels (Korean UI: unchanged). */
export function localizeWith(fieldsEn: FieldsEn, field: ToolField, locale: string): ToolField {
  if (locale !== "en") return field;
  const en = fieldsEn[field.id];
  if (!en) return field;
  const out = { ...field, label: en.label } as ToolField & { placeholder?: string; unit?: string };
  if (en.placeholder && "placeholder" in field) out.placeholder = en.placeholder;
  if (en.unit && field.kind === "number") (out as { unit?: string }).unit = en.unit;
  if ("options" in field && en.options) {
    (out as { options: { value: string; label: string }[] }).options = field.options.map((o) => ({ ...o, label: en.options![o.value] ?? o.label }));
  }
  return out;
}

/** A preset's values in the UI's language. */
export function presetValuesWith<T extends Record<string, unknown>>(presetsEn: PresetsEn | undefined, index: number, values: T, locale: string): T {
  if (locale !== "en") return values;
  const en = presetsEn?.[index];
  return en ? ({ ...values, ...en } as T) : values;
}
