import { getToolContent, type ToolContent } from "./content";
import { getExperience, type Experience } from "./experience";
import { fieldsEnFor } from "./fields-en";
import { presetsEnFor } from "./presets-en";
import type { FieldsEn, PresetsEn } from "./localize";

// One tool's page data — content, run-page experience and English strings
// — picked on the server and passed to the client as props, so a tool page
// ships its own text instead of all 25 tools' (~285 KB of JSON).
// Import this from server components only.

export interface ToolPack {
  content: ToolContent | null;
  experience: Experience | null;
  fieldsEn: FieldsEn;
  presetsEn: PresetsEn;
}

export function toolPack(toolId: string): ToolPack {
  return {
    content: getToolContent(toolId) ?? null,
    experience: getExperience(toolId) ?? null,
    fieldsEn: fieldsEnFor(toolId),
    presetsEn: presetsEnFor(toolId),
  };
}
