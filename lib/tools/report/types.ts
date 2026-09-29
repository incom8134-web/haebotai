import type { Source } from "../registry/shared.ts";
import type { ChartSpec } from "./charts.ts";

// A data tool's result as a report: a hero with the headline numbers,
// then sections of KPI tiles, charts, tables, cards and text. Each tool
// has its own builder (lib/tools/report/builders) deciding what to show
// and how; the result page (components/results/report-view.tsx) and the
// PDF / Word / PowerPoint / Markdown writers all render this same model,
// so a download shows the same charts and tables as the screen.

export type Tone = "up" | "down" | "warn" | "neutral";

export type ReportBlock =
  | { type: "kpis"; items: { label: string; value: string; note?: string; tone?: Tone }[] }
  | { type: "chart"; title?: string; chart: ChartSpec; caption?: string; estimated?: boolean; half?: boolean }
  | { type: "table"; title?: string; header: string[]; rows: string[][]; align?: ("l" | "r" | "c")[]; totalRow?: boolean; caption?: string; half?: boolean }
  | { type: "text"; title?: string; text: string; half?: boolean }
  | { type: "callout"; label: string; text: string; tone?: "accent" | "warn" }
  | { type: "bullets"; title?: string; items: string[]; style?: "dot" | "check" | "num"; half?: boolean }
  | { type: "cards"; title?: string; columns?: 1 | 2 | 3; items: ReportCard[] }
  | { type: "quad"; title?: string; cells: { title: string; items: string[] }[] }
  | { type: "sources"; items: Source[] };

export interface ReportCard {
  title: string;
  kicker?: string;
  badge?: string;
  /** Short "label: value" facts shown as a mini table. */
  facts?: { label: string; value: string }[];
  lines?: string[];
  /** 0..1, drawn as a bar under the title (a score or a match rate). */
  meter?: { value: number; label: string };
  /** A tiny trend line in the card. */
  spark?: number[];
}

export interface ReportSection {
  id: string;
  kicker?: string;
  title: string;
  lead?: string;
  blocks: ReportBlock[];
}

export interface Report {
  /** Chart and accent colors for this tool (hex). */
  palette: string[];
  hero: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    kpis?: { label: string; value: string; note?: string; tone?: Tone }[];
  };
  sections: ReportSection[];
}
