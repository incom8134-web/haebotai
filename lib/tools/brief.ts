import type { ToolField, ToolManifest } from "./types";

// Studio → tool handoff. The Studio (app/(app)/studio) collects one free-text
// "brief"; this picks which field of a tool's manifest that brief seeds.
// Preference: first required text/textarea, then any text/textarea. Tools
// whose inputs are all structured (selects, photos, numbers) return null —
// the Studio then opens them without a brief instead of guessing.

type BriefField = Extract<ToolField, { kind: "text" | "textarea" }>;

function isBriefField(field: ToolField): field is BriefField {
  return field.kind === "text" || field.kind === "textarea";
}

export function briefField(manifest: Pick<ToolManifest, "inputs">): BriefField | null {
  const candidates = manifest.inputs.filter(isBriefField);
  return candidates.find((f) => f.required) ?? candidates[0] ?? null;
}

/** Seeds a tool form from a Studio brief, respecting the field's max length. */
export function seedFromBrief(
  manifest: Pick<ToolManifest, "inputs">,
  brief: string | undefined,
): Record<string, string> {
  const text = brief?.trim();
  if (!text) return {};
  const field = briefField(manifest);
  if (!field) return {};
  return { [field.id]: field.max ? text.slice(0, field.max) : text };
}
