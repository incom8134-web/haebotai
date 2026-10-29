import "server-only";
import PptxGenJS from "pptxgenjs";
import { fetchAll, imageSize, type FetchedImage } from "../images.ts";
import { chartPng } from "../chart-png.ts";
import { designImages, plain, type Block, type Card, type Design, type Slide } from "./model.ts";

// The designed deck: its own slide story (design.slides) — a blog as card
// news, a brand guide as brand slides, ads one per slide — each slide a
// title and one block laid out to fill a 16:9 page.

const SW = 13.333;
const SH = 7.5;
const M = 0.65;
const CW = SW - M * 2;
const INK = "15181E";
const BODY = "2E343D";
const MUTED = "6B7280";
const LINE = "E4E7EC";
const SOFT = "F5F6F8";

const h6 = (hex: string) => hex.replace("#", "").toUpperCase();
function tint(hex: string, t: number): string {
  const n = parseInt(h6(hex), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function readable(hex: string): string {
  const n = parseInt(h6(hex), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 160 ? INK : "FFFFFF";
}

/** Rough text width in inches: Hangul/CJK ≈ 1 em, Latin ≈ 0.55 em. */
function textWidth(text: string, pt: number): number {
  let em = 0;
  for (const ch of text) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1.08 : /[A-Z0-9@#%&]/.test(ch) ? 0.7 : ch === " " ? 0.32 : 0.56;
  return (em * pt) / 72;
}
function lines(text: string, pt: number, width: number): number {
  return text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil(textWidth(para, pt) / (width * 0.8))), 0);
}
/** The largest size (≤ max) at which the text fits the box. */
function fitPt(text: string, width: number, height: number, max: number, min: number, lineGap = 1.35): number {
  for (let pt = max; pt > min; pt -= 1) if ((lines(text, pt, width) * pt * lineGap) / 72 <= height) return pt;
  return min;
}
function clip(text: string, width: number, height: number, pt: number, lineGap = 1.25): string {
  let t = text;
  while (t.length > 20 && (lines(t, pt, width) * pt * lineGap) / 72 > height) t = `${t.slice(0, Math.floor(t.length * 0.9)).replace(/\s+\S*$/, "")}…`;
  return t;
}

export async function buildDesignedPptx(d: Design): Promise<Buffer> {
  const images = await fetchAll(designImages(d));
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = d.title;
  const FONT = d.lang === "en" ? "Segoe UI" : "Malgun Gothic";
  const A = h6(d.theme.accent);
  const A2 = h6(d.theme.accent2);
  const DARK = h6(d.theme.dark);
  const uri = (img: FetchedImage) => `data:image/${img.type === "png" ? "png" : "jpeg"};base64,${img.data.toString("base64")}`;
  type S = ReturnType<typeof pptx.addSlide>;
  let n = 0;

  const cover = (s: S, img: FetchedImage, x: number, y: number, w: number, h: number) => {
    // Photos fill the box; a very wide or tall image (a logo lockup) is fitted whole on white.
    const size = imageSize(img);
    const ratio = size.width / size.height;
    if (ratio > 1.9 || ratio < 0.55) {
      s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" } });
      const k = Math.min(w / size.width, h / size.height) * 0.9;
      s.addImage({ data: uri(img), x: x + (w - size.width * k) / 2, y: y + (h - size.height * k) / 2, w: size.width * k, h: size.height * k });
      return;
    }
    s.addImage({ data: uri(img), x, y, w, h, sizing: { type: "cover", w, h } });
  };
  const footer = (s: S, dark = false) => {
    n += 1;
    s.addText(d.footer, { x: M, y: SH - 0.42, w: CW - 1, h: 0.28, fontFace: FONT, fontSize: 9, color: dark ? "C9CED6" : MUTED });
    s.addText(String(n), { x: SW - M - 0.8, y: SH - 0.42, w: 0.8, h: 0.28, fontFace: FONT, fontSize: 9, color: dark ? "C9CED6" : MUTED, align: "right" });
  };
  const head = (s: S, kicker: string | undefined, title: string) => {
    if (kicker) s.addText(kicker.toUpperCase(), { x: M, y: 0.42, w: CW, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: A, charSpacing: 1 });
    const pt = fitPt(title, CW, 0.9, 30, 18);
    s.addText(title, { x: M, y: 0.72, w: CW, h: 0.95, fontFace: FONT, fontSize: pt, bold: true, color: INK, valign: "top", lineSpacingMultiple: 1.05 });
    s.addShape(pptx.ShapeType.rect, { x: M, y: 1.72, w: 0.55, h: 0.06, fill: { color: A }, line: { color: A } });
  };
  const TOP = 2.0;
  const BOT = SH - 0.6;
  const BH = BOT - TOP;

  // ── Blocks laid out in a box ───────────────────────────────────────
  const cardsBox = (s: S, items: Card[], cols: number, x: number, y: number, w: number, h: number) => {
    const rows = Math.ceil(items.length / cols);
    const gap = 0.22;
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (h - gap * (rows - 1)) / rows;
    items.forEach((c, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const cy = y + Math.floor(i / cols) * (ch + gap);
      s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.12, fill: { color: "FFFFFF" }, line: { color: LINE, width: 1 } });
      let yy = cy + 0.18;
      const img = c.image ? images.get(c.image) : undefined;
      if (img) {
        // Photos keep a portrait-friendly box in narrow columns.
        const ih = Math.min(ch * 0.72, cols >= 4 ? cw * 1.25 : cw * 0.62);
        cover(s, img, cx + 0.12, cy + 0.12, cw - 0.24, ih);
        yy = cy + 0.12 + ih + 0.12;
      } else {
        s.addShape(pptx.ShapeType.rect, { x: cx + 0.22, y: cy + 0.22, w: 0.4, h: 0.05, fill: { color: i % 2 ? A2 : A }, line: { color: i % 2 ? A2 : A } });
        yy = cy + 0.38;
      }
      const iw = cw - 0.44;
      if (c.kicker) {
        s.addText(c.kicker, { x: cx + 0.22, y: yy, w: iw, h: 0.28, fontFace: FONT, fontSize: 10, bold: true, color: i % 2 && !img ? A2 : A });
        yy += 0.3;
      }
      const rest = cy + ch - yy - 0.15;
      const hasBody = Boolean(c.body || c.footer);
      const titleH = hasBody ? Math.min(rest * 0.45, 0.9) : rest;
      s.addText(c.title, { x: cx + 0.22, y: yy, w: iw, h: titleH, fontFace: FONT, fontSize: fitPt(c.title, iw, titleH, hasBody ? 17 : 24, 11), bold: true, color: INK, valign: "top" });
      yy += titleH + 0.05;
      if (c.swatches?.length) {
        c.swatches.slice(0, 6).forEach((hx, k) => s.addShape(pptx.ShapeType.ellipse, { x: cx + 0.22 + k * 0.32, y: yy, w: 0.24, h: 0.24, fill: { color: h6(hx) }, line: { color: LINE } }));
        yy += 0.34;
      }
      const bodyText = [c.body, c.footer].filter(Boolean).join("\n\n");
      if (bodyText && cy + ch - yy > 0.3) {
        const bh = cy + ch - yy - 0.15;
        const pt = fitPt(bodyText, iw, bh, 14, 9);
        s.addText(clip(bodyText, iw, bh, pt), { x: cx + 0.22, y: yy, w: iw, h: bh, fontFace: FONT, fontSize: pt, color: BODY, valign: "top", lineSpacingMultiple: 1.15 });
      }
    });
  };

  const box = (s: S, b: Block, x: number, y: number, w: number, h: number) => {
    switch (b.t) {
      case "p":
      case "lead": {
        const t = plain(b.text);
        const pt = fitPt(t, w, h, 24, 12, 1.4);
        s.addText(clip(t, w, h, pt, 1.4), { x, y, w, h, fontFace: FONT, fontSize: pt, color: BODY, valign: "top", lineSpacingMultiple: 1.3 });
        break;
      }
      case "quote": {
        s.addShape(pptx.ShapeType.rect, { x, y: y + 0.05, w: 0.08, h: Math.min(h, 2.6), fill: { color: A }, line: { color: A } });
        const pt = fitPt(b.text, w - 0.4, h - 0.5, 30, 16, 1.3);
        s.addText(b.text, { x: x + 0.35, y, w: w - 0.4, h: h - (b.by ? 0.45 : 0), fontFace: FONT, fontSize: pt, bold: true, color: INK, valign: "top", lineSpacingMultiple: 1.2 });
        if (b.by) s.addText(`— ${b.by}`, { x: x + 0.35, y: y + h - 0.4, w: w - 0.4, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED });
        break;
      }
      case "bullets":
      case "chips": {
        if (b.t === "chips") {
          let cx = x;
          let cy = y + (b.label ? 0.45 : 0);
          if (b.label) s.addText(b.label, { x, y, w, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: MUTED });
          for (const it of b.items) {
            const cw = Math.min(w, textWidth(it, 15) + 0.5);
            if (cx + cw > x + w) {
              cx = x;
              cy += 0.62;
            }
            if (cy + 0.5 > y + h) break;
            s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: cw, h: 0.5, rectRadius: 0.25, fill: { color: tint(A, 0.86) }, line: { color: tint(A, 0.86) } });
            s.addText(it, { x: cx, y: cy, w: cw, h: 0.5, fontFace: FONT, fontSize: 15, color: INK, align: "center", valign: "middle" });
            cx += cw + 0.15;
          }
          break;
        }
        const items = b.items.slice(0, 7);
        const all = items.join("\n");
        const pt = fitPt(all, w - 0.6, h, 22, 12, 1.6);
        const rowH = Math.min(h / items.length, (lines(all, pt, w - 0.6) / items.length) * pt * 1.6 / 72 + 0.2);
        items.forEach((it, i) => {
          const yy = y + i * rowH;
          if (b.style === "num" || b.style === "check") {
            s.addShape(pptx.ShapeType.ellipse, { x, y: yy + 0.04, w: 0.36, h: 0.36, fill: { color: b.style === "num" ? A : tint(A2, 0.75) }, line: { color: b.style === "num" ? A : tint(A2, 0.75) } });
            s.addText(b.style === "num" ? String(i + 1) : "✓", { x, y: yy + 0.04, w: 0.36, h: 0.36, fontFace: FONT, fontSize: 12, bold: true, color: b.style === "num" ? readable(A) : A2, align: "center", valign: "middle" });
          } else s.addShape(pptx.ShapeType.ellipse, { x: x + 0.1, y: yy + 0.16, w: 0.13, h: 0.13, fill: { color: A }, line: { color: A } });
          s.addText(plain(it), { x: x + 0.55, y: yy, w: w - 0.6, h: rowH, fontFace: FONT, fontSize: pt, color: BODY, valign: "top" });
        });
        break;
      }
      case "callout": {
        const c = b.tone === "warn" ? "C2410C" : b.tone === "neutral" ? "64748B" : A;
        s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: Math.min(h, 2.2), rectRadius: 0.1, fill: { color: tint(c, 0.9) }, line: { color: tint(c, 0.9) } });
        s.addText(b.label, { x: x + 0.3, y: y + 0.18, w: w - 0.6, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: c });
        s.addText(plain(b.text), { x: x + 0.3, y: y + 0.55, w: w - 0.6, h: Math.min(h, 2.2) - 0.7, fontFace: FONT, fontSize: fitPt(plain(b.text), w - 0.6, Math.min(h, 2.2) - 0.7, 18, 11), color: BODY, valign: "top" });
        break;
      }
      case "swatches": {
        const items = b.items.slice(0, 6);
        const gap = 0.22;
        const cw = (w - gap * (items.length - 1)) / items.length;
        items.forEach((it, i) => {
          const cx = x + i * (cw + gap);
          s.addShape(pptx.ShapeType.roundRect, { x: cx, y, w: cw, h: h * 0.58, rectRadius: 0.12, fill: { color: h6(it.hex) }, line: { color: readable(it.hex) === INK ? LINE : h6(it.hex) } });
          s.addText(it.name, { x: cx, y: y + h * 0.6, w: cw, h: 0.4, fontFace: FONT, fontSize: fitPt(it.name, cw, 0.4, 16, 10), bold: true, color: INK });
          s.addText([it.hex.toUpperCase(), it.role].filter(Boolean).join(" · "), { x: cx, y: y + h * 0.6 + 0.38, w: cw, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED });
          if (it.usage) s.addText(it.usage, { x: cx, y: y + h * 0.6 + 0.7, w: cw, h: h * 0.4 - 0.75, fontFace: FONT, fontSize: fitPt(it.usage, cw, h * 0.4 - 0.75, 12, 9), color: BODY, valign: "top" });
        });
        break;
      }
      case "type": {
        const items = b.items.slice(0, 2);
        const rh = h / items.length - 0.15;
        items.forEach((it, i) => {
          const yy = y + i * (rh + 0.2);
          s.addShape(pptx.ShapeType.roundRect, { x, y: yy, w, h: rh, rectRadius: 0.1, fill: { color: SOFT }, line: { color: SOFT } });
          s.addText(`${it.role}  ·  ${[it.family, it.weight].filter(Boolean).join(" ")}`, { x: x + 0.3, y: yy + 0.15, w: w - 0.6, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: A });
          s.addText(it.sample, { x: x + 0.3, y: yy + 0.5, w: w - 0.6, h: rh - 0.6 - (it.why ? 0.4 : 0), fontFace: it.family || FONT, fontSize: fitPt(it.sample, w - 0.6, rh - 0.6 - (it.why ? 0.4 : 0), 40, 18), bold: i === 0, color: INK, valign: "middle" });
          if (it.why) s.addText(it.why, { x: x + 0.3, y: yy + rh - 0.45, w: w - 0.6, h: 0.35, fontFace: FONT, fontSize: 11, color: MUTED });
        });
        break;
      }
      case "dodont": {
        const gap = 0.3;
        const cw = (w - gap) / 2;
        const col = (cx: number, title: string, items: string[], good: boolean) => {
          const c = good ? "15803D" : "B91C1C";
          s.addShape(pptx.ShapeType.roundRect, { x: cx, y, w: cw, h, rectRadius: 0.12, fill: { color: tint(c, 0.92) }, line: { color: tint(c, 0.92) } });
          s.addText(`${good ? "✓" : "✕"}  ${title}`, { x: cx + 0.3, y: y + 0.2, w: cw - 0.6, h: 0.45, fontFace: FONT, fontSize: 17, bold: true, color: c });
          const txt = items.map((t) => `•  ${t}`).join("\n");
          s.addText(txt, { x: cx + 0.3, y: y + 0.8, w: cw - 0.6, h: h - 1, fontFace: FONT, fontSize: fitPt(txt, cw - 0.6, h - 1, 17, 10, 1.5), color: BODY, valign: "top", lineSpacingMultiple: 1.3 });
        };
        col(x, b.doTitle, b.dos, true);
        col(x + cw + gap, b.dontTitle, b.donts, false);
        break;
      }
      case "meters": {
        const rh = Math.min(0.75, h / b.items.length);
        b.items.forEach((it, i) => {
          const yy = y + i * rh;
          const v = Math.max(0, Math.min(10, it.value));
          s.addText(it.label, { x, y: yy, w: 2.4, h: rh * 0.7, fontFace: FONT, fontSize: 16, bold: true, color: INK, valign: "middle" });
          s.addShape(pptx.ShapeType.roundRect, { x: x + 2.6, y: yy + rh * 0.22, w: w - 3.8, h: rh * 0.28, rectRadius: 0.1, fill: { color: SOFT }, line: { color: SOFT } });
          s.addShape(pptx.ShapeType.roundRect, { x: x + 2.6, y: yy + rh * 0.22, w: Math.max(0.2, ((w - 3.8) * v) / 10), h: rh * 0.28, rectRadius: 0.1, fill: { color: A }, line: { color: A } });
          s.addText(`${v}/10`, { x: x + w - 1.1, y: yy, w: 1.1, h: rh * 0.7, fontFace: FONT, fontSize: 16, bold: true, color: A, align: "right", valign: "middle" });
        });
        break;
      }
      case "cards":
        cardsBox(s, b.items.slice(0, 6), Math.min(b.cols, b.items.length) || 1, x, y, w, h);
        break;
      case "post": {
        const pw = Math.min(w * 0.55, 6.2);
        const px = x + (w - pw) / 2 - (b.note ? 1.6 : 0);
        // The card is as tall as its text needs, up to the box.
        {
          const est = [b.text, (b.tags ?? []).join(" ")].filter(Boolean).join("\n\n");
          const need = 1.0 + (lines(est, 14, pw - 0.5) * 14 * 1.4) / 72 + (b.cta ? 0.7 : 0) + 0.3;
          h = Math.min(h, Math.max(2.2, need));
        }
        s.addShape(pptx.ShapeType.roundRect, { x: px, y, w: pw, h, rectRadius: 0.15, fill: { color: "FFFFFF" }, line: { color: LINE, width: 1 } });
        s.addShape(pptx.ShapeType.ellipse, { x: px + 0.25, y: y + 0.2, w: 0.5, h: 0.5, fill: { color: A }, line: { color: A } });
        s.addText(b.name.slice(0, 1), { x: px + 0.25, y: y + 0.2, w: 0.5, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: readable(A), align: "center", valign: "middle" });
        s.addText(b.name, { x: px + 0.9, y: y + 0.18, w: pw - 1.1, h: 0.3, fontFace: FONT, fontSize: 13, bold: true, color: INK });
        s.addText(b.platform, { x: px + 0.9, y: y + 0.45, w: pw - 1.1, h: 0.28, fontFace: FONT, fontSize: 10, color: MUTED });
        const body = [b.text, (b.tags ?? []).join(" ")].filter(Boolean).join("\n\n");
        const bh = h - 1.0 - (b.cta ? 0.6 : 0);
        const pt = fitPt(body, pw - 0.5, bh, 15, 9, 1.4);
        s.addText(clip(body, pw - 0.5, bh, pt, 1.4), { x: px + 0.25, y: y + 0.9, w: pw - 0.5, h: bh, fontFace: FONT, fontSize: pt, color: BODY, valign: "top", lineSpacingMultiple: 1.25 });
        if (b.cta) {
          const bw = Math.min(pw - 0.5, textWidth(b.cta, 13) + 0.6);
          s.addShape(pptx.ShapeType.roundRect, { x: px + 0.25, y: y + h - 0.6, w: bw, h: 0.42, rectRadius: 0.21, fill: { color: A }, line: { color: A } });
          s.addText(b.cta, { x: px + 0.25, y: y + h - 0.6, w: bw, h: 0.42, fontFace: FONT, fontSize: 13, bold: true, color: readable(A), align: "center", valign: "middle" });
        }
        if (b.note) {
          const nx = px + pw + 0.4;
          s.addText([{ text: "NOTE\n", options: { bold: true, color: MUTED, fontSize: 11 } }, { text: b.note, options: { color: BODY, fontSize: 13 } }], { x: nx, y, w: x + w - nx, h: 2.5, fontFace: FONT, valign: "top" });
        }
        break;
      }
      case "script":
      case "table":
      case "kv": {
        const header = b.t === "script" ? [...b.header] : b.t === "table" ? b.header : [];
        const rows = b.t === "script" ? b.rows.map((r) => [r.time, r.visual, r.voice]) : b.t === "table" ? b.rows : b.items.map((it) => [it.label, it.value]);
        const cols = Math.max(header.length, ...rows.map((r) => r.length));
        const widths = b.t === "script" ? [w * 0.14, w * 0.43, w * 0.43] : b.t === "kv" ? [w * 0.25, w * 0.75] : Array.from({ length: cols }, () => w / cols);
        const all = rows.flat().join(" ");
        const pt = fitPt(all, w * 1.6, h - 0.5, 15, 9);
        const tableRows = [
          ...(header.some(Boolean) ? [header.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: DARK } } }))] : []),
          ...rows.slice(0, 10).map((r, ri) => Array.from({ length: cols }, (_, i) => ({ text: r[i] ?? "", options: { bold: i === 0, color: i === 0 ? (b.t === "kv" ? A : INK) : BODY, fill: { color: ri % 2 ? SOFT : "FFFFFF" } } }))),
        ];
        s.addTable(tableRows, { x, y, w, colW: widths, fontFace: FONT, fontSize: pt, border: { type: "solid", color: LINE, pt: 0.5 }, valign: "middle", margin: 0.08, autoPage: false });
        break;
      }
      case "kpis": {
        const items = b.items.slice(0, 3);
        const gap = 0.3;
        const cw = (w - gap * (items.length - 1)) / items.length;
        items.forEach((k, i) => {
          const cx = x + i * (cw + gap);
          s.addShape(pptx.ShapeType.roundRect, { x: cx, y, w: cw, h: Math.min(h, 2.6), rectRadius: 0.12, fill: { color: tint(A, 0.9) }, line: { color: tint(A, 0.9) } });
          s.addText(k.value, { x: cx + 0.3, y: y + 0.3, w: cw - 0.6, h: 1.1, fontFace: FONT, fontSize: fitPt(k.value, cw - 0.6, 1.1, 54, 22), bold: true, color: A });
          s.addText(k.label, { x: cx + 0.3, y: y + 1.45, w: cw - 0.6, h: 0.45, fontFace: FONT, fontSize: 15, bold: true, color: INK });
          if (k.note) s.addText(k.note, { x: cx + 0.3, y: y + 1.9, w: cw - 0.6, h: 0.5, fontFace: FONT, fontSize: 11, color: MUTED });
        });
        break;
      }
      case "chart": {
        const png = chartPng(b.chart, b.palette, 900);
        if (!png) break;
        const capH = b.caption ? 0.45 : 0;
        const k = Math.min(w / png.width, (h - capH) / png.height);
        s.addImage({ data: `data:image/png;base64,${png.data.toString("base64")}`, x: x + (w - png.width * k) / 2, y, w: png.width * k, h: png.height * k });
        if (b.caption) s.addText(`${b.caption}${b.estimated ? `  ·  ${b.estimated}` : ""}`, { x, y: y + h - capH, w, h: capH, fontFace: FONT, fontSize: 12, color: MUTED, align: "center" });
        break;
      }
      case "carousel":
        cardsBox(s, b.items.map((c, i) => ({ kicker: `${i + 1}/${b.items.length}`, title: c.heading, body: c.text })), 3, x, y, w, h);
        break;
      case "image": {
        const img = images.get(b.url);
        if (img) cover(s, img, x, y, w, h);
        break;
      }
      case "article":
      case "h2":
      case "h3":
        s.addText(clip(plain(b.t === "article" ? b.markdown : b.text), w, h, 16), { x, y, w, h, fontFace: FONT, fontSize: 16, color: BODY, valign: "top" });
        break;
    }
  };

  // ── Slides ─────────────────────────────────────────────────────────
  const render = (sl: Slide) => {
    const s = pptx.addSlide();
    if (sl.kind === "cover") {
      s.background = { color: DARK };
      const img = sl.image ? images.get(sl.image) : undefined;
      if (img) {
        cover(s, img, SW * 0.48, 0, SW * 0.52, SH);
        s.addShape(pptx.ShapeType.rect, { x: SW * 0.48, y: 0, w: 0.08, h: SH, fill: { color: A }, line: { color: A } });
      } else {
        s.addShape(pptx.ShapeType.ellipse, { x: SW - 4.6, y: -1.6, w: 6, h: 6, fill: { color: A }, line: { color: A } });
        s.addShape(pptx.ShapeType.ellipse, { x: SW - 3.4, y: 4.3, w: 1.9, h: 1.9, fill: { color: A2 }, line: { color: A2 } });
      }
      const tw = img ? SW * 0.48 - M * 2 : CW * 0.7;
      if (sl.kicker) {
        const kw = textWidth(sl.kicker, 13) + 0.5;
        s.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.6, w: kw, h: 0.42, rectRadius: 0.21, fill: { color: A }, line: { color: A } });
        s.addText(sl.kicker, { x: M, y: 1.6, w: kw, h: 0.42, fontFace: FONT, fontSize: 13, bold: true, color: readable(A), align: "center", valign: "middle" });
      }
      // The subtitle starts where the title actually ends.
      const tpt = fitPt(sl.title, tw, 2.7, 40, 22);
      const titleH = Math.min(2.9, (lines(sl.title, tpt, tw) * tpt * 1.35) / 72 + 0.15);
      s.addText(sl.title, { x: M, y: 2.25, w: tw, h: titleH, fontFace: FONT, fontSize: tpt, bold: true, color: "FFFFFF", valign: "top", lineSpacingMultiple: 1.1 });
      if (sl.subtitle) {
        const sy = 2.25 + titleH + 0.2;
        const sh = Math.max(0.6, SH - 1.1 - sy);
        s.addText(sl.subtitle, { x: M, y: sy, w: tw, h: sh, fontFace: FONT, fontSize: fitPt(sl.subtitle, tw, sh, 17, 10), color: "D6DAE1", valign: "top" });
      }
      s.addShape(pptx.ShapeType.rect, { x: M, y: SH - 0.9, w: 0.6, h: 0.06, fill: { color: A }, line: { color: A } });
      n += 1;
      return;
    }
    if (sl.kind === "statement") {
      s.background = { color: n % 2 ? DARK : A };
      const fg = n % 2 ? "FFFFFF" : readable(A);
      if (sl.kicker) s.addText(sl.kicker, { x: M, y: 0.7, w: CW, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: fg, transparency: 25 });
      const [first, ...rest] = sl.text.split("\n");
      const restText = rest.join("\n").trim();
      s.addText(first, { x: M, y: 1.4, w: CW * 0.86, h: restText ? 2.6 : 4.4, fontFace: FONT, fontSize: fitPt(first, CW * 0.86, restText ? 2.6 : 4.4, 46, 22, 1.25), bold: true, color: fg, valign: restText ? "bottom" : "middle", lineSpacingMultiple: 1.15 });
      if (restText) s.addText(restText, { x: M, y: 4.2, w: CW * 0.8, h: 2.3, fontFace: FONT, fontSize: fitPt(restText, CW * 0.8, 2.3, 22, 12, 1.4), color: fg, valign: "top", lineSpacingMultiple: 1.3 });
      if (sl.by) s.addText(`— ${sl.by}`, { x: M, y: 6.3, w: CW, h: 0.4, fontFace: FONT, fontSize: 14, color: fg });
      footer(s, true);
      return;
    }
    if (sl.kind === "image") {
      const img = images.get(sl.image);
      const iw = SW * 0.5;
      if (img) cover(s, img, 0, 0, iw, SH);
      const tx = img ? iw + 0.55 : M;
      const tw = SW - tx - M;
      if (sl.kicker) s.addText(sl.kicker, { x: tx, y: 0.9, w: tw, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: A });
      s.addText(sl.title, { x: tx, y: 1.3, w: tw, h: 2.0, fontFace: FONT, fontSize: fitPt(sl.title, tw, 2.0, 32, 18), bold: true, color: INK, valign: "top" });
      s.addShape(pptx.ShapeType.rect, { x: tx, y: 3.4, w: 0.5, h: 0.06, fill: { color: A }, line: { color: A } });
      if (sl.text) s.addText(sl.text, { x: tx, y: 3.65, w: tw, h: 3.0, fontFace: FONT, fontSize: fitPt(sl.text, tw, 3.0, 18, 11, 1.4), color: BODY, valign: "top", lineSpacingMultiple: 1.3 });
      footer(s);
      return;
    }
    if (sl.kind === "end") {
      s.background = { color: DARK };
      s.addShape(pptx.ShapeType.rect, { x: M, y: 2.8, w: 0.7, h: 0.07, fill: { color: A }, line: { color: A } });
      s.addText(sl.title, { x: M, y: 3.0, w: CW, h: 1.6, fontFace: FONT, fontSize: fitPt(sl.title, CW, 1.6, 40, 22), bold: true, color: "FFFFFF", valign: "top" });
      if (sl.text) s.addText(sl.text, { x: M, y: 4.7, w: CW, h: 1.4, fontFace: FONT, fontSize: fitPt(sl.text, CW, 1.4, 18, 11), color: "C9CED6", valign: "top" });
      footer(s, true);
      return;
    }
    head(s, sl.kicker, sl.title);
    box(s, sl.block, M, TOP, CW, BH);
    if (sl.note) s.addNotes(sl.note);
    footer(s);
  };

  d.slides.forEach(render);
  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
