interface UsageRow {
  createdAt: string;
  tool: string;
  provider: string | null;
  status: string;
  creditsUsed: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  runId: string;
}

// A leading = + - @ (or tab/CR) makes Excel treat the cell as a formula.
function cell(value: string | number | null): string {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM so Excel opens Korean text correctly. */
export function buildUsageCsv(rows: UsageRow[]): string {
  const header = ["date", "tool", "engine", "status", "credits_used", "input_tokens", "output_tokens", "run_id"];
  const lines = rows.map((r) => [r.createdAt, r.tool, r.provider, r.status, r.creditsUsed, r.inputTokens, r.outputTokens, r.runId].map(cell).join(","));
  return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
}
