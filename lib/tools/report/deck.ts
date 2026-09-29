import type { ChartSpec } from "./charts.ts";

// A presentation slide's chart data (lib/tools/schemas/presentation.ts)
// as a chart-engine spec, shared by the web slide preview, the .pptx and
// the PDF so a deck's chart looks the same everywhere.

export interface DeckChart {
  kind?: string;
  unit?: string;
  categories?: unknown[];
  series?: { name?: unknown; values?: unknown[] }[];
  source?: string;
  takeaway?: string;
}

export function deckChartSpec(c: DeckChart | undefined | null): ChartSpec | null {
  if (!c || !Array.isArray(c.categories) || !Array.isArray(c.series)) return null;
  const categories = c.categories.map((x) => String(x ?? "")).filter(Boolean);
  const series = c.series
    .map((s) => ({ name: String(s?.name ?? ""), values: (Array.isArray(s?.values) ? s.values : []).map((v) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0)) }))
    .filter((s) => s.values.length);
  if (!categories.length || !series.length) return null;
  const unit = typeof c.unit === "string" ? c.unit : "";
  if (c.kind === "donut") {
    return { kind: "donut", slices: categories.map((label, i) => ({ label, value: series[0].values[i] ?? 0 })).filter((x) => x.value > 0), unit };
  }
  if (c.kind === "line" && categories.length >= 2) return { kind: "line", categories, series, unit };
  // Horizontal bars only for a long list of long names; a few bars read
  // bigger standing up on a 16:9 slide.
  const horizontal = series.length === 1 && categories.length > 4 && categories.some((x) => x.length > 10);
  return { kind: "bar", categories, series, unit, horizontal };
}

/** Chart colors for a deck: its accent first, then contrasting hues. */
export function deckPalette(accent: string): string[] {
  return [accent, "#F08A3C", "#0FA89B", "#7C5CF0", "#DE4F7A", "#64748B"];
}
