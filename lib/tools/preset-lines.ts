import type { ToolField, ToolManifest } from "./types";
import type { ToolPreset } from "./content";

/** Human-readable "label: value" lines for a preset, using the manifest's field and option labels. */
export function presetLines(manifest: Pick<ToolManifest, "inputs">, preset: ToolPreset): string[] {
  return Object.entries(preset.values).map(([id, value]) => {
    const field = manifest.inputs.find((f) => f.id === id) as ToolField | undefined;
    const label = field?.label ?? id;
    const optionLabel = (v: string) => (field && "options" in field ? (field.options.find((o) => o.value === v)?.label ?? v) : v);
    const shown = Array.isArray(value) ? value.map(optionLabel).join(", ") : typeof value === "number" ? value.toLocaleString() : optionLabel(value);
    return `${label}: ${shown}`;
  });
}
