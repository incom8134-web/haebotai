// Charts for the data tools (business plan, trend, 90-day plan, money
// models, keywords, place audit, proposal, strategy, grants), drawn as
// plain SVG strings. One renderer serves both places a chart appears:
// the result page (CSS-variable theme, so it follows light and dark
// mode) and the PDF / Word / PowerPoint files (hex theme, rasterized by
// resvg). Each chart lays itself out for the width it's given, so the
// phone gets a narrow layout with readable text instead of a shrunken
// desktop chart.
//
// Every string that reaches the SVG goes through esc(): labels come from
// model output.

export type ChartSpec =
  | { kind: "bar"; categories: string[]; series: Series[]; unit?: string; horizontal?: boolean; stacked?: boolean; highlight?: number; max?: number }
  | { kind: "line"; categories: string[]; series: Series[]; unit?: string; area?: boolean; markers?: { index: number; label: string }[] }
  | { kind: "donut"; slices: { label: string; value: number }[]; unit?: string; center?: { value: string; label: string } }
  | { kind: "radar"; axes: string[]; series: Series[]; max: number }
  | {
      kind: "scatter";
      points: { label: string; x: number; y: number; size?: number; highlight?: boolean }[];
      xLabel: string;
      yLabel: string;
      xMax: number;
      yMax: number;
      quadrants?: [string, string, string, string]; // top-left, top-right, bottom-left, bottom-right
    }
  | { kind: "gantt"; scale: string[]; rows: { label: string; start: number; end: number; group?: string; note?: string }[] }
  | { kind: "heatmap"; rows: string[]; cols: string[]; values: number[][]; max: number; unit?: string }
  | { kind: "gauge"; value: number; max: number; label: string; bands?: [number, number] }
  | { kind: "circles"; items: { label: string; value: string; note?: string }[] }
  | { kind: "funnel"; stages: { label: string; value: number; display?: string }[] };

export interface Series {
  name: string;
  values: number[];
}

interface ChartTheme {
  fg: string;
  muted: string;
  grid: string;
  surface: string;
  onAccent: string;
  font: string;
}

export const WEB_THEME: ChartTheme = {
  fg: "var(--color-fg)",
  muted: "var(--color-fg-subtle)",
  grid: "var(--color-hairline-str)",
  surface: "var(--color-surface)",
  onAccent: "#ffffff",
  font: "inherit",
};

export const PRINT_THEME: ChartTheme = {
  fg: "#16181A",
  muted: "#6B7075",
  grid: "#E1E4E8",
  surface: "#FFFFFF",
  onAccent: "#FFFFFF",
  font: "Pretendard",
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Rough rendered width: Hangul and CJK ≈ 1em, digits and Latin ≈ 0.56em. */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᇿ㄰-㆏가-힯一-鿿]/.test(ch) ? 0.96 : /[A-Z@%#&MW]/.test(ch) ? 0.68 : ch === " " ? 0.3 : 0.56;
  return w * size;
}

export function clip(text: string, size: number, max: number): string {
  if (textWidth(text, size) <= max) return text;
  let out = "";
  for (const ch of text) {
    if (textWidth(`${out}${ch}…`, size) > max) break;
    out += ch;
  }
  return `${out}…`;
}

/** Break a label into at most `lines` lines that fit `max` px. */
function wrap(text: string, size: number, max: number, lines = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, size) <= max || !cur) cur = next;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length <= lines) return out.map((l) => clip(l, size, max));
  const kept = out.slice(0, lines);
  kept[lines - 1] = clip(`${kept[lines - 1]} ${out.slice(lines).join(" ")}`, size, max);
  return kept;
}

/** 1,234 / 3.5만 / 1.2억 — Korean units for won amounts and big counts. */
export function fmt(n: number, unit = ""): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const trim = (x: number) => (x >= 100 ? Math.round(x).toLocaleString("ko-KR") : String(Math.round(x * 10) / 10));
  if (unit === "원" || unit === "명" || unit === "회" || unit === "건" || unit === "") {
    if (a >= 1e12) return `${sign}${trim(a / 1e12)}조${unit}`;
    if (a >= 1e8) return `${sign}${trim(a / 1e8)}억${unit}`;
    if (a >= 1e4 && (unit !== "" || a >= 1e5)) return `${sign}${trim(a / 1e4)}만${unit}`;
  }
  const body = Number.isInteger(a) ? a.toLocaleString("ko-KR") : String(Math.round(a * 10) / 10);
  return `${sign}${body}${unit}`;
}

/** Axis ticks at round numbers: 0, 2, 4 … or 0, 5만, 10만 … */
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

interface Ctx {
  w: number;
  t: ChartTheme;
  p: string[];
  fs: number; // base font size
}

const txt = (c: Ctx, x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number; baseline?: string } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" style="font-size:${o.size ?? c.fs}px;fill:${o.color ?? c.t.fg};font-weight:${o.weight ?? 400};font-family:${c.t.font}" text-anchor="${o.anchor ?? "start"}"${o.baseline ? ` dominant-baseline="${o.baseline}"` : ""}>${esc(s)}</text>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, o: { rx?: number; opacity?: number; stroke?: string } = {}) =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0, w))}" height="${r1(Math.max(0, h))}" rx="${o.rx ?? 0}" style="fill:${fill};${o.opacity !== undefined ? `fill-opacity:${o.opacity};` : ""}${o.stroke ? `stroke:${o.stroke};stroke-width:1;` : ""}"/>`;
const line = (x1: number, y1: number, x2: number, y2: number, color: string, o: { width?: number; dash?: string } = {}) =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" style="stroke:${color};stroke-width:${o.width ?? 1};${o.dash ? `stroke-dasharray:${o.dash};` : ""}"/>`;

function legend(c: Ctx, names: string[], y: number): { svg: string; height: number } {
  if (names.length <= 1) return { svg: "", height: 0 };
  let x = 0;
  let row = 0;
  const parts: string[] = [];
  const size = c.fs - 1;
  names.forEach((n, i) => {
    const label = clip(n, size, c.w * 0.45);
    const w = 18 + textWidth(label, size) + 16;
    if (x + w > c.w && x > 0) {
      x = 0;
      row++;
    }
    const yy = y + row * (size + 10);
    parts.push(rect(x, yy - size + 2, 10, 10, c.p[i % c.p.length], { rx: 3 }), txt(c, x + 16, yy + 1, label, { size, color: c.t.muted }));
    x += w;
  });
  return { svg: parts.join(""), height: (row + 1) * (size + 10) + 6 };
}

// ------------------------------------------------------------------ bar

function bar(c: Ctx, s: Extract<ChartSpec, { kind: "bar" }>): { svg: string; h: number } {
  const series = s.series.filter((x) => x.values.length);
  if (!series.length || !s.categories.length) return { svg: "", h: 0 };
  const lg = legend(c, series.map((x) => x.name), c.fs);
  const top = lg.height + 4;
  const totals = s.categories.map((_, i) => series.reduce((a, x) => a + Math.max(0, x.values[i] ?? 0), 0));
  const all = s.stacked ? totals : series.flatMap((x) => x.values);
  const dataMax = s.max ?? Math.max(0, ...all);
  const dataMin = s.stacked ? 0 : Math.min(0, ...all);
  const parts: string[] = [lg.svg];

  if (s.horizontal) {
    const labelW = Math.min(c.w * 0.36, Math.max(...s.categories.map((l) => textWidth(l, c.fs))) + 10);
    const valueW = textWidth(fmt(dataMax, s.unit), c.fs - 1) + 12;
    const rowH = c.fs * (series.length > 1 && !s.stacked ? 1.1 * series.length + 1 : 2.3);
    const plotX = labelW;
    const plotW = c.w - labelW - valueW;
    const scale = (v: number) => (dataMax > 0 ? (Math.max(0, v) / dataMax) * plotW : 0);
    s.categories.forEach((cat, i) => {
      const y = top + i * rowH;
      const lines = wrap(cat, c.fs, labelW - 10, 2);
      lines.forEach((l, j) => parts.push(txt(c, labelW - 10, y + rowH / 2 + (j - (lines.length - 1) / 2) * (c.fs + 2) + c.fs * 0.35, l, { anchor: "end", color: s.highlight === i ? c.t.fg : c.t.muted, weight: s.highlight === i ? 700 : 400 })));
      parts.push(rect(plotX, y + rowH * 0.18, plotW, rowH * 0.64, c.t.grid, { rx: 4, opacity: 0.35 }));
      if (s.stacked) {
        let x = plotX;
        series.forEach((ser, k) => {
          const w = scale(ser.values[i] ?? 0);
          parts.push(rect(x, y + rowH * 0.18, w, rowH * 0.64, c.p[k % c.p.length], { rx: 0 }));
          x += w;
        });
        parts.push(txt(c, x + 6, y + rowH / 2 + c.fs * 0.35, fmt(totals[i], s.unit), { size: c.fs - 1, weight: 600 }));
      } else {
        const bh = (rowH * 0.64) / series.length;
        series.forEach((ser, k) => {
          const v = ser.values[i] ?? 0;
          const w = scale(v);
          const color = series.length === 1 && s.highlight !== undefined && s.highlight !== i ? c.p[1 % c.p.length] : c.p[k % c.p.length];
          parts.push(rect(plotX, y + rowH * 0.18 + k * bh, w, bh - (series.length > 1 ? 2 : 0), color, { rx: 4 }));
          parts.push(txt(c, plotX + w + 6, y + rowH * 0.18 + k * bh + bh / 2 + c.fs * 0.33, fmt(v, s.unit), { size: c.fs - 1, weight: 600, color: c.t.fg }));
        });
      }
    });
    return { svg: parts.join(""), h: top + s.categories.length * rowH + 4 };
  }

  const plotH = Math.max(150, Math.min(260, c.w * 0.42));
  const ticks = niceTicks(dataMin, dataMax || 1);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const axisW = Math.max(...ticks.map((t) => textWidth(fmt(t, s.unit), c.fs - 1))) + 10;
  const plotX = axisW;
  const plotW = c.w - axisW;
  const y0 = top + 8;
  const yOf = (v: number) => y0 + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  for (const t of ticks) {
    parts.push(line(plotX, yOf(t), c.w, yOf(t), c.t.grid, { width: t === 0 ? 1.2 : 0.8, dash: t === 0 ? undefined : "3 4" }));
    parts.push(txt(c, axisW - 8, yOf(t) + c.fs * 0.33, fmt(t, s.unit), { size: c.fs - 1, color: c.t.muted, anchor: "end" }));
  }
  const n = s.categories.length;
  const band = plotW / n;
  const groupW = band * (n <= 3 ? 0.5 : 0.68);
  const barW = s.stacked ? groupW : groupW / series.length;
  const showValues = n * (s.stacked ? 1 : series.length) <= (c.w < 420 ? 8 : 16);
  s.categories.forEach((cat, i) => {
    const gx = plotX + i * band + (band - groupW) / 2;
    if (s.stacked) {
      let base = 0;
      series.forEach((ser, k) => {
        const v = Math.max(0, ser.values[i] ?? 0);
        parts.push(rect(gx, yOf(base + v), barW, yOf(base) - yOf(base + v), c.p[k % c.p.length]));
        base += v;
      });
      if (showValues) parts.push(txt(c, gx + barW / 2, yOf(base) - 6, fmt(base, s.unit), { size: c.fs - 1, anchor: "middle", weight: 600 }));
    } else {
      series.forEach((ser, k) => {
        const v = ser.values[i] ?? 0;
        const color = series.length === 1 && s.highlight !== undefined && s.highlight !== i ? c.p[1 % c.p.length] : c.p[k % c.p.length];
        const yTop = Math.min(yOf(v), yOf(0));
        parts.push(rect(gx + k * barW + 1, yTop, barW - 2, Math.abs(yOf(v) - yOf(0)), color, { rx: 3 }));
        const label = fmt(v, s.unit);
        if (showValues && textWidth(label, c.fs - 2) <= barW + 6) parts.push(txt(c, gx + k * barW + barW / 2, v >= 0 ? yOf(v) - 6 : yOf(v) + c.fs + 2, label, { size: c.fs - 2, anchor: "middle", weight: 600 }));
      });
    }
    const lines = wrap(cat, c.fs - 1, band - 4, 2);
    lines.forEach((l, j) => parts.push(txt(c, plotX + i * band + band / 2, y0 + plotH + c.fs + 6 + j * (c.fs + 1), l, { size: c.fs - 1, anchor: "middle", color: c.t.muted })));
  });
  return { svg: parts.join(""), h: y0 + plotH + c.fs * 2 + 14 };
}

// ------------------------------------------------------------------ line

function lineChart(c: Ctx, s: Extract<ChartSpec, { kind: "line" }>): { svg: string; h: number } {
  const series = s.series.filter((x) => x.values.length);
  if (!series.length || s.categories.length < 2) return { svg: "", h: 0 };
  const lg = legend(c, series.map((x) => x.name), c.fs);
  const top = lg.height + 4;
  const all = series.flatMap((x) => x.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all, 1));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const axisW = Math.max(...ticks.map((t) => textWidth(fmt(t, s.unit), c.fs - 1))) + 10;
  const plotX = axisW + 6;
  const lastLabel = textWidth(s.categories[s.categories.length - 1] ?? "", c.fs - 1) / 2;
  const endLabel = Math.max(...series.map((x) => textWidth(fmt(x.values[Math.min(s.categories.length, x.values.length) - 1] ?? 0, s.unit), c.fs - 1)));
  const plotW = c.w - plotX - Math.max(10, lastLabel + 2, series.length > 1 ? endLabel / 2 + 4 : 0);
  const plotH = Math.max(150, Math.min(250, c.w * 0.4));
  const y0 = top + 14;
  const n = s.categories.length;
  const xOf = (i: number) => plotX + (i / (n - 1)) * plotW;
  const yOf = (v: number) => y0 + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const parts: string[] = [lg.svg];
  for (const t of ticks) {
    parts.push(line(plotX, yOf(t), plotX + plotW, yOf(t), c.t.grid, { width: t === 0 ? 1.2 : 0.8, dash: t === 0 ? undefined : "3 4" }));
    parts.push(txt(c, axisW, yOf(t) + c.fs * 0.33, fmt(t, s.unit), { size: c.fs - 1, color: c.t.muted, anchor: "end" }));
  }
  const every = Math.ceil(n / Math.max(2, Math.floor(plotW / (textWidth(s.categories[0] ?? "", c.fs - 1) + 14))));
  s.categories.forEach((cat, i) => {
    if (i % every === 0 || i === n - 1) parts.push(txt(c, xOf(i), y0 + plotH + c.fs + 6, clip(cat, c.fs - 1, (plotW / n) * every), { size: c.fs - 1, anchor: "middle", color: c.t.muted }));
  });
  for (const m of s.markers ?? []) {
    if (m.index < 0 || m.index > n - 1) continue;
    const x = xOf(m.index);
    parts.push(line(x, y0 - 4, x, y0 + plotH, c.t.muted, { dash: "4 4" }));
    const label = clip(m.label, c.fs - 1, c.w * 0.4);
    const lw = textWidth(label, c.fs - 1);
    const lx = Math.min(Math.max(x - lw / 2, plotX), c.w - lw);
    parts.push(txt(c, lx, y0 - 6, label, { size: c.fs - 1, weight: 700, color: c.t.fg }));
  }
  series.forEach((ser, k) => {
    const color = c.p[k % c.p.length];
    const pts = ser.values.slice(0, n).map((v, i) => `${r1(xOf(i))},${r1(yOf(v))}`);
    if ((s.area ?? series.length === 1) && k === 0) {
      parts.push(`<polygon points="${r1(xOf(0))},${r1(yOf(Math.max(lo, 0)))} ${pts.join(" ")} ${r1(xOf(ser.values.slice(0, n).length - 1))},${r1(yOf(Math.max(lo, 0)))}" style="fill:${color};fill-opacity:0.14"/>`);
    }
    parts.push(`<polyline points="${pts.join(" ")}" style="fill:none;stroke:${color};stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round"/>`);
    ser.values.slice(0, n).forEach((v, i) => {
      if (n <= 13 || i === n - 1) parts.push(`<circle cx="${r1(xOf(i))}" cy="${r1(yOf(v))}" r="${n <= 13 ? 3.5 : 4}" style="fill:${c.t.surface};stroke:${color};stroke-width:2"/>`);
    });
  });
  // End-of-line values, nudged apart so two lines ending close together stay readable.
  const ends = series
    .map((ser, k) => ({ k, v: ser.values[Math.min(n, ser.values.length) - 1] }))
    .filter((e): e is { k: number; v: number } => e.v !== undefined)
    .map((e) => ({ ...e, y: yOf(e.v) - 9 }))
    .sort((a, b) => a.y - b.y);
  if (series.length <= 3) {
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < c.fs + 2) ends[i].y = ends[i - 1].y + c.fs + 2;
    for (const e of ends) {
      const label = fmt(e.v, s.unit);
      const x = Math.min(xOf(Math.min(n, series[e.k].values.length) - 1), c.w - textWidth(label, c.fs - 1) / 2);
      parts.push(txt(c, x, e.y, label, { size: c.fs - 1, anchor: "middle", weight: 700, color: c.p[e.k % c.p.length] }));
    }
  }
  return { svg: parts.join(""), h: y0 + plotH + c.fs + 14 };
}

// ------------------------------------------------------------------ donut

function donut(c: Ctx, s: Extract<ChartSpec, { kind: "donut" }>): { svg: string; h: number } {
  const slices = s.slices.filter((x) => x.value > 0);
  const total = slices.reduce((a, x) => a + x.value, 0);
  if (!total) return { svg: "", h: 0 };
  const narrow = c.w < 440;
  const R = narrow ? Math.min(c.w * 0.3, 100) : 110;
  const cx = narrow ? c.w / 2 : R + 10;
  const cy = R + 10;
  const inner = R * 0.6;
  const parts: string[] = [];
  let a0 = -Math.PI / 2;
  slices.forEach((sl, i) => {
    const frac = sl.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const color = c.p[i % c.p.length];
    if (frac >= 0.9999) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${(R + inner) / 2}" style="fill:none;stroke:${color};stroke-width:${R - inner}"/>`);
    } else {
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, r: number) => `${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`;
      parts.push(`<path d="M${p(a0, R)} A${R},${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, inner)} A${inner},${inner} 0 ${large} 0 ${p(a0, inner)} Z" style="fill:${color};stroke:${c.t.surface};stroke-width:2"/>`);
      if (frac >= 0.07) {
        const mid = (a0 + a1) / 2;
        parts.push(txt(c, cx + ((R + inner) / 2) * Math.cos(mid), cy + ((R + inner) / 2) * Math.sin(mid) + c.fs * 0.35, `${Math.round(frac * 100)}%`, { size: c.fs - 1, anchor: "middle", weight: 700, color: c.t.onAccent }));
      }
    }
    a0 = a1;
  });
  const center = s.center ?? { value: fmt(total, s.unit), label: "합계" };
  parts.push(txt(c, cx, cy + 2, clip(center.value, c.fs + 5, inner * 1.8), { size: c.fs + 5, anchor: "middle", weight: 800 }));
  parts.push(txt(c, cx, cy + c.fs + 8, clip(center.label, c.fs - 1, inner * 1.7), { size: c.fs - 1, anchor: "middle", color: c.t.muted }));

  const lx = narrow ? 0 : cx + R + 34;
  let ly = narrow ? cy + R + 30 : Math.max(c.fs + 4, cy - (slices.length * (c.fs * 2.1)) / 2 + c.fs);
  const lw = c.w - lx;
  slices.forEach((sl, i) => {
    parts.push(rect(lx, ly - c.fs + 1, 11, 11, c.p[i % c.p.length], { rx: 3 }));
    const value = `${fmt(sl.value, s.unit)} · ${Math.round((sl.value / total) * 100)}%`;
    const vw = textWidth(value, c.fs - 1);
    parts.push(txt(c, lx + 18, ly, clip(sl.label, c.fs, lw - vw - 36), {}));
    parts.push(txt(c, c.w, ly, value, { size: c.fs - 1, anchor: "end", color: c.t.muted, weight: 600 }));
    ly += c.fs * 2.1;
  });
  return { svg: parts.join(""), h: Math.max(cy + R + 12, ly - c.fs) };
}

// ------------------------------------------------------------------ radar

function radar(c: Ctx, s: Extract<ChartSpec, { kind: "radar" }>): { svg: string; h: number } {
  const n = s.axes.length;
  if (n < 3 || !s.series.length) return { svg: "", h: 0 };
  const lg = legend(c, s.series.map((x) => x.name), c.fs);
  const labelSpace = c.w < 440 ? 58 : 110;
  const R = Math.min((c.w - labelSpace * 2) / 2, 150);
  const cx = c.w / 2;
  const cy = lg.height + R + c.fs * 2 + 6;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, r: number) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const;
  const parts: string[] = [lg.svg];
  for (const f of [0.25, 0.5, 0.75, 1]) {
    parts.push(`<polygon points="${s.axes.map((_, i) => pt(i, R * f).map(r1).join(",")).join(" ")}" style="fill:none;stroke:${c.t.grid};stroke-width:${f === 1 ? 1.2 : 0.8}"/>`);
  }
  s.axes.forEach((a, i) => {
    const [x, y] = pt(i, R);
    parts.push(line(cx, cy, x, y, c.t.grid, { width: 0.8 }));
    const [lx, ly] = pt(i, R + 12);
    const cos = Math.cos(ang(i));
    const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
    const lines = wrap(a, c.fs - 1, labelSpace - 8, 2);
    const dy = Math.sin(ang(i)) < -0.5 ? -(lines.length - 1) * (c.fs + 1) : Math.sin(ang(i)) > 0.5 ? c.fs * 0.6 : 0;
    lines.forEach((l, j) => parts.push(txt(c, lx, ly + dy + j * (c.fs + 1) + c.fs * 0.3, l, { size: c.fs - 1, anchor, color: c.t.muted })));
  });
  s.series.forEach((ser, k) => {
    const color = c.p[k % c.p.length];
    const pts = s.axes.map((_, i) => pt(i, (Math.max(0, Math.min(s.max, ser.values[i] ?? 0)) / s.max) * R).map(r1).join(","));
    parts.push(`<polygon points="${pts.join(" ")}" style="fill:${color};fill-opacity:${s.series.length > 1 ? 0.12 : 0.22};stroke:${color};stroke-width:2.2;stroke-linejoin:round"/>`);
    pts.forEach((p) => {
      const [x, y] = p.split(",");
      parts.push(`<circle cx="${x}" cy="${y}" r="3" style="fill:${color}"/>`);
    });
  });
  return { svg: parts.join(""), h: cy + R + c.fs * 2 + 8 };
}

// ------------------------------------------------------------------ scatter

function scatter(c: Ctx, s: Extract<ChartSpec, { kind: "scatter" }>): { svg: string; h: number } {
  if (!s.points.length) return { svg: "", h: 0 };
  const left = c.fs * 2 + 4;
  const top = 8;
  const plotW = c.w - left - 8;
  const plotH = Math.min(plotW * 0.72, 330);
  const xOf = (v: number) => left + (Math.max(0, Math.min(s.xMax, v)) / s.xMax) * plotW;
  const yOf = (v: number) => top + plotH - (Math.max(0, Math.min(s.yMax, v)) / s.yMax) * plotH;
  const parts: string[] = [];
  parts.push(rect(left, top, plotW, plotH, c.t.grid, { opacity: 0.18, rx: 8 }));
  parts.push(rect(left + plotW / 2, top, plotW / 2, plotH / 2, c.p[0], { opacity: 0.07 }));
  parts.push(line(left + plotW / 2, top, left + plotW / 2, top + plotH, c.t.grid, { dash: "4 4" }));
  parts.push(line(left, top + plotH / 2, left + plotW, top + plotH / 2, c.t.grid, { dash: "4 4" }));
  if (s.quadrants) {
    const q = s.quadrants;
    const qs = c.fs - 1;
    const qw = plotW / 2 - 16;
    parts.push(txt(c, left + 10, top + qs + 8, clip(q[0], qs, qw), { size: qs, color: c.t.muted, weight: 600 }));
    parts.push(txt(c, left + plotW - 10, top + qs + 8, clip(q[1], qs, qw), { size: qs, color: c.p[0], weight: 700, anchor: "end" }));
    parts.push(txt(c, left + 10, top + plotH - 10, clip(q[2], qs, qw), { size: qs, color: c.t.muted, weight: 600 }));
    parts.push(txt(c, left + plotW - 10, top + plotH - 10, clip(q[3], qs, qw), { size: qs, color: c.t.muted, weight: 600, anchor: "end" }));
  }
  parts.push(txt(c, left + plotW / 2, top + plotH + c.fs + 8, `${s.xLabel} →`, { size: c.fs - 1, anchor: "middle", color: c.t.muted }));
  parts.push(`<text transform="translate(${c.fs},${r1(top + plotH / 2)}) rotate(-90)" style="font-size:${c.fs - 1}px;fill:${c.t.muted};font-family:${c.t.font}" text-anchor="middle">${esc(`${s.yLabel} →`)}</text>`);
  const maxSize = Math.max(1, ...s.points.map((p) => p.size ?? 1));
  const placed: { x: number; y: number; w: number }[] = [];
  const sorted = [...s.points].sort((a, b) => Number(Boolean(a.highlight)) - Number(Boolean(b.highlight)));
  sorted.forEach((p) => {
    const i = s.points.indexOf(p);
    const x = xOf(p.x);
    const y = yOf(p.y);
    const r = p.size !== undefined ? 6 + (Math.sqrt(p.size / maxSize) * (c.w < 440 ? 12 : 18)) : p.highlight ? 9 : 7;
    const color = p.highlight ? c.p[0] : c.p[(i % (c.p.length - 1)) + 1];
    parts.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" style="fill:${color};fill-opacity:${p.highlight ? 0.95 : 0.75};stroke:${c.t.surface};stroke-width:2"/>`);
    const label = clip(p.label, c.fs - 1, c.w * 0.32);
    const lw = textWidth(label, c.fs - 1);
    let lx = x + r + 5;
    if (lx + lw > left + plotW) lx = x - r - 5 - lw;
    let ly = y + c.fs * 0.35;
    for (let k = 0; k < 6 && placed.some((q) => Math.abs(q.y - ly) < c.fs + 1 && lx < q.x + q.w && q.x < lx + lw); k++) ly += c.fs + 2;
    placed.push({ x: lx, y: ly, w: lw });
    parts.push(txt(c, lx, ly, label, { size: c.fs - 1, weight: p.highlight ? 800 : 600, color: p.highlight ? c.p[0] : c.t.fg }));
  });
  return { svg: parts.join(""), h: top + plotH + c.fs * 2 + 8 };
}

// ------------------------------------------------------------------ gantt

function gantt(c: Ctx, s: Extract<ChartSpec, { kind: "gantt" }>): { svg: string; h: number } {
  if (!s.rows.length || !s.scale.length) return { svg: "", h: 0 };
  const labelW = Math.min(c.w * (c.w < 440 ? 0.34 : 0.28), Math.max(...s.rows.map((r) => textWidth(r.label, c.fs))) + 12);
  const plotX = labelW;
  const plotW = c.w - labelW;
  const n = s.scale.length;
  const colW = plotW / n;
  const rowH = c.fs * 2.4;
  const headH = c.fs + 12;
  const groups = [...new Set(s.rows.map((r) => r.group ?? ""))];
  const parts: string[] = [];
  const every = colW < textWidth(s.scale[n - 1], c.fs - 2) + 4 ? 2 : 1;
  s.scale.forEach((label, i) => {
    if (i % every === 0) parts.push(txt(c, plotX + i * colW + colW / 2, c.fs, label, { size: c.fs - 2, anchor: "middle", color: c.t.muted }));
    parts.push(line(plotX + i * colW, headH - 2, plotX + i * colW, headH + s.rows.length * rowH, c.t.grid, { width: 0.6 }));
  });
  s.rows.forEach((r, i) => {
    const y = headH + i * rowH;
    if (i % 2 === 0) parts.push(rect(0, y, c.w, rowH, c.t.grid, { opacity: 0.16 }));
    const lines = wrap(r.label, c.fs - 1, labelW - 12, 2);
    lines.forEach((l, j) => parts.push(txt(c, 4, y + rowH / 2 + (j - (lines.length - 1) / 2) * (c.fs + 1) + c.fs * 0.33, l, { size: c.fs - 1 })));
    const start = Math.max(0, Math.min(n - 1, r.start));
    const end = Math.max(start, Math.min(n - 1, r.end));
    const color = c.p[groups.indexOf(r.group ?? "") % c.p.length];
    const x = plotX + start * colW + 2;
    const w = (end - start + 1) * colW - 4;
    parts.push(rect(x, y + rowH * 0.2, w, rowH * 0.6, color, { rx: 6 }));
    if (r.note) {
      const note = clip(r.note, c.fs - 2, w - 10);
      if (textWidth(note, c.fs - 2) + 10 <= w && !note.endsWith("…")) parts.push(txt(c, x + 6, y + rowH / 2 + c.fs * 0.3, note, { size: c.fs - 2, color: c.t.onAccent, weight: 600 }));
    }
  });
  const needLegend = groups.filter(Boolean).length > 1 && s.rows.some((r) => r.group && r.group !== r.label);
  const lg = needLegend ? legend(c, groups, headH + s.rows.length * rowH + c.fs + 10) : { svg: "", height: 0 };
  parts.push(lg.svg);
  return { svg: parts.join(""), h: headH + s.rows.length * rowH + (lg.height ? lg.height + 12 : 4) };
}

// ------------------------------------------------------------------ heatmap

function heatmap(c: Ctx, s: Extract<ChartSpec, { kind: "heatmap" }>): { svg: string; h: number } {
  if (!s.rows.length || !s.cols.length) return { svg: "", h: 0 };
  const labelW = Math.min(c.w * 0.3, Math.max(...s.rows.map((r) => textWidth(r, c.fs - 1))) + 10);
  const colW = (c.w - labelW) / s.cols.length;
  const headLines = s.cols.map((h) => wrap(h, c.fs - 2, colW - 4, 2));
  const headH = Math.max(...headLines.map((l) => l.length)) * (c.fs - 1) + 10;
  const cellH = Math.max(c.fs * 2.1, Math.min(40, colW * 0.7));
  const parts: string[] = [];
  headLines.forEach((lines, j) => lines.forEach((l, k) => parts.push(txt(c, labelW + j * colW + colW / 2, (k + 1) * (c.fs - 1), l, { size: c.fs - 2, anchor: "middle", color: c.t.muted }))));
  s.rows.forEach((r, i) => {
    const y = headH + i * cellH;
    parts.push(txt(c, labelW - 8, y + cellH / 2 + c.fs * 0.33, clip(r, c.fs - 1, labelW - 10), { size: c.fs - 1, anchor: "end", weight: 600 }));
    s.cols.forEach((_, j) => {
      const v = s.values[i]?.[j] ?? 0;
      const t = Math.max(0, Math.min(1, v / (s.max || 1)));
      parts.push(rect(labelW + j * colW + 1.5, y + 1.5, colW - 3, cellH - 3, c.p[0], { rx: 5, opacity: 0.1 + t * 0.85 }));
      if (colW >= textWidth(fmt(v, s.unit ?? ""), c.fs - 1) + 6) parts.push(txt(c, labelW + j * colW + colW / 2, y + cellH / 2 + c.fs * 0.33, fmt(v, s.unit ?? ""), { size: c.fs - 1, anchor: "middle", weight: 700, color: t > 0.55 ? c.t.onAccent : c.t.fg }));
    });
  });
  return { svg: parts.join(""), h: headH + s.rows.length * cellH + 4 };
}

// ------------------------------------------------------------------ gauge

function gauge(c: Ctx, s: Extract<ChartSpec, { kind: "gauge" }>): { svg: string; h: number } {
  const R = Math.min(c.w / 2 - 20, 130);
  const cx = c.w / 2;
  const cy = R + 16;
  const t = Math.max(0, Math.min(1, s.value / (s.max || 1)));
  const arc = (from: number, to: number) => {
    const a0 = Math.PI + from * Math.PI;
    const a1 = Math.PI + to * Math.PI;
    const p = (a: number) => `${r1(cx + R * Math.cos(a))},${r1(cy + R * Math.sin(a))}`;
    return `M${p(a0)} A${R},${R} 0 ${to - from > 1 ? 1 : 0} 1 ${p(a1)}`;
  };
  const sw = Math.max(14, R * 0.18);
  const [lo, hi] = s.bands ?? [0.4, 0.7];
  const color = t < lo ? "#E5484D" : t < hi ? "#F5A524" : c.p[0];
  const parts = [
    `<path d="${arc(0, 1)}" style="fill:none;stroke:${c.t.grid};stroke-width:${sw};stroke-linecap:round"/>`,
    t > 0 ? `<path d="${arc(0, Math.max(0.01, t))}" style="fill:none;stroke:${color};stroke-width:${sw};stroke-linecap:round"/>` : "",
    txt(c, cx, cy - R * 0.18, `${Math.round(s.value)}`, { size: Math.round(R * 0.42), anchor: "middle", weight: 800, color }),
    txt(c, cx, cy - R * 0.18 + c.fs + 6, `/ ${s.max}`, { size: c.fs, anchor: "middle", color: c.t.muted }),
    txt(c, cx, cy + c.fs + 12, clip(s.label, c.fs, c.w - 20), { anchor: "middle", weight: 600 }),
  ];
  return { svg: parts.join(""), h: cy + c.fs + 20 };
}

// ------------------------------------------------------------------ circles (TAM / SAM / SOM)

function circles(c: Ctx, s: Extract<ChartSpec, { kind: "circles" }>): { svg: string; h: number } {
  const items = s.items.slice(0, 4);
  if (!items.length) return { svg: "", h: 0 };
  const narrow = c.w < 440;
  const R = narrow ? Math.min(c.w / 2 - 8, 150) : 150;
  const cx = narrow ? c.w / 2 : R + 8;
  const bottom = R * 2 + 8;
  const parts: string[] = [];
  items.forEach((it, i) => {
    const rr = items.length === 1 ? R : R * [1, 0.66, 0.36, 0.2][i];
    parts.push(`<circle cx="${cx}" cy="${r1(bottom - rr)}" r="${r1(rr)}" style="fill:${c.p[0]};fill-opacity:${0.14 + i * 0.22};stroke:${c.p[0]};stroke-width:1.5"/>`);
    const labelY = i === items.length - 1 ? bottom - rr + c.fs * 0.2 : bottom - rr * 2 + c.fs + 10;
    parts.push(txt(c, cx, labelY, it.label, { size: c.fs - 1, anchor: "middle", weight: 700, color: i >= 2 ? c.t.onAccent : c.t.fg }));
    parts.push(txt(c, cx, labelY + c.fs + 4, clip(it.value, c.fs + 1, rr * 1.6), { size: c.fs + 1, anchor: "middle", weight: 800, color: i >= 2 ? c.t.onAccent : c.p[0] }));
  });
  if (narrow) {
    let y = bottom + c.fs + 18;
    items.forEach((it, i) => {
      if (!it.note) return;
      const lines = wrap(`${it.label} · ${it.note}`, c.fs - 1, c.w - 16, 3);
      parts.push(rect(0, y - c.fs + 1, 8, 8, c.p[0], { rx: 2, opacity: 0.3 + i * 0.25 }));
      lines.forEach((l, j) => parts.push(txt(c, 14, y + j * (c.fs + 3), l, { size: c.fs - 1, color: c.t.muted })));
      y += lines.length * (c.fs + 3) + 8;
    });
    return { svg: parts.join(""), h: y };
  }
  let y = 30;
  const x = cx + R + 30;
  items.forEach((it, i) => {
    parts.push(rect(x, y - c.fs, 12, 12, c.p[0], { rx: 3, opacity: 0.3 + i * 0.22 }));
    parts.push(txt(c, x + 20, y, `${it.label}  ${it.value}`, { weight: 700 }));
    const lines = it.note ? wrap(it.note, c.fs - 1, c.w - x - 20, 3) : [];
    lines.forEach((l, j) => parts.push(txt(c, x + 20, y + (j + 1) * (c.fs + 4), l, { size: c.fs - 1, color: c.t.muted })));
    y += (lines.length + 1) * (c.fs + 4) + 16;
  });
  return { svg: parts.join(""), h: Math.max(bottom + 4, y) };
}

// ------------------------------------------------------------------ funnel

function funnel(c: Ctx, s: Extract<ChartSpec, { kind: "funnel" }>): { svg: string; h: number } {
  if (!s.stages.length) return { svg: "", h: 0 };
  const max = Math.max(...s.stages.map((x) => x.value), 1);
  const rowH = c.fs * 2.8;
  const parts: string[] = [];
  s.stages.forEach((st, i) => {
    const w = Math.max(c.w * 0.58, (st.value / max) * c.w);
    const x = (c.w - w) / 2;
    const y = i * (rowH + 4);
    parts.push(rect(x, y, w, rowH, c.p[0], { rx: 8, opacity: 1 - i * (0.55 / s.stages.length) }));
    const label = `${st.label} · ${st.display ?? fmt(st.value)}`;
    parts.push(txt(c, c.w / 2, y + rowH / 2 + c.fs * 0.35, clip(label, c.fs, w - 12), { anchor: "middle", weight: 700, color: c.t.onAccent }));
  });
  return { svg: parts.join(""), h: s.stages.length * (rowH + 4) };
}

// ------------------------------------------------------------------ entry

const RENDER: { [K in ChartSpec["kind"]]: (c: Ctx, s: Extract<ChartSpec, { kind: K }>) => { svg: string; h: number } } = {
  bar,
  line: lineChart,
  donut,
  radar,
  scatter,
  gantt,
  heatmap,
  gauge,
  circles,
  funnel,
};

const list = (xs: string[]) => (xs.length > 6 ? `${xs.slice(0, 6).join(", ")} 외 ${xs.length - 6}개` : xs.join(", "));

/** A short text alternative for a chart: its kind and what it compares. */
function describeChart(spec: ChartSpec): string {
  switch (spec.kind) {
    case "bar":
      return `막대 그래프: ${list(spec.categories)}${spec.series.length > 1 ? ` (${spec.series.map((x) => x.name).join(", ")})` : ""}`;
    case "line":
      return `선 그래프: ${list(spec.series.map((x) => x.name))} · ${spec.categories[0] ?? ""}–${spec.categories.at(-1) ?? ""}`;
    case "donut":
      return `비율 그래프: ${list(spec.slices.map((x) => `${x.label} ${x.value}${spec.unit ?? ""}`))}`;
    case "radar":
      return `레이더 차트: ${list(spec.axes)}`;
    case "scatter":
      return `포지셔닝 맵 (${spec.xLabel} × ${spec.yLabel}): ${list(spec.points.map((x) => x.label))}`;
    case "gantt":
      return `일정표: ${list(spec.rows.map((x) => x.label))}`;
    case "heatmap":
      return `히트맵: ${list(spec.rows)} × ${list(spec.cols)}`;
    case "gauge":
      return `게이지: ${spec.label} ${spec.value}/${spec.max}`;
    case "circles":
      return `지표: ${list(spec.items.map((x) => `${x.label} ${x.value}`))}`;
    case "funnel":
      return `퍼널: ${list(spec.stages.map((x) => `${x.label} ${x.display ?? x.value}`))}`;
  }
}

/** The chart as a standalone SVG string, laid out for `width` px. Empty string when there's nothing to draw. */
export function renderChart(spec: ChartSpec, opts: { width: number; palette: string[]; theme: ChartTheme; fontSize?: number; background?: string; title?: string }): string {
  const c: Ctx = { w: opts.width, t: opts.theme, p: opts.palette.length ? opts.palette : ["#4D7CFE"], fs: opts.fontSize ?? (opts.width < 440 ? 12 : 13) };
  const draw = RENDER[spec.kind] as (c: Ctx, s: ChartSpec) => { svg: string; h: number };
  const { svg, h } = draw(c, spec);
  if (!svg) return "";
  const height = Math.ceil(h + 6);
  const bg = opts.background ? `<rect x="-4" y="-4" width="${opts.width + 8}" height="${height + 4}" style="fill:${opts.background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${opts.width + 8} ${height + 4}" width="${opts.width + 8}" height="${height + 4}" role="img"><title>${esc(opts.title || describeChart(spec))}</title>${bg}${svg}</svg>`;
}
