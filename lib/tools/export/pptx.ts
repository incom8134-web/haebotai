import "server-only";
import PptxGenJS from "pptxgenjs";
import type { Source } from "../registry/shared.ts";
import { asCompactPair, formatPrimitive, humanize, isSourceArray, titleKeyOf } from "../output-labels.ts";
import { imageUrl, plainMarkdownLines, SKIP_KEYS, type ExportDoc } from "./document.ts";
import { fetchAll, fit, imageSize, type FetchedImage } from "./images.ts";
import { chartPng } from "./chart-png.ts";
import type { Report, ReportBlock } from "../report/types.ts";
import { deckChartSpec, deckPalette, type DeckChart } from "../report/deck.ts";

// PowerPoint export laid out from the run's structured output rather
// than from flat text: lists of like items become tables with a colored
// header row and striped rows, richer items become colored cards, phased
// plans become timelines, score sets become charts, short lists become
// tiles or chips, and one-line key messages get a statement slide. Each
// top-level section takes the next palette color. Text sizes come from a
// width estimate (Hangul ≈ 1em, Latin ≈ 0.55em) so nothing overflows its
// box, and long tables or lists continue on "(계속)" slides.

const FONT = "Malgun Gothic";
const W = 13.333;
const H = 7.5;
const M = 0.6;
const CW = W - M * 2; // content width
const TOP = 1.7;
const CHIP = 0.7; // pill height
const BOTTOM = H - 0.6;

const INK = "16181A";
const BODY = "3A4046";
const MUTED = "8A9199";
const LINE = "E3E6EA";
const DARK = "0E1116";

const PALETTE = [
  { c: "4D7CFE", soft: "EDF2FF" },
  { c: "0FA89B", soft: "E3F6F4" },
  { c: "F08A3C", soft: "FEF0E4" },
  { c: "DE4F7A", soft: "FCE8EE" },
  { c: "7C5CF0", soft: "F0EBFE" },
  { c: "2E9C5A", soft: "E5F4EB" },
] as const;
type Color = (typeof PALETTE)[number];
const colorAt = (i: number): Color => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];

/** Blend a hex color toward another (t = 0 keeps a, 1 gives b). */
function mix(a: string, b: string, t: number): string {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [0, 2, 4].map((i) => parseInt(b.slice(i, i + 2), 16));
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** A deck palette from one brand accent: the accent, a deeper shade and a lifted tint. */
function accentPalette(hex: string): Color[] {
  const c = hex.replace("#", "").toUpperCase();
  return [c, mix(c, "0E1116", 0.35), mix(c, "7A828A", 0.35)].map((x) => ({ c: x, soft: mix(x, "FFFFFF", 0.9) })) as unknown as Color[];
}

const dataUri = (img: FetchedImage) => `data:image/${img.type === "png" ? "png" : "jpeg"};base64,${img.data.toString("base64")}`;
const pad2 = (n: number) => String(n).padStart(2, "0");

// ---------------------------------------------------------------- text fit

function textWidth(text: string, pt: number): number {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    em += code >= 0x2e80 || (code >= 0x1100 && code <= 0x11ff) ? 0.97 : ch === " " ? 0.3 : /[A-Z0-9%@#]/.test(ch) ? 0.64 : 0.54;
  }
  return (em * pt) / 72;
}

function lineCount(text: string, pt: number, width: number): number {
  const usable = Math.max(0.3, width);
  // Word wrap breaks a little before the edge.
  return text.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil((textWidth(p, pt) * 1.08) / usable)), 0);
}

const textHeight = (text: string, pt: number, width: number, spacing = 1.32) => (lineCount(text, pt, width) * pt * spacing) / 72;

function fitFont(text: string, width: number, height: number, max: number, min: number): number {
  for (let pt = max; pt > min; pt--) if (textHeight(text, pt, width) <= height) return pt;
  return min;
}

/** Split text into pieces that each fit `height` at `pt`, breaking at sentences. */
function splitToFit(text: string, pt: number, width: number, height: number): string[] {
  if (textHeight(text, pt, width) <= height) return [text];
  const sentences = text.match(/[^.!?。\n]+[.!?。]?\s*|\n/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && textHeight(cur + s, pt, width) > height) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------------------------------------------------------------- values

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isScalar = (v: unknown): v is string | number | boolean => typeof v === "string" || typeof v === "number" || typeof v === "boolean";
const isEmpty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const HEX = /^#?[0-9a-f]{6}$/i;

function scalarText(key: string, v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return formatPrimitive(key, v);
  return "";
}

/** Fields of an item worth showing, with sources pulled out for the sources slide. */
function fieldsOf(obj: Obj, sources: Source[]): [string, unknown][] {
  return Object.entries(obj).filter(([k, v]) => {
    if (isSourceArray(v)) {
      sources.push(...v);
      return false;
    }
    return !SKIP_KEYS.has(k) && !isEmpty(v);
  });
}

const isNumericObj = (v: unknown): v is Record<string, number> =>
  isObj(v) && Object.keys(v).length >= 3 && Object.values(v).every((x) => typeof x === "number");

/** One table cell's text, or null when the value is too structured for a cell. */
function cellText(key: string, v: unknown): string | null {
  if (isEmpty(v)) return "";
  if (isScalar(v)) return scalarText(key, v);
  if (Array.isArray(v) && v.every(isScalar)) return v.map((x) => scalarText(key, x)).join(" · ");
  if (isObj(v) && Object.values(v).every(isScalar)) {
    return Object.entries(v)
      .filter(([k]) => !SKIP_KEYS.has(k))
      .map(([k, x]) => `${humanize(k)} ${scalarText(k, x)}`)
      .join(" · ");
  }
  if (Array.isArray(v) && v.every((x) => isObj(x) && asCompactPair(x))) {
    return v.map((x) => asCompactPair(x as Obj)!.text).join(" · ");
  }
  return null;
}

type CardLine = { label?: string; text: string; bullet?: boolean };

function cardLines(obj: Obj, skip: Set<string>, sources: Source[]): CardLine[] {
  const lines: CardLine[] = [];
  for (const [k, v] of fieldsOf(obj, sources)) {
    if (skip.has(k) || imageUrl(v)) continue;
    const label = humanize(k);
    if (isScalar(v)) lines.push({ label, text: scalarText(k, v) });
    else if (Array.isArray(v) && v.every(isScalar)) {
      lines.push({ label, text: "" });
      v.forEach((x) => lines.push({ text: scalarText(k, x), bullet: true }));
    } else if (Array.isArray(v)) {
      lines.push({ label, text: "" });
      for (const x of v) {
        if (!isObj(x)) continue;
        const pair = asCompactPair(x);
        if (pair) {
          lines.push({ text: `${pair.label} ${pair.text}`, bullet: true });
          continue;
        }
        const tk = titleKeyOf(x);
        const rest = fieldsOf(x, sources).filter(([kk, vv]) => kk !== tk && isScalar(vv));
        const head = tk ? String(x[tk]) : rest.shift()?.[1];
        const tail = rest.map(([kk, vv]) => scalarText(kk, vv)).join(" — ");
        lines.push({ text: [head, tail].filter(Boolean).join(" — "), bullet: true });
      }
    } else if (isObj(v)) {
      const pairs = fieldsOf(v, sources).filter(([, x]) => isScalar(x) || (Array.isArray(x) && x.every(isScalar)));
      const allHex = pairs.length === 1 && Array.isArray(pairs[0][1]) && (pairs[0][1] as unknown[]).every((x) => typeof x === "string" && HEX.test(x));
      lines.push({ label, text: allHex ? (pairs[0][1] as string[]).join("  ") : pairs.map(([kk, x]) => `${humanize(kk)} ${cellText(kk, x)}`).join(" · ") });
    }
  }
  return lines.filter((l) => l.text || l.label);
}

const cardTextLength = (lines: CardLine[]) => lines.map((l) => (l.label ? `${l.label}\n` : "") + l.text).join("\n");

// ---------------------------------------------------------------- deck

type Slide = ReturnType<PptxGenJS["addSlide"]>;
type TextOpts = NonNullable<Parameters<Slide["addText"]>[1]>;
type Run = { text: string; options?: TextOpts };

class Deck {
  readonly pptx = new PptxGenJS();
  private page = 0;
  readonly name: string;
  /** Speaker notes for the next slide created (for helpers that build their own slide). */
  nextNotes?: string;

  constructor(name: string) {
    this.name = name;
    this.pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
    this.pptx.title = name;
    this.pptx.company = "해봇 AI";
  }

  text(slide: Slide, text: string | Run[], opts: TextOpts) {
    slide.addText(text, { fontFace: FONT, margin: 0, valign: "top", ...opts });
  }

  rect(slide: Slide, x: number, y: number, w: number, h: number, fill: string, radius = 0, extra: object = {}) {
    slide.addShape(radius ? this.pptx.ShapeType.roundRect : this.pptx.ShapeType.rect, {
      x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, ...(radius ? { rectRadius: radius } : {}), ...extra,
    });
  }

  circle(slide: Slide, x: number, y: number, d: number, fill: string, label?: string, pt = 12) {
    slide.addShape(this.pptx.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
    if (label) this.text(slide, label, { x, y, w: d, h: d, fontSize: pt, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  }

  /** Blank slide with the side strip, section kicker and footer. */
  base(kicker: string, color: Color, background = "FFFFFF"): Slide {
    const s = this.pptx.addSlide();
    s.background = { color: background };
    this.page++;
    this.takeNotes(s);
    this.rect(s, 0, 0, 0.16, H, color.c);
    if (kicker) this.text(s, kicker, { x: M, y: 0.42, w: CW, h: 0.3, fontSize: 11, bold: true, color: color.c, charSpacing: 1 });
    s.addShape(this.pptx.ShapeType.line, { x: M, y: H - 0.45, w: CW, h: 0, line: { color: LINE, width: 0.75 } });
    this.text(s, `해봇 AI · ${this.name}`, { x: M, y: H - 0.38, w: 9, h: 0.24, fontSize: 9, color: MUTED });
    this.text(s, String(this.page), { x: W - M - 1, y: H - 0.38, w: 1, h: 0.24, fontSize: 9, color: MUTED, align: "right" });
    return s;
  }

  private takeNotes(s: Slide) {
    if (this.nextNotes) s.addNotes(this.nextNotes);
    this.nextNotes = undefined;
  }

  content(kicker: string, title: string, color: Color, notes?: string): Slide {
    const s = this.base(kicker, color);
    const pt = fitFont(title, CW, 0.85, 26, 17);
    this.text(s, title, { x: M, y: 0.74, w: CW, h: 0.85, fontSize: pt, bold: true, color: INK });
    if (notes) s.addNotes(notes);
    return s;
  }

  /** Full-bleed photo, cropped to cover the box. */
  photo(slide: Slide, img: FetchedImage, x: number, y: number, w: number, h: number) {
    const size = imageSize(img);
    const scale = Math.max(w / size.width, h / size.height);
    slide.addImage({ data: dataUri(img), x, y, w: size.width * scale, h: size.height * scale, sizing: { type: "cover", w, h } });
  }

  /** Dark photo slide: the picture, a scrim for legible white type, and the accent bar. */
  photoCover(img: FetchedImage, accent: Color, title: string, subtitle: string, kicker: string, centered = false) {
    const s = this.pptx.addSlide();
    s.background = { color: DARK };
    this.page++;
    this.takeNotes(s);
    this.photo(s, img, 0, 0, W, H);
    this.rect(s, 0, 0, W, H, DARK, 0, { fill: { color: DARK, transparency: 45 } });
    if (!centered) this.rect(s, 0, 0, W * 0.62, H, DARK, 0, { fill: { color: DARK, transparency: 30 } });
    this.rect(s, 0, H - 0.14, W, 0.14, accent.c);
    const tw = centered ? CW : 7.6;
    const tx = centered ? M : M + 0.2;
    if (kicker) this.text(s, kicker, { x: tx, y: centered ? 2.1 : 1.55, w: tw, h: 0.4, fontSize: 14, bold: true, color: mix(accent.c, "FFFFFF", 0.55), charSpacing: 2, align: centered ? "center" : "left" });
    if (!centered) this.rect(s, tx, 2.05, 0.9, 0.09, accent.c);
    this.text(s, title, { x: tx, y: centered ? 2.6 : 2.4, w: tw, h: 2.2, fontSize: fitFont(title, tw, 2.2, centered ? 40 : 44, 24), bold: true, color: "FFFFFF", align: centered ? "center" : "left", valign: centered ? "middle" : "top" });
    this.text(s, subtitle, { x: tx, y: centered ? 4.9 : 4.75, w: tw, h: 0.5, fontSize: 16, color: "D5D9DD", align: centered ? "center" : "left" });
  }

  cover(title: string, subtitle: string, kicker = "해봇 AI") {
    const s = this.pptx.addSlide();
    s.background = { color: DARK };
    this.page++;
    s.addShape(this.pptx.ShapeType.ellipse, { x: 8.4, y: -1.8, w: 7.2, h: 7.2, fill: { color: PALETTE[0].c, transparency: 72 }, line: { type: "none" } });
    s.addShape(this.pptx.ShapeType.ellipse, { x: 10.6, y: 3.6, w: 4.4, h: 4.4, fill: { color: PALETTE[1].c, transparency: 65 }, line: { type: "none" } });
    s.addShape(this.pptx.ShapeType.ellipse, { x: 7.7, y: 4.9, w: 1.6, h: 1.6, fill: { color: PALETTE[2].c, transparency: 40 }, line: { type: "none" } });
    PALETTE.forEach((p, i) => this.rect(s, (W / PALETTE.length) * i, H - 0.14, W / PALETTE.length + 0.01, 0.14, p.c));
    this.rect(s, M + 0.2, 2.05, 0.9, 0.09, PALETTE[0].c);
    this.text(s, kicker, { x: M + 0.2, y: 1.55, w: 8, h: 0.4, fontSize: 14, bold: true, color: "8FB0FF", charSpacing: 2 });
    const pt = fitFont(title, 8.2, 2.2, 44, 26);
    this.text(s, title, { x: M + 0.2, y: 2.4, w: 8.2, h: 2.2, fontSize: pt, bold: true, color: "FFFFFF", valign: "top" });
    this.text(s, subtitle, { x: M + 0.2, y: 4.75, w: 8.2, h: 0.5, fontSize: 16, color: "AEB4BB" });
  }

  closing(title: string, line: string) {
    const s = this.pptx.addSlide();
    s.background = { color: DARK };
    this.page++;
    PALETTE.forEach((p, i) => this.rect(s, (W / PALETTE.length) * i, H - 0.14, W / PALETTE.length + 0.01, 0.14, p.c));
    this.text(s, title, { x: M, y: 2.6, w: CW, h: 1.2, fontSize: fitFont(title, CW, 1.2, 40, 24), bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    this.text(s, line, { x: M, y: 3.9, w: CW, h: 0.6, fontSize: 16, color: "AEB4BB", align: "center" });
  }

  agenda(items: string[]) {
    const s = this.content("CONTENTS", "목차", PALETTE[0]);
    const cols = items.length > 5 ? 2 : 1;
    const perCol = Math.ceil(items.length / cols);
    const rowH = Math.min(0.85, (BOTTOM - TOP) / perCol);
    const colW = (CW - (cols - 1) * 0.5) / cols;
    items.forEach((label, i) => {
      const col = Math.floor(i / perCol);
      const x = M + col * (colW + 0.5);
      const y = TOP + (i % perCol) * rowH;
      const c = colorAt(i);
      this.rect(s, x, y + 0.08, colW, rowH - 0.16, c.soft, 0.08);
      this.rect(s, x, y + 0.08, 0.75, rowH - 0.16, c.c, 0.08);
      this.text(s, pad2(i + 1), { x, y: y + 0.08, w: 0.75, h: rowH - 0.16, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
      this.text(s, label, { x: x + 0.95, y: y + 0.08, w: colW - 1.1, h: rowH - 0.16, fontSize: fitFont(label, colW - 1.1, rowH - 0.2, 17, 11), bold: true, color: INK, valign: "middle" });
    });
  }

  /** A single key sentence, large, on the section's soft color. */
  statement(kicker: string, label: string, text: string, color: Color) {
    const s = this.base(kicker, color, color.soft);
    this.text(s, "“", { x: M - 0.05, y: 0.95, w: 1.2, h: 1.3, fontSize: 96, bold: true, color: color.c, fontFace: "Georgia" });
    this.text(s, label, { x: M + 1.1, y: 1.35, w: CW - 1.1, h: 0.45, fontSize: 16, bold: true, color: color.c });
    const w = CW - 1.1;
    const pt = fitFont(text, w, 3.6, text.length <= 40 ? 48 : 34, 16);
    this.text(s, text, { x: M + 1.1, y: 2.0, w, h: 3.8, fontSize: pt, bold: true, color: INK, valign: "middle", lineSpacingMultiple: 1.15 });
    this.rect(s, M + 1.1, 6.05, 1.4, 0.08, color.c);
  }

  /** Running text in a soft card with a colored rule. */
  prose(kicker: string, title: string, paragraphs: { text: string; bullet?: boolean; head?: boolean }[], color: Color) {
    const w = CW - 0.7;
    const avail = BOTTOM - TOP - 0.5;
    const total = paragraphs.reduce((h, p) => h + textHeight(p.text, 18, w) + 0.12, 0);
    const pt = total <= avail ? 18 : 15;
    const pages: (typeof paragraphs)[] = [];
    let cur: typeof paragraphs = [];
    let used = 0;
    for (const p of paragraphs) {
      for (const piece of splitToFit(p.text, pt, w, avail)) {
        const h = textHeight(piece, pt, p.bullet ? w - 0.3 : w) + 0.12;
        if (cur.length && used + h > avail) {
          pages.push(cur);
          cur = [];
          used = 0;
        }
        cur.push({ ...p, text: piece });
        used += h;
      }
    }
    if (cur.length) pages.push(cur);
    pages.forEach((page, i) => {
      const s = this.content(kicker, i ? `${title} (계속)` : title, color);
      const used = page.reduce((h, p) => h + textHeight(p.text, pt, p.bullet ? w - 0.3 : w, 1.32) + 0.14, 0);
      const boxH = Math.min(BOTTOM - TOP - 0.1, Math.max(2.2, used + 0.7));
      this.rect(s, M, TOP, CW, boxH, color.soft, 0.1);
      this.rect(s, M, TOP, 0.09, boxH, color.c);
      const runs: Run[] = page.map((p) => ({
        text: p.text,
        options: {
          breakLine: true,
          bold: p.head,
          color: p.head ? color.c : BODY,
          bullet: p.bullet ? { indent: 16 } : false,
          paraSpaceAfter: 8,
        },
      }));
      this.text(s, runs, { x: M + 0.4, y: TOP + 0.25, w, h: BOTTOM - TOP - 0.55, fontSize: pt, lineSpacingMultiple: 1.2 });
    });
  }

  /** Header row in the section color, striped body rows, paginated. Few rows get larger type and taller rows. */
  table(kicker: string, title: string, header: string[] | null, rows: string[][], color: Color, opts: { labelCol?: boolean; groupCol?: boolean } = {}) {
    const cols = Math.max(header?.length ?? 0, ...rows.map((r) => r.length));
    if (!cols || !rows.length) return;
    const layout = (pt: number) => {
      // Column widths follow content length, within sane bounds.
      const weights = Array.from({ length: cols }, (_, c) => {
        const lens = rows.map((r) => textWidth(r[c] ?? "", pt));
        const avg = lens.reduce((a, b) => a + b, 0) / rows.length;
        const head = header ? textWidth(header[c] ?? "", pt) : 0;
        return Math.min(6, Math.max(0.9, head + 0.3, avg * 0.8 + Math.max(...lens) * 0.2));
      });
      const total = weights.reduce((a, b) => a + b, 0);
      const colW = weights.map((w) => (w / total) * CW);
      const pad = pt >= 14 ? 0.3 : 0.2;
      const rowH = (r: string[]) => Math.max(0.42, ...r.map((cell, c) => textHeight(cell, pt, colW[c] - 0.26, 1.25) + pad));
      const headH = header ? Math.max(0.5, ...header.map((cell, c) => textHeight(cell, pt, colW[c] - 0.26, 1.25) + 0.2)) : 0;
      return { colW, rowH, headH, heights: rows.map(rowH) };
    };
    const avail = (headH: number) => BOTTOM - TOP - headH - 0.1;
    let pt = cols <= 3 ? 13 : cols <= 5 ? 12 : 11;
    for (let size = 17; size > pt; size--) {
      const l = layout(size);
      if (l.heights.reduce((a, b) => a + b, 0) <= avail(l.headH) * 0.8) {
        pt = size;
        break;
      }
    }
    const { colW, headH, heights } = layout(pt);

    const pages: number[][] = [];
    let cur: number[] = [];
    let used = 0;
    rows.forEach((_, i) => {
      if (cur.length && used + heights[i] > avail(headH)) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
      cur.push(i);
      used += heights[i];
    });
    if (cur.length) pages.push(cur);

    const numeric = Array.from({ length: cols }, (_, c) => rows.every((r) => /^[-+]?[\d,.]+\s*(원|%|개월|주|일차|점)?$/.test(r[c] ?? "") || !r[c]));
    const none = { type: "none" as const };
    pages.forEach((page, p) => {
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      // A short single page stretches its rows (up to 1.8x) to use the slide.
      const natural = page.reduce((h, i) => h + heights[i], 0);
      const stretch = pages.length === 1 ? Math.min(1.8, Math.max(1, (avail(headH) * 0.92) / natural)) : 1;
      let group = -1;
      const body = page.map((ri, i) => {
        const r = rows[ri];
        if (opts.groupCol && r[0]) group++;
        const gc = colorAt(group);
        return Array.from({ length: cols }, (_, c) => ({
          text: r[c] ?? "",
          options: {
            fill: { color: opts.groupCol && c === 0 ? gc.soft : opts.labelCol && c === 0 ? color.soft : i % 2 ? "F6F7F9" : "FFFFFF" },
            bold: c === 0 || (opts.groupCol && c === 1),
            color: opts.groupCol && c === 0 ? gc.c : c === 0 ? (opts.labelCol ? color.c : INK) : BODY,
            align: numeric[c] ? ("right" as const) : ("left" as const),
            border: [none, none, { type: "solid" as const, pt: 0.75, color: LINE }, none],
          },
        }));
      });
      const head = header
        ? [header.map((h, c) => ({ text: h, options: { fill: { color: color.c }, color: "FFFFFF", bold: true, align: numeric[c] ? ("right" as const) : ("left" as const), border: [none, none, none, none] } }))]
        : [];
      s.addTable([...head, ...body] as Parameters<Slide["addTable"]>[0], {
        x: M, y: TOP, w: CW, colW, rowH: [...(header ? [headH] : []), ...page.map((i) => heights[i] * stretch)],
        fontFace: FONT, fontSize: pt, valign: "middle", margin: [0.08, 0.13, 0.08, 0.13],
      });
    });
  }

  /** Colored cards, 1–4 per slide depending on how much each holds. */
  cards(kicker: string, title: string, cards: { title: string; badge?: string; lines: CardLine[] }[], color: Color, startColor: number) {
    if (!cards.length) return;
    const gap = 0.3;
    const bandPt = 17;
    const bodyAvail = (n: number, band: number) => BOTTOM - TOP - band - 0.35;
    const need = (c: (typeof cards)[number], w: number, pt: number) =>
      c.lines.reduce((h, l) => h + (l.label ? (pt * 1.3) / 72 : 0) + (l.text ? textHeight(l.text, pt, l.bullet ? w - 0.25 : w, 1.28) : 0) + 0.06, 0);
    const bandOf = (c: (typeof cards)[number], w: number) => Math.max(0.75, textHeight(c.title, bandPt, w - (c.badge ? 0.9 : 0), 1.2) + 0.35);

    let per = 1;
    for (const n of cards.length % 4 === 0 ? [4, 3, 2] : [3, 2]) {
      if (n > cards.length) continue;
      const w = (CW - gap * (n - 1)) / n;
      if (cards.every((c) => need(c, w - 0.4, 11) <= bodyAvail(n, bandOf(c, w)))) {
        per = n;
        break;
      }
    }
    const pages = Math.ceil(cards.length / per);
    per = Math.ceil(cards.length / pages); // balance: 4 cards at 3/slide → 2 + 2
    const w = (CW - gap * (per - 1)) / per;

    for (let p = 0; p < pages; p++) {
      const group = cards.slice(p * per, p * per + per);
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      const band = Math.max(...group.map((c) => bandOf(c, w)));
      const avail = bodyAvail(per, band);
      const pt = Math.min(...group.map((c) => {
        for (let size = per === 1 ? 20 : per === 2 ? 18 : 16; size > 9; size--) if (need(c, w - 0.4, size) <= avail) return size;
        return 9;
      }));
      // Cards end below their longest content rather than at the slide bottom.
      const h = Math.min(BOTTOM - TOP - 0.1, Math.max(3.4, band + Math.max(...group.map((c) => need(c, w - 0.4, pt))) + 0.7));
      group.forEach((c, i) => {
        const x = M + i * (w + gap);
        const col = colorAt(startColor + p * per + i);
        this.rect(s, x, TOP, w, h, col.soft, 0.12);
        this.rect(s, x, TOP, w, band, col.c, 0.12);
        this.rect(s, x, TOP + band - 0.14, w, 0.14, col.c);
        if (c.badge) this.text(s, c.badge, { x: x + 0.2, y: TOP, w: 0.8, h: band, fontSize: 20, bold: true, color: "FFFFFF", valign: "middle", transparency: 20 });
        this.text(s, c.title, { x: x + (c.badge ? 1.0 : 0.25), y: TOP, w: w - (c.badge ? 1.2 : 0.45), h: band, fontSize: bandPt, bold: true, color: "FFFFFF", valign: "middle" });
        const runs: Run[] = [];
        for (const l of c.lines) {
          if (l.label) runs.push({ text: l.label, options: { bold: true, color: col.c, fontSize: pt - 2, breakLine: true, paraSpaceBefore: runs.length ? 8 : 0 } });
          if (l.text) runs.push({ text: l.text, options: { color: BODY, fontSize: pt, breakLine: true, bullet: l.bullet ? { indent: 12 } : false } });
        }
        this.text(s, runs, { x: x + 0.2, y: TOP + band + 0.18, w: w - 0.4, h: h - band - 0.3, fontSize: pt, lineSpacingMultiple: 1.12 });
      });
    }
  }

  /** Short items as numbered tiles in a grid. */
  tiles(kicker: string, title: string, items: string[], color: Color) {
    for (let p = 0; p * 6 < items.length; p++) {
      const group = items.slice(p * 6, p * 6 + 6);
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      const cols = group.length <= 3 ? group.length : group.length === 4 ? 2 : 3;
      const rows = Math.ceil(group.length / cols);
      const gap = 0.3;
      const w = (CW - gap * (cols - 1)) / cols;
      const fullH = (BOTTOM - TOP - gap * (rows - 1) - 0.1) / rows;
      const h = Math.min(fullH, Math.max(2.3, ...group.map((it) => textHeight(it, rows === 1 ? 22 : 18, w - 0.7, 1.2) + 1.5)));
      group.forEach((item, i) => {
        const x = M + (i % cols) * (w + gap);
        const y = TOP + Math.floor(i / cols) * (h + gap);
        const col = colorAt(p * 6 + i);
        this.rect(s, x, y, w, h, col.soft, 0.12);
        this.rect(s, x, y, 0.1, h, col.c);
        this.text(s, pad2(p * 6 + i + 1), { x: x + 0.35, y: y + 0.25, w: 1.2, h: 0.6, fontSize: 28, bold: true, color: col.c });
        const tw = w - 0.7;
        const th = h - 1.1;
        this.text(s, item, { x: x + 0.35, y: y + 0.95, w: tw, h: th, fontSize: fitFont(item, tw, th, rows === 1 ? 22 : 18, 11), bold: true, color: INK, lineSpacingMultiple: 1.1 });
      });
    }
  }

  /** Longer items as a numbered list with colored markers. */
  numbered(kicker: string, title: string, items: { mark: string; text: string }[], color: Color) {
    const pt = items.length <= 5 ? 18 : 15;
    const markW = Math.max(0.5, ...items.map((i) => textWidth(i.mark, 12) + 0.3));
    const tw = CW - markW - 0.3;
    const rowH = (t: string) => Math.max(0.55, textHeight(t, pt, tw, 1.25) + 0.25);
    const pages: (typeof items)[] = [];
    let cur: typeof items = [];
    let used = 0;
    for (const it of items) {
      const h = rowH(it.text);
      if (cur.length && used + h > BOTTOM - TOP) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
      cur.push(it);
      used += h;
    }
    if (cur.length) pages.push(cur);
    let n = 0;
    pages.forEach((page, p) => {
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      let y = TOP;
      for (const it of page) {
        const h = rowH(it.text);
        const col = colorAt(n++);
        if (markW <= 0.6) this.circle(s, M, y + 0.06, 0.44, col.c, it.mark, 12);
        else {
          this.rect(s, M, y + 0.06, markW, 0.4, col.c, 0.2);
          this.text(s, it.mark, { x: M, y: y + 0.06, w: markW, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
        }
        this.text(s, it.text, { x: M + markW + 0.3, y: y + 0.08, w: tw, h: h - 0.1, fontSize: pt, color: BODY, lineSpacingMultiple: 1.1 });
        if (it !== page[page.length - 1]) s.addShape(this.pptx.ShapeType.line, { x: M + markW + 0.3, y: y + h - 0.08, w: tw, h: 0, line: { color: LINE, width: 0.75 } });
        y += h;
      }
    });
  }

  /** Very short items (keywords, hashtags, color codes) as pills. */
  chips(kicker: string, title: string, items: string[], color: Color) {
    const pt = items.length <= 12 ? 20 : 16;
    const hexes = items.every((i) => HEX.test(i));
    const placed: { page: number; x: number; y: number; w: number; text: string }[] = [];
    let page = 0;
    let x = M;
    let y = TOP;
    for (const text of items) {
      const w = Math.min(CW, textWidth(text, pt) + (hexes ? 0.9 : 0.7));
      if (x + w > M + CW) {
        x = M;
        y += CHIP + 0.22;
      }
      if (y + CHIP > BOTTOM) {
        page++;
        x = M;
        y = TOP;
      }
      placed.push({ page, x, y, w, text });
      x += w + 0.22;
    }
    for (let p = 0; p <= page; p++) {
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      placed.filter((c) => c.page === p).forEach((c, i) => {
        const col = colorAt(i);
        const hex = hexes ? c.text.replace("#", "").toUpperCase() : null;
        this.rect(s, c.x, c.y, c.w, CHIP, hex ? "FFFFFF" : col.soft, CHIP / 2, hex ? { line: { color: LINE, width: 1 } } : {});
        if (hex) this.circle(s, c.x + 0.14, c.y + 0.14, CHIP - 0.28, hex);
        this.text(s, c.text, { x: c.x + (hex ? 0.6 : 0), y: c.y, w: c.w - (hex ? 0.6 : 0), h: CHIP, fontSize: pt, bold: true, color: hex ? INK : col.c, align: hex ? "left" : "center", valign: "middle" });
      });
    }
  }

  /** Phases along a line, each with its own column of tasks. */
  timeline(kicker: string, title: string, phases: { mark: string; head: string; items: string[] }[], color: Color) {
    const long = phases.some((p) => p.items.join("").length > 160);
    const per = phases.length <= 4 ? phases.length : long ? 3 : 4;
    const pages = Math.ceil(phases.length / per);
    const perPage = Math.ceil(phases.length / pages);
    for (let p = 0; p < pages; p++) {
      const group = phases.slice(p * perPage, p * perPage + perPage);
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      const gap = 0.3;
      const w = (CW - gap * (perPage - 1)) / perPage;
      const lineY = TOP + 0.25;
      s.addShape(this.pptx.ShapeType.line, { x: M, y: lineY, w: CW, h: 0, line: { color: LINE, width: 2 } });
      group.forEach((ph, i) => {
        const x = M + i * (w + gap);
        const col = colorAt(p * perPage + i);
        this.circle(s, x, lineY - 0.25, 0.5, col.c, String(p * perPage + i + 1), 13);
        this.text(s, ph.mark, { x: x + 0.6, y: lineY - 0.2, w: w - 0.6, h: 0.4, fontSize: 12, bold: true, color: col.c, valign: "middle" });
        const headH = Math.min(1.1, textHeight(ph.head, 16, w - 0.3, 1.2) + 0.15);
        const cardY = lineY + 0.45;
        const cardH = BOTTOM - cardY - 0.1;
        this.rect(s, x, cardY, w, cardH, col.soft, 0.1);
        this.rect(s, x, cardY, w, 0.08, col.c);
        this.text(s, ph.head, { x: x + 0.15, y: cardY + 0.2, w: w - 0.3, h: headH, fontSize: fitFont(ph.head, w - 0.3, headH, 16, 11), bold: true, color: INK });
        const body = ph.items.join("\n");
        const bh = cardH - headH - 0.4;
        const pt = fitFont(body, w - 0.55, bh - ph.items.length * 0.1, 18, 8);
        if (ph.items.length) {
          this.text(s, ph.items.map((t) => ({ text: t, options: { breakLine: true, bullet: { indent: 10 }, paraSpaceAfter: 6 } })), {
            x: x + 0.15, y: cardY + 0.3 + headH, w: w - 0.3, h: bh, fontSize: pt, color: BODY,
          });
        }
      });
    }
  }

  /** Big-number tiles for a handful of short facts. */
  kpis(kicker: string, title: string, pairs: { label: string; value: string }[], color: Color) {
    const s = this.content(kicker, title, color);
    const cols = pairs.length <= 3 ? pairs.length : pairs.length === 4 ? 4 : 3;
    const rows = Math.ceil(pairs.length / cols);
    const gap = 0.3;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = Math.min(2.6, (BOTTOM - TOP - gap * (rows - 1)) / rows);
    pairs.forEach((pr, i) => {
      const x = M + (i % cols) * (w + gap);
      const y = TOP + Math.floor(i / cols) * (h + gap);
      const col = colorAt(i);
      this.rect(s, x, y, w, h, col.soft, 0.12);
      this.text(s, pr.value, { x: x + 0.3, y: y + 0.3, w: w - 0.6, h: h * 0.55, fontSize: fitFont(pr.value, w - 0.6, h * 0.55, 36, 14), bold: true, color: col.c, valign: "middle" });
      this.text(s, pr.label, { x: x + 0.3, y: y + h * 0.62, w: w - 0.6, h: h * 0.3, fontSize: 13, color: BODY });
    });
  }

  chart(kicker: string, title: string, categories: string[], series: { name: string; values: number[] }[], color: Color) {
    const s = this.content(kicker, title, color);
    const max = Math.max(...series.flatMap((x) => x.values));
    s.addChart(this.pptx.ChartType.bar, series.map((x) => ({ name: x.name, labels: categories, values: x.values })), {
      x: M, y: TOP, w: CW, h: BOTTOM - TOP - 0.1,
      barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
      chartColors: series.length === 1 ? [color.c] : PALETTE.map((p) => p.c),
      showLegend: series.length > 1, legendPos: "t", legendFontFace: FONT, legendFontSize: 12,
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: 11, catAxisLabelColor: BODY,
      valAxisLabelFontFace: FONT, valAxisLabelFontSize: 10, valAxisLabelColor: MUTED,
      valAxisMinVal: 0, ...(max <= 10 ? { valAxisMaxVal: 10, valAxisMajorUnit: 2 } : {}),
      valGridLine: { color: LINE, size: 0.5 }, catAxisLineShow: false, valAxisLineShow: false,
      showValue: series.length <= 2, dataLabelFontSize: 10, dataLabelColor: INK, dataLabelPosition: "outEnd",
    });
  }

  /** One report chart, as large as the slide allows, with its caption under it. */
  chartImage(kicker: string, title: string, png: { data: Buffer; width: number; height: number }, color: Color, caption?: string, estimated?: boolean) {
    const s = this.content(kicker, estimated ? `${title} (추정)` : title, color);
    const capH = caption ? 0.45 : 0;
    const box = fit({ width: png.width, height: png.height }, CW * 96, (BOTTOM - TOP - capH - 0.1) * 96);
    const w = box.width / 96;
    const h = box.height / 96;
    s.addImage({ data: `data:image/png;base64,${png.data.toString("base64")}`, x: M + (CW - w) / 2, y: TOP + (BOTTOM - TOP - capH - h) / 2, w, h });
    if (caption) this.text(s, caption, { x: M, y: BOTTOM - capH, w: CW, h: capH, fontSize: 11, color: MUTED, align: "center", valign: "middle" });
  }

  image(kicker: string, title: string, items: { img: FetchedImage; caption?: string }[], color: Color) {
    for (let p = 0; p * 4 < items.length; p++) {
      const group = items.slice(p * 4, p * 4 + 4);
      const s = this.content(kicker, p ? `${title} (계속)` : title, color);
      const cols = group.length === 1 ? 1 : group.length === 3 ? 3 : 2;
      const rows = Math.ceil(group.length / cols);
      const gap = 0.3;
      const cellW = (CW - gap * (cols - 1)) / cols;
      const cellH = (BOTTOM - TOP - gap * (rows - 1)) / rows;
      group.forEach((it, i) => {
        const x = M + (i % cols) * (cellW + gap);
        const y = TOP + Math.floor(i / cols) * (cellH + gap);
        const capH = it.caption ? 0.4 : 0;
        const box = fit(imageSize(it.img), (cellW) * 96, (cellH - capH) * 96);
        const w = box.width / 96;
        const h = box.height / 96;
        s.addImage({ data: dataUri(it.img), x: x + (cellW - w) / 2, y: y + (cellH - capH - h) / 2, w, h });
        if (it.caption) this.text(s, it.caption, { x, y: y + cellH - capH + 0.05, w: cellW, h: capH - 0.05, fontSize: 12, color: BODY, align: "center" });
      });
    }
  }

  /** One item per slide: its image on the left, its details on the right. */
  feature(kicker: string, title: string, img: FetchedImage, lines: CardLine[], swatches: string[], color: Color) {
    const s = this.content(kicker, title, color);
    const boxW = 6.0;
    const boxH = BOTTOM - TOP - 0.1;
    this.rect(s, M, TOP, boxW, boxH, "F6F7F9", 0.1);
    const b = fit(imageSize(img), (boxW - 0.4) * 96, (boxH - 0.4) * 96);
    s.addImage({ data: `data:image/${img.type === "png" ? "png" : "jpeg"};base64,${img.data.toString("base64")}`, x: M + (boxW - b.width / 96) / 2, y: TOP + (boxH - b.height / 96) / 2, w: b.width / 96, h: b.height / 96 });
    const x = M + boxW + 0.4;
    const w = W - M - x;
    let bottom = BOTTOM - 0.1;
    if (swatches.length) {
      const d = 0.55;
      swatches.slice(0, 6).forEach((hex, i) => {
        const cx = x + i * (d + 0.75);
        this.circle(s, cx, bottom - d - 0.3, d, hex.replace("#", ""));
        this.text(s, hex.toUpperCase(), { x: cx - 0.3, y: bottom - 0.28, w: d + 0.6, h: 0.25, fontSize: 9, color: MUTED, align: "center" });
      });
      bottom -= d + 0.45;
    }
    const runs: Run[] = [];
    for (const l of lines) {
      if (l.label) runs.push({ text: l.label, options: { bold: true, color: color.c, fontSize: 11, breakLine: true, paraSpaceBefore: runs.length ? 8 : 0 } });
      if (l.text) runs.push({ text: l.text, options: { color: BODY, breakLine: true, bullet: l.bullet ? { indent: 12 } : false } });
    }
    const pt = fitFont(cardTextLength(lines), w, bottom - TOP, 16, 9);
    this.text(s, runs, { x, y: TOP, w, h: bottom - TOP, fontSize: pt, lineSpacingMultiple: 1.12 });
  }
}

// ---------------------------------------------------------------- layout

interface Ctx {
  deck: Deck;
  images: Map<string, FetchedImage>;
  sources: Source[];
}

function collectImageUrls(value: unknown, out: string[] = []): string[] {
  const url = imageUrl(value);
  if (url) out.push(url);
  else if (Array.isArray(value)) value.forEach((v) => collectImageUrls(v, out));
  else if (isObj(value)) Object.entries(value).forEach(([k, v]) => !SKIP_KEYS.has(k) && collectImageUrls(v, out));
  return out;
}

function renderValue(ctx: Ctx, key: string, value: unknown, title: string, kicker: string, color: Color, colorIndex: number): void {
  const { deck } = ctx;
  if (isEmpty(value) || SKIP_KEYS.has(key) || SLIDE_SKIP.has(key)) return;
  if (isSourceArray(value)) {
    ctx.sources.push(...value);
    return;
  }

  if (typeof value === "string" && imageUrl(value)) {
    const img = ctx.images.get(imageUrl(value)!);
    if (img) deck.image(kicker, title, [{ img }], color);
    return;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (key === "body_markdown") return renderMarkdown(ctx, t, title, kicker, color);
    if (t.length <= 200 && !t.includes("\n")) deck.statement(kicker, title, t, color);
    else deck.prose(kicker, title, t.split(/\n+/).filter((l) => l.trim()).map((text) => ({ text })), color);
    return;
  }
  if (isScalar(value)) {
    deck.kpis(kicker, title, [{ label: title, value: scalarText(key, value) }], color);
    return;
  }

  if (Array.isArray(value)) {
    const urls = value.map(imageUrl);
    if (urls.every(Boolean)) {
      const items = urls.flatMap((u, i) => {
        const img = ctx.images.get(u!);
        const v = value[i];
        const caption = isObj(v) ? [v.name, v.purpose].filter((x) => typeof x === "string" && x).join(" — ") : "";
        return img ? [{ img, caption: caption || `${title} ${i + 1}` }] : [];
      });
      if (items.length) deck.image(kicker, title, items, color);
      return;
    }
    if (value.every(isScalar)) {
      const items = value.map((v) => scalarText(key, v)).filter(Boolean);
      const avg = items.reduce((n, i) => n + i.length, 0) / items.length;
      const max = Math.max(...items.map((i) => i.length));
      if (items.every((i) => HEX.test(i)) || (items.length > 4 && avg <= 16 && max <= 30)) deck.chips(kicker, title, items, color);
      else if (items.length <= 6 && max <= 90) deck.tiles(kicker, title, items, color);
      else deck.numbered(kicker, title, items.map((text, i) => ({ mark: String(i + 1), text })), color);
      return;
    }
    if (value.every(Array.isArray)) {
      const matrix = value as unknown[][];
      if (matrix.every((r) => r.every((c) => typeof c === "number"))) {
        // A bare number grid (the 3-year P&L): years across, as in the .docx
        const width = Math.max(...matrix.map((r) => r.length));
        deck.table(kicker, title, ["구분", ...Array.from({ length: width }, (_, i) => `연도 ${i + 1}`)], matrix.map((r, i) => [`행 ${i + 1}`, ...r.map((n) => (n as number).toLocaleString("ko-KR"))]), color);
        return;
      }
      const rows = (value as unknown[][]).map((r) => r.map((c) => (isScalar(c) ? scalarText(key, c) : "")));
      const headed = rows.length > 1 && (value[0] as unknown[]).every((c) => typeof c === "string") && (value[1] as unknown[]).some((c) => typeof c !== "string" || c !== (value[0] as unknown[])[0]);
      deck.table(kicker, title, headed ? rows[0] : null, headed ? rows.slice(1) : rows, color);
      return;
    }
    const objs = value.filter(isObj);
    if (objs.length) renderObjects(ctx, key, objs, title, kicker, color, colorIndex);
    return;
  }

  if (isObj(value)) {
    const url = imageUrl(value);
    if (url) {
      const img = ctx.images.get(url);
      if (img) deck.image(kicker, title, [{ img }], color);
      return;
    }
    const heading = value.data_source === "estimated" ? `${title} (추정)` : title;
    const fields = fieldsOf(value, ctx.sources);
    if (!fields.length) return;
    if (isNumericObj(Object.fromEntries(fields))) {
      deck.chart(kicker, heading, fields.map(([k]) => humanize(k)), [{ name: heading, values: fields.map(([, v]) => v as number) }], color);
      return;
    }
    // Sibling lists of like items (keyword tiers) → one table with a group column
    const lists = fields.filter(([, v]) => Array.isArray(v) && v.length > 0 && v.every(isObj));
    if (lists.length === fields.length && lists.length > 1) {
      const cols = [...new Set(lists.flatMap(([, v]) => (v as Obj[]).flatMap((o) => fieldsOf(o, ctx.sources).map(([k]) => k))))];
      const rows = lists.flatMap(([k, v]) => (v as Obj[]).map((o, i) => [i === 0 ? humanize(k) : "", ...cols.map((c) => cellText(c, o[c]))]));
      if (cols.length <= 5 && rows.every((r) => r.every((c) => c !== null))) {
        deck.table(kicker, heading, ["", ...cols.map(humanize)], rows as string[][], color, { groupCol: true });
        return;
      }
    }
    const scalars = fields.filter(([, v]) => isScalar(v));
    const rest = fields.filter(([, v]) => !isScalar(v));
    const long = scalars.some(([k, v]) => scalarText(k, v).length > 160);
    if (scalars.length && !long) {
      const pairs = scalars.map(([k, v]) => ({ label: humanize(k), value: scalarText(k, v) }));
      if (pairs.length <= 6 && pairs.every((p) => p.value.length <= 24)) deck.kpis(kicker, heading, pairs, color);
      else deck.table(kicker, heading, null, pairs.map((p) => [p.label, p.value]), color, { labelCol: true });
    } else {
      for (const [k, v] of scalars) renderValue(ctx, k, v, `${heading} · ${humanize(k)}`, kicker, color, colorIndex);
    }
    for (const [k, v] of rest) renderValue(ctx, k, v, `${heading} · ${humanize(k)}`, kicker, color, colorIndex);
  }
}

// Fields that read fine in a document but aren't worth a slide.
const SLIDE_SKIP = new Set(["char_count"]);

const PHASE_KEYS = ["phase", "week_no", "week", "month", "stage", "step"];

function renderObjects(ctx: Ctx, key: string, objs: Obj[], title: string, kicker: string, color: Color, colorIndex: number): void {
  const { deck } = ctx;

  // day/order + text pairs → a numbered run of steps
  if (objs.every((o) => asCompactPair(o))) {
    deck.numbered(kicker, title, objs.map((o) => {
      const pair = asCompactPair(o)!;
      return { mark: pair.label, text: pair.text };
    }), color);
    return;
  }

  // Items that carry their own picture (logo concepts, product shots)
  const imgKey = ["image", "image_url", "url"].find((k) => objs.filter((o) => imageUrl(k === "url" ? o : o[k])).length >= Math.ceil(objs.length / 2));
  if (imgKey) {
    const textual = objs.some((o) => fieldsOf(o, []).some(([k, v]) => k !== imgKey && typeof v === "string" && v.length > 40));
    if (textual) {
      objs.forEach((o, i) => {
        const img = ctx.images.get(imageUrl(imgKey === "url" ? o : o[imgKey])!);
        const tk = titleKeyOf(o);
        const name = tk ? String(o[tk]) : `${title} ${i + 1}`;
        const skip = new Set([imgKey, ...(tk ? [tk] : [])]);
        const swatches = Object.values(o).flatMap((v) => (isObj(v) ? Object.values(v) : [])).find((v): v is string[] => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && HEX.test(x))) ?? [];
        const lines = cardLines(o, skip, ctx.sources);
        if (img) deck.feature(kicker, `${title} ${i + 1} · ${name}`, img, lines, swatches, colorAt(colorIndex + i));
        else deck.cards(kicker, title, [{ title: name, lines }], color, colorIndex + i);
      });
      return;
    }
  }

  // Score sets (e.g. trend ideas) also get a comparison chart
  const scoreKey = Object.keys(objs[0]).find((k) => objs.every((o) => isNumericObj(o[k])));

  // Phased plans → timeline
  const phaseKey = PHASE_KEYS.find((k) => objs.every((o) => o[k] !== undefined && isScalar(o[k])));
  const listKey = phaseKey && Object.keys(objs[0]).find((k) => objs.every((o) => Array.isArray(o[k])));
  if (phaseKey && listKey) {
    deck.timeline(kicker, title, objs.map((o, i) => {
      const mark = typeof o[phaseKey] === "number" ? `${o[phaseKey]}${phaseKey.startsWith("week") ? "주차" : "단계"}` : String(o[phaseKey]);
      const headField = Object.keys(o).find((k) => k !== phaseKey && k !== listKey && typeof o[k] === "string");
      const items = (o[listKey] as unknown[]).map((x) => (isObj(x) ? cardLines(x, new Set(), ctx.sources).map((l) => l.text).filter(Boolean)[0] ?? "" : scalarText(listKey, x))).filter(Boolean);
      const titleItem = (o[listKey] as unknown[]).every(isObj)
        ? (o[listKey] as Obj[]).map((x) => {
            const pair = asCompactPair(x);
            if (pair) return pair.text;
            const tk = titleKeyOf(x);
            return tk ? String(x[tk]) : "";
          }).filter(Boolean)
        : items;
      return {
        mark: mark || `${i + 1}단계`,
        head: headField ? String(o[headField]) : String(o[phaseKey]),
        items: titleItem.length ? titleItem : items,
      };
    }), color);
    return;
  }

  // Uniform, flat-enough items → table
  const columns = [...new Set(objs.flatMap((o) => fieldsOf(o, ctx.sources).map(([k]) => k)))].filter((k) => k !== scoreKey && !objs.some((o) => imageUrl(o[k])));
  const tk = titleKeyOf(objs[0]);
  if (tk && columns.includes(tk)) {
    columns.splice(columns.indexOf(tk), 1);
    columns.unshift(tk);
  }
  const cells = objs.map((o) => columns.map((k) => cellText(k, o[k])));
  const flat = cells.every((r) => r.every((c) => c !== null));
  const rowLen = flat ? cells.reduce((n, r) => n + r.join("").length, 0) / cells.length : Infinity;
  const maxCell = flat ? Math.max(...cells.flat().map((c) => c!.length)) : Infinity;
  const fewRich = objs.length <= 3 && columns.length >= 4;
  if (flat && !fewRich && columns.length >= 2 && columns.length <= 6 && rowLen <= 260 && maxCell <= 200) {
    deck.table(kicker, title, columns.map(humanize), cells as string[][], color);
  } else {
    deck.cards(kicker, title, objs.map((o, i) => {
      const t = titleKeyOf(o);
      const rank = typeof o.rank === "number" ? `#${o.rank}` : typeof o.order === "number" ? pad2(o.order) : undefined;
      return {
        title: t ? String(o[t]) : `${title} ${i + 1}`,
        badge: rank ?? pad2(i + 1),
        lines: cardLines(o, new Set([...(t ? [t] : []), ...(scoreKey ? [scoreKey] : []), "rank", "order"]), ctx.sources),
      };
    }), color, colorIndex);
  }

  if (scoreKey) {
    const dims = Object.keys(objs[0][scoreKey] as Obj);
    const names = objs.map((o, i) => (tk ? String(o[tk]) : `${i + 1}`));
    deck.chart(kicker, `${title} · ${humanize(scoreKey)} 비교`, dims.map(humanize), names.map((name, i) => ({ name, values: dims.map((d) => Number((objs[i][scoreKey] as Obj)[d]) || 0) })), color);
  }
}

function renderMarkdown(ctx: Ctx, md: string, title: string, kicker: string, color: Color) {
  const chunks: { head: string; lines: { text: string; bullet?: boolean; head?: boolean }[] }[] = [{ head: title, lines: [] }];
  for (const l of plainMarkdownLines(md)) {
    if (l.heading && /^#{1,2}\s/.test(md.split("\n").find((x) => x.includes(l.text)) ?? "")) chunks.push({ head: l.text, lines: [] });
    else chunks[chunks.length - 1].lines.push({ text: l.text, bullet: l.bullet, head: l.heading });
  }
  for (const c of chunks) if (c.lines.length) ctx.deck.prose(kicker, c.head, c.lines, color);
}

interface LayoutCtx {
  kicker: string;
  headline: string;
  points: string[];
  notes: string;
  photo?: FetchedImage;
  color: Color;
  pal: Color[];
  accentHex: string;
}

/** The slide's own layout (big number, chart, table, …). False = fall back to the classic layouts. */
function renderLayout(deck: Deck, sl: Obj, x: LayoutCtx): boolean {
  const { kicker, headline, points, notes, color } = x;
  const layout = typeof sl.layout === "string" ? sl.layout : "";
  const strs = (v: unknown) => (Array.isArray(v) ? v.map((t) => String(t ?? "")).filter(Boolean) : []);
  const pointsBox = (s: Slide, bx: number, by: number, bw: number, bh: number, lead?: string) => {
    const runs: Run[] = [];
    if (lead) runs.push({ text: lead, options: { bold: true, color: color.c, breakLine: true, paraSpaceAfter: 10 } });
    points.forEach((p) => runs.push({ text: p, options: { breakLine: true, bullet: { indent: 14 }, paraSpaceAfter: 8, color: BODY } }));
    if (!runs.length) return;
    const pt = fitFont([lead ?? "", ...points].join("\n"), bw - 0.3, bh - points.length * 0.12, 17, 10);
    deck.text(s, runs, { x: bx, y: by, w: bw, h: bh, fontSize: pt, valign: "top", lineSpacingMultiple: 1.15 });
  };

  switch (layout) {
    case "big_number": {
      const stat = isObj(sl.stat) ? sl.stat : null;
      // A placeholder is not a headline number: show the slide as points instead.
      if (!stat || !stat.value || String(stat.value).includes("확인 필요")) return false;
      const s = deck.content(kicker, headline, color, notes);
      const bw = 5.6;
      deck.rect(s, M, TOP, bw, BOTTOM - TOP - 0.1, color.soft, 0.14);
      deck.rect(s, M, TOP, 0.1, BOTTOM - TOP - 0.1, color.c);
      const value = String(stat.value);
      deck.text(s, value, { x: M + 0.35, y: TOP + 0.4, w: bw - 0.6, h: 2.2, fontSize: fitFont(value, bw - 0.6, 2.2, 96, 36), bold: true, color: color.c, valign: "middle" });
      deck.text(s, String(stat.label ?? ""), { x: M + 0.35, y: TOP + 2.7, w: bw - 0.6, h: 0.8, fontSize: 20, bold: true, color: INK, valign: "top" });
      if (stat.context) deck.text(s, String(stat.context), { x: M + 0.35, y: TOP + 3.5, w: bw - 0.6, h: BOTTOM - TOP - 3.8, fontSize: fitFont(String(stat.context), bw - 0.6, 1.3, 14, 10), color: BODY, valign: "top" });
      pointsBox(s, M + bw + 0.5, TOP + 0.2, CW - bw - 0.5, BOTTOM - TOP - 0.4);
      return true;
    }
    case "chart": {
      const c = isObj(sl.chart) ? (sl.chart as DeckChart) : null;
      const spec = deckChartSpec(c);
      if (!spec) return false;
      const png = chartPng(spec, deckPalette(x.accentHex), 600);
      if (!png) return false;
      const estimate = c?.source === "estimate";
      const s = deck.content(kicker, headline, color, notes);
      const cw = 8.1;
      const box = fit({ width: png.width, height: png.height }, cw * 96, (BOTTOM - TOP - 0.2) * 96);
      s.addImage({ data: `data:image/png;base64,${png.data.toString("base64")}`, x: M, y: TOP + (BOTTOM - TOP - box.height / 96) / 2, w: box.width / 96, h: box.height / 96 });
      const rx = M + cw + 0.4;
      const rw = W - M - rx;
      if (estimate) {
        deck.rect(s, rx, TOP, 1.0, 0.36, "FEF3C7", 0.18);
        deck.text(s, "추정치", { x: rx, y: TOP, w: 1.0, h: 0.36, fontSize: 11, bold: true, color: "B7791F", align: "center", valign: "middle" });
      }
      pointsBox(s, rx, TOP + (estimate ? 0.55 : 0), rw, BOTTOM - TOP - (estimate ? 0.65 : 0.1), typeof c?.takeaway === "string" ? c.takeaway : undefined);
      return true;
    }
    case "table": {
      const t = isObj(sl.table) ? sl.table : null;
      const header = strs(t?.header);
      const rows = Array.isArray(t?.rows) ? (t!.rows as unknown[]).map(strs).filter((r) => r.length) : [];
      if (!header.length || !rows.length) return false;
      deck.nextNotes = [notes, points.length ? `요점:\n${points.map((p) => `- ${p}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
      deck.table(kicker, headline, header, rows, color, { labelCol: true });
      return true;
    }
    case "comparison": {
      const cmp = isObj(sl.compare) ? sl.compare : null;
      if (!cmp) return false;
      const s = deck.content(kicker, headline, color, notes);
      const gap = 0.9;
      const cw = (CW - gap) / 2;
      const col = (cx: number, title: string, items: string[], strong: boolean) => {
        const h = BOTTOM - TOP - 0.1;
        deck.rect(s, cx, TOP, cw, h, strong ? color.soft : "F3F4F6", 0.14);
        deck.rect(s, cx, TOP, cw, 0.1, strong ? color.c : "9CA3AF");
        deck.text(s, title, { x: cx + 0.35, y: TOP + 0.3, w: cw - 0.7, h: 0.7, fontSize: fitFont(title, cw - 0.7, 0.7, 22, 14), bold: true, color: strong ? color.c : "4B5563", valign: "middle" });
        const pt = fitFont(items.join("\n"), cw - 1.0, h - 1.4 - items.length * 0.15, 18, 10);
        deck.text(s, items.map((t) => ({ text: t, options: { breakLine: true, bullet: { indent: 14 }, paraSpaceAfter: 10 } })), { x: cx + 0.35, y: TOP + 1.15, w: cw - 0.7, h: h - 1.35, fontSize: pt, color: strong ? INK : "4B5563", valign: "top", lineSpacingMultiple: 1.15 });
      };
      col(M, String(cmp.left_title ?? ""), strs(cmp.left_points), false);
      col(M + cw + gap, String(cmp.right_title ?? ""), strs(cmp.right_points), true);
      deck.circle(s, M + cw + gap / 2 - 0.36, TOP + (BOTTOM - TOP) / 2 - 0.36, 0.72, color.c, "VS", 14);
      return true;
    }
    case "process": {
      const steps = Array.isArray(sl.steps) ? (sl.steps as unknown[]).filter(isObj) : [];
      if (steps.length < 2) return false;
      deck.nextNotes = notes;
      deck.timeline(kicker, headline, steps.map((st, i) => ({ mark: pad2(i + 1), head: String(st.title ?? ""), items: st.text ? [String(st.text)] : [] })), color);
      return true;
    }
    case "quote": {
      const q = isObj(sl.quote) ? sl.quote : null;
      if (!q || !q.text) return false;
      deck.nextNotes = [notes, `헤드라인: ${headline}`].filter(Boolean).join("\n\n");
      deck.statement(kicker, q.source ? `— ${String(q.source)}` : headline, String(q.text), color);
      return true;
    }
    case "photo": {
      if (!x.photo) return false;
      deck.nextNotes = notes;
      deck.photoCover(x.photo, color, headline, points.slice(0, 2).join(" · "), kicker);
      return true;
    }
    case "statement": {
      deck.nextNotes = [notes, points.length ? `요점:\n${points.map((p) => `- ${p}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
      deck.statement(kicker, "", headline, color);
      return true;
    }
    default:
      return false;
  }
}

function renderPresentation(deck: Deck, o: Obj, images: Map<string, FetchedImage>) {
  const slides = (o.slides as Obj[]).filter(isObj);
  // One brand accent drives the whole deck when the run chose one.
  const pal: Color[] = typeof o.accent_color === "string" && HEX.test(o.accent_color) ? accentPalette(o.accent_color) : [...PALETTE];
  const pc = (i: number) => pal[((i % pal.length) + pal.length) % pal.length];
  const imgOf = (v: unknown) => (typeof v === "string" ? images.get(v) : undefined);
  const cover = imgOf(o.cover_image_url);

  if (typeof o.storyline === "string" && o.storyline) deck.statement("STORYLINE", "이야기 흐름", o.storyline, pal[0]);
  slides.forEach((sl, i) => {
    const color = pal.length === PALETTE.length ? colorAt(i) : pal[0];
    const headline = String(sl.headline ?? sl.title ?? `슬라이드 ${i + 1}`);
    const points = Array.isArray(sl.points) ? sl.points.map(String).filter(Boolean) : [];
    const notes = [sl.speaker_notes, sl.visual ? `[시각 자료] ${sl.visual}` : ""].filter((x) => typeof x === "string" && x).join("\n\n");
    const kicker = pad2(i + 1);
    const photo = imgOf(sl.image_url);
    const short = points.length >= 2 && points.length <= 4 && points.every((p) => p.length <= 70);
    if (renderLayout(deck, sl, { kicker, headline, points, notes, photo, color, pal, accentHex: `#${pal[0].c}` })) return;
    if (photo) {
      // Claim and points on the left, the slide's photo filling the right
      const s = deck.base(kicker, color);
      if (notes) s.addNotes(notes);
      const imgW = 5.4;
      deck.photo(s, photo, W - imgW, 0, imgW, H);
      const w = W - imgW - M - 0.5;
      deck.text(s, headline, { x: M, y: 0.8, w, h: 1.9, fontSize: fitFont(headline, w, 1.9, 30, 18), bold: true, color: INK, valign: "top", lineSpacingMultiple: 1.1 });
      deck.rect(s, M, 2.8, 0.9, 0.08, color.c);
      const pt = fitFont(points.join("\n"), w - 0.7, BOTTOM - 3.2 - points.length * 0.3, 18, 11);
      let y = 3.15;
      points.forEach((p, j) => {
        const h = textHeight(p, pt, w - 0.7, 1.25) + 0.3;
        deck.circle(s, M, y + 0.02, 0.42, pc(j).c, String(j + 1), 12);
        deck.text(s, p, { x: M + 0.6, y, w: w - 0.6, h, fontSize: pt, color: BODY });
        y += h;
      });
    } else if (short) {
      // Headline on top, one colored column per point
      const s = deck.content(kicker, headline, color, notes);
      const gap = 0.3;
      const w = (CW - gap * (points.length - 1)) / points.length;
      points.forEach((p, j) => {
        const c = pc(i + j);
        const x = M + j * (w + gap);
        deck.rect(s, x, TOP + 0.2, w, BOTTOM - TOP - 0.4, c.soft, 0.12);
        deck.rect(s, x, TOP + 0.2, w, 0.1, c.c);
        deck.text(s, pad2(j + 1), { x: x + 0.3, y: TOP + 0.55, w: w - 0.6, h: 0.7, fontSize: 32, bold: true, color: c.c });
        deck.text(s, p, { x: x + 0.3, y: TOP + 1.45, w: w - 0.6, h: BOTTOM - TOP - 2.2, fontSize: fitFont(p, w - 0.6, BOTTOM - TOP - 2.4, 28, 12), bold: true, color: INK, lineSpacingMultiple: 1.15, valign: "middle" });
      });
    } else {
      // Colored headline panel on the left, points on the right
      const s = deck.base(kicker, color);
      if (notes) s.addNotes(notes);
      const panelW = 4.6;
      deck.rect(s, 0, 0, panelW, H, color.c);
      deck.text(s, kicker, { x: 0.6, y: 0.9, w: panelW - 1.1, h: 0.8, fontSize: 40, bold: true, color: "FFFFFF", transparency: 35 });
      deck.text(s, headline, { x: 0.6, y: 1.9, w: panelW - 1.1, h: 4.2, fontSize: fitFont(headline, panelW - 1.1, 4.2, 30, 16), bold: true, color: "FFFFFF", lineSpacingMultiple: 1.15 });
      const x = panelW + 0.6;
      const w = W - x - M;
      const body = points.join("\n");
      const pt = fitFont(body, w - 0.7, BOTTOM - 1.0 - points.length * 0.35, 24, 11);
      const rowH = (p: string) => textHeight(p, pt, w - 0.7, 1.25) + 0.35;
      let y = Math.max(0.8, (H - points.reduce((n, p) => n + rowH(p), 0)) / 2);
      points.forEach((p, j) => {
        const h = rowH(p);
        deck.circle(s, x, y + 0.02, 0.46, pc(i + j).c, String(j + 1), 13);
        deck.text(s, p, { x: x + 0.65, y, w: w - 0.65, h, fontSize: pt, color: INK });
        y += h;
      });
    }
  });
  if (typeof o.closing_ask === "string" && o.closing_ask) {
    const title = typeof o.title === "string" ? o.title : deck.name;
    if (cover) deck.photoCover(cover, pal[0], o.closing_ask, title, "", true);
    else deck.closing(o.closing_ask, title);
  }
}

/** A data tool's report as slides: headline numbers, then each section's charts, tables and cards. */
function renderReport(ctx: Ctx, report: Report) {
  const { deck } = ctx;
  const color: Color = (() => {
    const c = report.palette[0].replace("#", "").toUpperCase();
    return { c, soft: mix(c, "FFFFFF", 0.9) } as unknown as Color;
  })();
  if (report.hero.kpis?.length) deck.kpis("핵심 숫자", report.hero.subtitle ? report.hero.subtitle : report.hero.title, report.hero.kpis.map((k) => ({ label: k.note ? `${k.label} · ${k.note}` : k.label, value: k.value })), color);
  const shown = report.sections.filter((sec) => !sec.blocks.every((b) => b.type === "sources"));
  if (shown.length >= 4) deck.agenda(shown.map((sec) => sec.title));

  shown.forEach((sec, i) => {
    const kicker = `${pad2(i + 1)}  ${(sec.kicker ?? "").replace(/^\d+\s*·\s*/, "") || sec.title}`;
    // Consecutive text and lists read best together on one slide.
    let prose: { text: string; bullet?: boolean; head?: boolean }[] = [];
    let proseTitle = "";
    const flush = () => {
      if (prose.length) deck.prose(kicker, proseTitle || sec.title, prose, color);
      prose = [];
      proseTitle = "";
    };
    if (sec.lead) prose.push({ text: sec.lead });
    for (const b of sec.blocks as ReportBlock[]) {
      if (b.type === "text" || b.type === "bullets") {
        if (!prose.length && b.title) proseTitle = b.title;
        else if (b.title) prose.push({ text: b.title, head: true });
        if (b.type === "text") prose.push({ text: b.text });
        else b.items.forEach((t, k) => prose.push({ text: b.style === "num" ? `${k + 1}. ${t}` : t, bullet: b.style !== "num" }));
        continue;
      }
      flush();
      switch (b.type) {
        case "kpis":
          deck.kpis(kicker, sec.title, b.items.map((k) => ({ label: k.note ? `${k.label} · ${k.note}` : k.label, value: k.value })), color);
          break;
        case "chart": {
          // A short, wide chart (a few horizontal bars) would come out as a thin strip; draw it narrower so it scales up.
          let png = chartPng(b.chart, report.palette, 900);
          if (png && png.height / png.width < 0.35) png = chartPng(b.chart, report.palette, 520);
          if (png) deck.chartImage(kicker, b.title ?? sec.title, png, color, b.caption, b.estimated);
          break;
        }
        case "table":
          deck.table(kicker, b.title ?? sec.title, b.header, b.rows, color);
          break;
        case "callout":
          deck.statement(kicker, b.label, b.text, color);
          break;
        case "cards":
          deck.cards(
            kicker,
            b.title ?? sec.title,
            b.items.map((c) => ({
              title: c.title,
              badge: c.badge,
              lines: [
                ...(c.kicker ? [{ label: c.kicker, text: "" }] : []),
                ...(c.meter ? [{ text: c.meter.label }] : []),
                ...(c.facts ?? []).map((f) => ({ label: f.label, text: f.value })),
                ...(c.lines ?? []).map((t) => ({ text: t, bullet: true })),
              ],
            })),
            color,
            0,
          );
          break;
        case "quad":
          deck.cards(kicker, b.title ?? sec.title, b.cells.map((c) => ({ title: c.title, lines: c.items.map((t) => ({ text: t, bullet: true })) })), color, 0);
          break;
        case "sources":
          ctx.sources.push(...b.items);
          break;
      }
    }
    flush();
  });
  for (const sec of report.sections) for (const b of sec.blocks) if (b.type === "sources") ctx.sources.push(...b.items);
}

export async function buildPptx(doc: ExportDoc): Promise<Buffer> {
  const o = isObj(doc.output) ? doc.output : {};
  const isDeck = Array.isArray(o.slides) && (o.slides as unknown[]).some((s) => isObj(s) && ("headline" in s || "points" in s));
  const deckTitle = isDeck && typeof o.title === "string" && o.title ? o.title : doc.title;
  const deckSubtitle = isDeck && typeof o.subtitle === "string" && o.subtitle ? `${o.subtitle} · ${doc.subtitle}` : doc.subtitle;
  const deck = new Deck(deckTitle);
  const images = await fetchAll(collectImageUrls(o));
  const coverImg = isDeck && typeof o.cover_image_url === "string" ? images.get(o.cover_image_url) : undefined;
  if (coverImg) {
    const accent = typeof o.accent_color === "string" && HEX.test(o.accent_color) ? accentPalette(o.accent_color)[0] : PALETTE[0];
    deck.photoCover(coverImg, accent, deckTitle, deckSubtitle, doc.title);
  } else deck.cover(deckTitle, deckSubtitle, isDeck ? doc.title : "해봇 AI");

  const ctx: Ctx = { deck, images, sources: [] };

  if (isDeck) {
    renderPresentation(deck, o, images);
  } else if (doc.report) {
    const mood = collectImageUrls(o.mood_board).map((u) => images.get(u)).filter((x): x is FetchedImage => Boolean(x));
    if (mood.length) deck.image("MOOD", "추천 방향 무드보드", mood.map((img) => ({ img })), colorAt(0));
    renderReport(ctx, doc.report);
  } else {
    const sections = Object.entries(o).filter(([k, v]) => !SKIP_KEYS.has(k) && !SLIDE_SKIP.has(k) && !isEmpty(v) && !isSourceArray(v));
    for (const [, v] of Object.entries(o)) if (isSourceArray(v)) ctx.sources.push(...v);
    if (sections.length >= 4) deck.agenda(sections.map(([k]) => humanize(k)));
    sections.forEach(([k, v], i) => renderValue(ctx, k, v, humanize(k), `${pad2(i + 1)}  ${humanize(k)}`, colorAt(i), i));
  }

  const seen = new Set<string>();
  const sources = [...doc.sources, ...ctx.sources].filter((s) => !seen.has(s.url) && Boolean(seen.add(s.url))).slice(0, 24);
  if (sources.length) {
    deck.table("SOURCES", "출처", ["#", "자료", "링크"], sources.map((s, i) => [String(i + 1), s.title, s.url.length > 70 ? `${s.url.slice(0, 67)}…` : s.url]), PALETTE[0]);
  }
  if (!isDeck) deck.closing(deckTitle, doc.subtitle);


  return (await deck.pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
