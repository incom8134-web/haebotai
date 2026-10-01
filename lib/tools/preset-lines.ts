import type { ToolField, ToolManifest } from "./types";
import type { ToolPreset } from "./content";
import { localizeWith, presetValuesWith, type FieldsEn, type PresetsEn } from "./localize";

/** Human-readable "label: value" lines for a preset, in the UI's language, using the manifest's field and option labels. */
export function presetLines(
  manifest: Pick<ToolManifest, "id" | "inputs">,
  preset: ToolPreset,
  locale = "ko",
  index?: number,
  strings: { fieldsEn: FieldsEn; presetsEn: PresetsEn } = { fieldsEn: {}, presetsEn: {} },
): string[] {
  const fields = manifest.inputs.map((f) => localizeWith(strings.fieldsEn, f, locale));
  const values = index === undefined ? preset.values : presetValuesWith(strings.presetsEn, index, preset.values, locale);
  return Object.entries(values).map(([id, value]) => {
    const field = fields.find((f) => f.id === id) as ToolField | undefined;
    const label = field?.label ?? id;
    const optionLabel = (v: string) => (field && "options" in field ? (field.options.find((o) => o.value === v)?.label ?? v) : v);
    const shown = Array.isArray(value) ? value.map(optionLabel).join(", ") : typeof value === "number" ? value.toLocaleString() : optionLabel(value);
    return `${label}: ${shown}`;
  });
}
