import a from "./experience-a.json";
import b from "./experience-b.json";
import type { Bilingual } from "./content";

// Per-tool run-page experience: each tool gets its own layout, story,
// grouped steps, control types and a live "stage" preview — so the 18
// tools don't all look like the same form. Field ids and option values
// are checked against the manifests in experience.test.ts.

export type Layout = "split" | "steps" | "canvas";
export type Visual =
  | "routes" | "score" | "compass" | "calendar" | "prompt" | "article" | "copy" | "tiers" | "map"
  | "gallery" | "logo" | "model" | "page" | "site" | "doc" | "deck" | "plan" | "checklist";
export type Display = "cards" | "segmented" | "slider" | "slider-select" | "toggles" | "swatches" | "ratio" | "date";

export interface FieldUi {
  display?: Display;
  placeholder?: Bilingual;
  min?: number;
  max?: number;
  step?: number;
  unit?: Bilingual;
  options?: Record<string, { icon?: string; desc?: Bilingual }>;
}

export interface Experience {
  layout: Layout;
  visual: Visual;
  hero: { title: Bilingual; story: Bilingual };
  sections: { title: Bilingual; hint: Bilingual; fields: string[] }[];
  ui: Record<string, FieldUi>;
  stage: { headline: Bilingual; story: Bilingual; promises: { icon: string; text: Bilingual }[] };
}

const all = { ...a, ...b } as Record<string, Experience>;

export function getExperience(toolId: string): Experience | undefined {
  return all[toolId];
}
