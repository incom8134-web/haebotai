import type { Source } from "../registry/shared.ts";
import { fmt } from "./charts.ts";
import type { ReportBlock } from "./types.ts";

// Loose readers for model output: every report builder has to cope with
// runs saved before a field existed, a number sent as "12,000", or a
// list that came back empty.

export type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
export const obj = (v: unknown): Obj => (isObj(v) ? v : {});
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const objs = (v: unknown): Obj[] => list(v).filter(isObj);
export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
export const strs = (v: unknown): string[] => list(v).map(str).filter(Boolean);
export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
export const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "number" ? Number.isFinite(v) : Boolean(str(v)));

export const won = (n: number) => (n > 0 ? fmt(n, "원") : "확인 필요");
export const pct = (n: number) => `${Math.round(n)}%`;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function sourcesOf(...values: unknown[]): Source[] {
  const out: Source[] = [];
  for (const v of values) {
    for (const s of objs(v)) {
      const url = str(s.url);
      if (/^https?:\/\//.test(url)) out.push({ url, title: str(s.title) || url, domain: str(s.domain) || undefined } as Source);
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => !seen.has(s.url) && Boolean(seen.add(s.url)));
}

/** Drop blocks with nothing in them, so a section never renders an empty frame. */
export function keep(blocks: (ReportBlock | null | false | undefined)[]): ReportBlock[] {
  return blocks.filter((b): b is ReportBlock => {
    if (!b) return false;
    switch (b.type) {
      case "text":
        return Boolean(b.text.trim());
      case "callout":
        return Boolean(b.text.trim());
      case "bullets":
        return b.items.length > 0;
      case "table":
        return b.rows.length > 0;
      case "cards":
        return b.items.length > 0;
      case "kpis":
        return b.items.length > 0;
      case "quad":
        return b.cells.some((c) => c.items.length);
      case "sources":
        return b.items.length > 0;
      default:
        return true;
    }
  });
}

// One identity per tool: the report's accent and chart series colors.
// Mid-tone hues that read on both the light and dark result page.
export const PALETTES: Record<string, string[]> = {
  "business-plan": ["#2F5BEA", "#C9962B", "#1F9D8B", "#8B5CF6", "#E05A47", "#64748B"],
  trend: ["#D6336C", "#7C3AED", "#0EA5E9", "#F59E0B", "#10B981", "#64748B"],
  calendar: ["#16A34A", "#0EA5E9", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"],
  money: ["#059669", "#F59E0B", "#6366F1", "#EF4444", "#0EA5E9", "#64748B"],
  keyword: ["#0891B2", "#F97316", "#7C3AED", "#16A34A", "#E11D48", "#64748B"],
  place: ["#03A94E", "#FF7A00", "#3B82F6", "#A855F7", "#EF4444", "#64748B"],
  proposal: ["#4F46E5", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9", "#64748B"],
  strategy: ["#7C3AED", "#F43F5E", "#0EA5E9", "#F59E0B", "#10B981", "#64748B"],
  grant: ["#0D9488", "#2563EB", "#F59E0B", "#DB2777", "#7C3AED", "#64748B"],
};

export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
