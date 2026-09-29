import { fmt, type ChartSpec } from "../report/charts.ts";
import type { ExportDoc } from "./document.ts";

const cellText = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function mdTable(header: string[], rows: string[][], align: ("l" | "r" | "c")[] = []): string[] {
  const rule = header.map((_, i) => (align[i] === "r" ? "---:" : align[i] === "c" ? ":---:" : "---"));
  return [`| ${header.map(cellText).join(" | ")} |`, `| ${rule.join(" | ")} |`, ...rows.map((r) => `| ${header.map((_, i) => cellText(r[i] ?? "")).join(" | ")} |`)];
}

/** The data behind a chart, as rows. */
export function chartTable(c: ChartSpec): { header: string[]; rows: string[][] } | null {
  switch (c.kind) {
    case "bar":
    case "line":
      return { header: ["", ...c.series.map((s) => s.name)], rows: c.categories.map((cat, i) => [cat, ...c.series.map((s) => fmt(s.values[i] ?? 0, c.unit ?? ""))]) };
    case "donut":
      return { header: ["항목", "값"], rows: c.slices.map((s) => [s.label, fmt(s.value, c.unit ?? "")]) };
    case "radar":
      return { header: ["", ...c.series.map((s) => s.name)], rows: c.axes.map((a, i) => [a, ...c.series.map((s) => String(s.values[i] ?? ""))]) };
    case "scatter":
      return { header: ["항목", c.xLabel, c.yLabel], rows: c.points.map((p) => [p.label, String(Math.round(p.x * 10) / 10), String(Math.round(p.y * 10) / 10)]) };
    case "gantt":
      return { header: ["단계", "시작", "끝"], rows: c.rows.map((r) => [r.label, c.scale[Math.floor(r.start)] ?? "", c.scale[Math.floor(r.end)] ?? ""]) };
    case "heatmap":
      return { header: ["", ...c.cols], rows: c.rows.map((r, i) => [r, ...c.cols.map((_, j) => String(c.values[i]?.[j] ?? 0))]) };
    case "gauge":
      return { header: [c.label], rows: [[`${c.value} / ${c.max}`]] };
    case "circles":
      return { header: ["구분", "규모", "근거"], rows: c.items.map((it) => [it.label, it.value, it.note ?? ""]) };
    case "funnel":
      return { header: ["단계", "값"], rows: c.stages.map((s) => [s.label, s.display ?? fmt(s.value)]) };
  }
}

export function buildMarkdown(doc: ExportDoc): string {
  const lines: string[] = [`# ${doc.title}`, "", `_${doc.subtitle}_`, ""];
  for (const b of doc.blocks) {
    switch (b.type) {
      case "heading":
        lines.push(`${"#".repeat(b.level + 1)} ${b.text}${b.estimated ? " _(추정)_" : ""}`, "");
        break;
      case "paragraph":
        lines.push(b.text, "");
        break;
      case "markdown":
        lines.push(b.text.trim(), "");
        break;
      case "field":
        lines.push(`**${b.label}**: ${b.value}`, "");
        break;
      case "bullets":
        lines.push(...b.items.map((i) => `- ${i}`), "");
        break;
      case "image":
        lines.push(`![${b.caption ?? ""}](${b.url})`, "");
        break;
      case "kpis":
        lines.push(`| ${b.items.map((k) => k.label).join(" | ")} |`, `| ${b.items.map(() => "---").join(" | ")} |`, `| ${b.items.map((k) => `**${k.value}**${k.note ? ` (${k.note})` : ""}`).join(" | ")} |`, "");
        break;
      case "table":
        if (b.title) lines.push(`**${b.title}**`, "");
        lines.push(...mdTable(b.header, b.rows, b.align), "");
        if (b.caption) lines.push(`_${b.caption}_`, "");
        break;
      case "chart": {
        // Markdown can't draw: the chart's numbers as a table instead.
        const t = chartTable(b.chart);
        if (!t) break;
        lines.push(`**${b.title ?? "차트"}**${b.estimated ? " _(추정)_" : ""}`, "", ...mdTable(t.header, t.rows), "");
        if (b.caption) lines.push(`_${b.caption}_`, "");
        break;
      }
      case "callout":
        lines.push(`> **${b.label}**`, `> ${b.text.replace(/\n/g, "\n> ")}`, "");
        break;
    }
  }
  if (doc.sources.length) {
    lines.push("## 출처", "", ...doc.sources.map((s) => `- [${s.title}](${s.url})`), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
