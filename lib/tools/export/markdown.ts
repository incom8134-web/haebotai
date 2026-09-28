import type { ExportDoc } from "./document.ts";

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
    }
  }
  if (doc.sources.length) {
    lines.push("## 출처", "", ...doc.sources.map((s) => `- [${s.title}](${s.url})`), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
