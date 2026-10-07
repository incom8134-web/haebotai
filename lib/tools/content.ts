import raw from "./content.json";

// Per-tool page content (tool home pages, presets, prompt library). Kept as
// JSON so the same data can drive the standalone preview artifact too.
// Preset `values` are keyed by the manifest's field ids — see
// content.test.ts, which fails if a preset drifts from its manifest.

export interface Bilingual {
  ko: string;
  en: string;
}

export type FeatureIcon =
  | "user-round"
  | "link"
  | "shield-check"
  | "search"
  | "calendar-days"
  | "file-down"
  | "layers"
  | "zap"
  | "sparkles"
  | "image"
  | "map-pin"
  | "shapes"
  | "globe";

export interface ToolPreset {
  title: Bilingual;
  tag: Bilingual;
  values: Record<string, string | number | string[]>;
}

export interface ToolContent {
  tagline: Bilingual;
  description: Bilingual;
  features: { icon: FeatureIcon; title: Bilingual; body: Bilingual }[];
  presets: ToolPreset[];
  steps: Bilingual[];
  tips: Bilingual[];
  faq: { q: Bilingual; a: Bilingual }[];
  sample: Bilingual;
}

// JSON inference types missing preset keys as undefined; content.test.ts checks the shape.
const content = raw as unknown as Record<string, ToolContent>;

export function getToolContent(toolId: string): ToolContent | undefined {
  return content[toolId];
}
