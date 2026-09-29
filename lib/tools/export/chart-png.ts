import "server-only";
import { Resvg } from "@resvg/resvg-js";
import { PRINT_THEME, renderChart, type ChartSpec } from "../report/charts.ts";
import { pretendardFiles } from "./fonts.ts";

// A report chart as a PNG for PDF / Word / PowerPoint: the same SVG the
// result page draws, in the print theme on white, rendered at 2× so it
// stays sharp when printed or projected.

export const CHART_WIDTH = 680;

export function chartPng(spec: ChartSpec, palette: string[], width = CHART_WIDTH): { data: Buffer; width: number; height: number } | null {
  const svg = renderChart(spec, { width, palette, theme: PRINT_THEME, background: "#FFFFFF" });
  if (!svg) return null;
  const img = new Resvg(svg, {
    fitTo: { mode: "width", value: (width + 8) * 2 },
    font: { fontFiles: pretendardFiles(), loadSystemFonts: false, defaultFontFamily: "Pretendard" },
  }).render();
  return { data: Buffer.from(img.asPng()), width: img.width, height: img.height };
}
