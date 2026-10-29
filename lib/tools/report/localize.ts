import { EXACT_EN, TEMPLATES_EN } from "./labels-en.ts";

// The report builders (./*.ts) and the shared field labels write their
// labels in Korean. For an English reader (the site in English, or a run
// whose result language is English) the labels are swapped from a
// committed dictionary (./labels-en.ts): exact labels first, then the
// templated ones ("{0}주 차" → "Week {0}"), and Korean money amounts are
// rewritten as ₩ figures. The model's own content passes through: it is
// already in the run's language, and only exact label strings match.

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COMPILED: { re: RegExp; to: string }[] = TEMPLATES_EN.map(([ko, en]) => {
  const source = esc(ko).replace(/\\\{(\d)\\\}/g, (_, n) => `(?<p${n}>.+?)`);
  return { re: new RegExp(`^${source}$`, "s"), to: en };
});

const UNIT: Record<string, number> = { 만: 1e4, 억: 1e8, 조: 1e12 };

function compactWon(n: number): string {
  const a = Math.abs(n);
  const f = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US");
  if (a >= 1e12) return `₩${f(n / 1e12)}T`;
  if (a >= 1e9) return `₩${f(n / 1e9)}B`;
  if (a >= 1e6) return `₩${f(n / 1e6)}M`;
  if (a >= 1e3) return `₩${f(n / 1e3)}K`;
  return `₩${n.toLocaleString("en-US")}`;
}

/** "1억 2,000만원" / "3,500만 원" / "12,000원" → ₩ figures. */
export function englishMoney(text: string): string {
  return text
    .replace(/(-?[\d,]+(?:\.\d+)?)\s*(조|억)\s*(?:([\d,]+(?:\.\d+)?)\s*만)?\s*원?/g, (m, a: string, u: string, b?: string) => {
      const n = Number(a.replace(/,/g, "")) * UNIT[u] + (b ? Number(b.replace(/,/g, "")) * 1e4 : 0);
      return Number.isFinite(n) ? compactWon(n) : m;
    })
    .replace(/(-?[\d,]+(?:\.\d+)?)\s*만\s*원?/g, (m, a: string) => {
      const n = Number(a.replace(/,/g, "")) * 1e4;
      return Number.isFinite(n) ? compactWon(n) : m;
    })
    .replace(/(-?[\d,]+(?:\.\d+)?)\s*원(?![가-힣])/g, (m, a: string) => {
      const n = Number(a.replace(/,/g, ""));
      return Number.isFinite(n) ? `₩${n.toLocaleString("en-US")}` : m;
    });
}

/** One label in English (unchanged when it isn't a known label). */
export function labelEn(text: string): string {
  if (!/[가-힣]/.test(text)) return text;
  if (EXACT_EN[text] !== undefined) return EXACT_EN[text];
  // A label with symbols or spaces around it ("진입 장벽↓", " (추정)").
  const parts = /^([^가-힣]*?)([가-힣][\s\S]*[가-힣]|[가-힣])([^가-힣]*)$/.exec(text);
  if (parts && EXACT_EN[parts[2]] !== undefined) return `${parts[1]}${EXACT_EN[parts[2]]}${parts[3]}`;
  for (const t of COMPILED) {
    const m = t.re.exec(text);
    if (m?.groups) return t.to.replace(/\{(\d)\}/g, (_, n) => labelEn(m.groups![`p${n}`] ?? ""));
  }
  return englishMoney(text);
}

const KEEP = new Set(["url", "id", "href", "asset_id", "color", "hex", "palette", "tone", "type", "kind", "layout", "align"]);

/** A report (or any label tree) with its labels in English; Korean is returned as is. */
export function localizeLabels<T>(value: T, lang: "ko" | "en"): T {
  if (lang !== "en") return value;
  const walk = (v: unknown, key = ""): unknown => {
    if (typeof v === "string") return KEEP.has(key) ? v : labelEn(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, KEEP.has(k) ? x : walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}
