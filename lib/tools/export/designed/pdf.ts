import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { fetchAll, fit, imageSize, type FetchedImage } from "../images.ts";
import { chartPng } from "../chart-png.ts";
import { designImages, inlineRuns, parseMarkdown, type Block, type Card, type Design, type Section } from "./model.ts";

// The designed PDF: a cover, then each section laid out for its content
// (an article with its photos, a palette as swatches, ads as cards…).

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");
let fonts: { regular: Buffer; bold: Buffer; heavy: Buffer } | null = null;
function loadFonts() {
  fonts ??= {
    regular: readFileSync(join(FONT_DIR, "Pretendard-Regular.otf")),
    bold: readFileSync(join(FONT_DIR, "Pretendard-Bold.otf")),
    heavy: readFileSync(join(FONT_DIR, "Pretendard-ExtraBold.otf")),
  };
  return fonts;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 54;
const W = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 64;
const INK = "#15181E";
const BODY = "#2E343D";
const MUTED = "#6B7280";
const LINE = "#E4E7EC";
const SOFT = "#F5F6F8";

function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
function readable(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 160 ? INK : "#FFFFFF";
}

/** Emoji have no glyphs in Pretendard and print as boxes; Word and PowerPoint keep them. */
function withoutEmoji<T>(v: T): T {
  if (typeof v === "string") return v.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/ {2,}/g, " ") as T;
  if (Array.isArray(v)) return v.map(withoutEmoji) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "url" || k === "image" || k === "coverImage" ? x : withoutEmoji(x)])) as T;
  return v;
}

export async function buildDesignedPdf(design: Design): Promise<Buffer> {
  const d = withoutEmoji(design);
  const images = await fetchAll(designImages(d));
  const f = loadFonts();
  const pdf = new PDFDocument({ size: "A4", margins: { top: M, bottom: PAGE_H - BOTTOM + 6, left: M, right: M }, bufferPages: true, info: { Title: d.title } });
  pdf.registerFont("r", f.regular);
  pdf.registerFont("b", f.bold);
  pdf.registerFont("h", f.heavy);
  const chunks: Buffer[] = [];
  pdf.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks))));
  const A = d.theme.accent;
  const A2 = d.theme.accent2;

  const newPage = () => {
    pdf.addPage();
    pdf.x = M;
    pdf.y = M;
  };
  const ensure = (h: number) => {
    if (pdf.y + h > BOTTOM) newPage();
  };
  const textH = (text: string, font: string, size: number, width: number, gap = 3) => {
    pdf.font(font).fontSize(size);
    return pdf.heightOfString(text || " ", { width, lineGap: gap });
  };

  /** Text with **bold** runs, wrapped to the width, from (x, y). */
  const rich = (text: string, x: number, y: number, width: number, size: number, color = BODY, gap = 4) => {
    const runs = inlineRuns(text);
    if (!runs.length) return;
    pdf.fillColor(color);
    runs.forEach((r, i) => {
      pdf.font(r.bold ? "b" : "r").fontSize(size);
      const opts = { width, lineGap: gap, continued: i < runs.length - 1 };
      if (i === 0) pdf.text(r.text, x, y, opts);
      else pdf.text(r.text, opts);
    });
  };
  const richH = (text: string, width: number, size: number, gap = 4) => textH(inlineRuns(text).map((r) => r.text).join(""), "b", size, width, gap);

  // Photos fill their box; a very wide or tall image (a logo lockup) is fitted whole on white instead of cropped.
  const photo = (img: FetchedImage, x: number, y: number, w: number, h: number, radius = 10) => {
    const size = imageSize(img);
    const ratio = size.width / size.height;
    const whole = ratio > 1.9 || ratio < 0.55;
    if (whole) pdf.roundedRect(x, y, w, h, radius).fill("#FFFFFF");
    const scale = whole ? Math.min(w / size.width, h / size.height) * 0.92 : Math.max(w / size.width, h / size.height);
    const iw = size.width * scale;
    const ih = size.height * scale;
    pdf.save();
    pdf.roundedRect(x, y, w, h, radius).clip();
    pdf.image(img.data, x - (iw - w) / 2, y - (ih - h) / 2, { width: iw, height: ih });
    pdf.restore();
  };

  // ── Cover ──────────────────────────────────────────────────────────
  const coverImg = d.coverImage ? images.get(d.coverImage) : undefined;
  if (coverImg) {
    const h = PAGE_H * 0.58;
    photo(coverImg, 0, 0, PAGE_W, h, 0);
    const g = pdf.linearGradient(0, h * 0.35, 0, h);
    g.stop(0, d.theme.dark, 0).stop(1, d.theme.dark, 1);
    pdf.rect(0, 0, PAGE_W, h).fill(g);
    pdf.rect(0, h, PAGE_W, PAGE_H - h).fill(d.theme.dark);
  } else {
    pdf.rect(0, 0, PAGE_W, PAGE_H).fill(d.theme.dark);
    pdf.circle(PAGE_W - 40, 120, 210).fillOpacity(0.9).fill(A).fillOpacity(1);
    pdf.circle(PAGE_W - 200, 330, 70).fillOpacity(0.85).fill(A2).fillOpacity(1);
    pdf.circle(90, PAGE_H - 60, 140).fillOpacity(0.18).fill(A).fillOpacity(1);
  }
  {
    // The cover's last line sits below the flow margin; keep it on this page.
    pdf.page.margins.bottom = 0;
    const top = coverImg ? PAGE_H * 0.5 : PAGE_H * 0.42;
    pdf.font("b").fontSize(10);
    const pillW = pdf.widthOfString(d.eyebrow) + 22;
    pdf.roundedRect(M, top, pillW, 22, 11).fill(A);
    pdf.fillColor(readable(A)).text(d.eyebrow, M + 11, top + 6, { lineBreak: false });
    const size = d.title.length > 60 ? 22 : d.title.length > 34 ? 27 : 34;
    pdf.font("h").fontSize(size).fillColor("#FFFFFF").text(d.title, M, top + 40, { width: W, lineGap: 6 });
    if (d.subtitle) {
      pdf.moveDown(0.5);
      pdf.font("r").fontSize(12).fillColor("#FFFFFF").fillOpacity(0.82).text(d.subtitle, M, undefined, { width: W - 40, lineGap: 4 }).fillOpacity(1);
    }
    pdf.rect(M, PAGE_H - 92, 40, 3).fill(A);
    if (d.meta) pdf.font("r").fontSize(10).fillColor("#FFFFFF").fillOpacity(0.75).text(d.meta, M, PAGE_H - 78, { width: W, lineBreak: false }).fillOpacity(1);
  }

  // ── Blocks ─────────────────────────────────────────────────────────
  const paragraph = (text: string, size = 10.5, color = BODY) => {
    for (const para of text.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      const h = richH(t, W, size);
      ensure(Math.min(h, 60) + 6);
      rich(t, M, pdf.y, W, size, color);
      pdf.x = M;
      pdf.moveDown(0.55);
    }
  };

  const bullets = (items: string[], style: "dot" | "check" | "num" = "dot", x = M, width = W, size = 10.5) => {
    items.forEach((it, i) => {
      const h = richH(it, width - 22, size);
      ensure(h + 6);
      const y = pdf.y;
      if (style === "num") {
        pdf.circle(x + 7, y + 7, 7.5).fill(A);
        pdf.font("b").fontSize(8.5).fillColor(readable(A)).text(String(i + 1), x, y + 3, { width: 14, align: "center", lineBreak: false });
      } else if (style === "check") {
        pdf.circle(x + 7, y + 7, 7.5).fill(tint(A2, 0.8));
        pdf.moveTo(x + 3.5, y + 7.2).lineTo(x + 6.2, y + 9.8).lineTo(x + 10.8, y + 4.5).lineWidth(1.6).strokeColor(A2).stroke();
      } else {
        pdf.circle(x + 5, y + 7, 2.4).fill(A);
      }
      rich(it, x + 22, y, width - 22, size);
      pdf.x = M;
      pdf.y = Math.max(pdf.y, y + 15) + 4;
    });
    pdf.moveDown(0.3);
  };

  const chips = (items: string[], label?: string) => {
    if (label) {
      ensure(30);
      pdf.font("b").fontSize(9).fillColor(MUTED).text(label, M, pdf.y, { width: W });
      pdf.moveDown(0.35);
    }
    let x = M;
    let y = pdf.y;
    pdf.font("r").fontSize(9.5);
    for (const it of items) {
      const w = Math.min(W, pdf.widthOfString(it) + 20);
      if (x + w > M + W) {
        x = M;
        y += 26;
      }
      if (y + 22 > BOTTOM) {
        newPage();
        y = pdf.y;
        x = M;
      }
      pdf.roundedRect(x, y, w, 21, 10.5).fill(tint(A, 0.88));
      pdf.font("r").fontSize(9.5).fillColor(INK).text(it, x + 10, y + 5.5, { width: w - 20, lineBreak: false, ellipsis: true });
      x += w + 6;
    }
    pdf.x = M;
    pdf.y = y + 32;
  };

  const callout = (label: string, text: string, tone: "accent" | "warn" | "neutral" = "accent") => {
    const c = tone === "warn" ? "#C2410C" : tone === "neutral" ? "#64748B" : A;
    const h = richH(text, W - 32, 10) + 34;
    ensure(Math.min(h, 140));
    const y = pdf.y;
    pdf.roundedRect(M, y, W, h, 8).fill(tint(c, 0.92));
    pdf.rect(M, y, 3.5, h).fill(c);
    pdf.font("b").fontSize(9).fillColor(c).text(label, M + 16, y + 11, { width: W - 32 });
    rich(text, M + 16, y + 26, W - 32, 10, BODY, 3);
    pdf.x = M;
    pdf.y = y + h + 12;
  };

  const quote = (text: string, by?: string) => {
    const h = textH(text, "b", 14, W - 40, 6) + (by ? 22 : 0) + 20;
    ensure(Math.min(h, 160));
    const y = pdf.y;
    pdf.rect(M, y + 2, 4, h - 16).fill(A);
    pdf.font("h").fontSize(14).fillColor(INK).text(text, M + 22, y + 4, { width: W - 40, lineGap: 6 });
    if (by) pdf.font("r").fontSize(9.5).fillColor(MUTED).text(`— ${by}`, M + 22, undefined, { width: W - 40 });
    pdf.x = M;
    pdf.y = Math.max(pdf.y, y + h - 8) + 12;
  };

  const kv = (items: { label: string; value: string }[]) => {
    for (const it of items) {
      const h = Math.max(textH(it.value, "r", 10.5, W - 120, 3), 14) + 14;
      ensure(h);
      const y = pdf.y;
      pdf.font("b").fontSize(9.5).fillColor(A).text(it.label, M, y + 7, { width: 108 });
      pdf.font("r").fontSize(10.5).fillColor(BODY).text(it.value, M + 118, y + 6, { width: W - 120, lineGap: 3 });
      pdf.moveTo(M, y + h).lineTo(M + W, y + h).lineWidth(0.6).strokeColor(LINE).stroke();
      pdf.x = M;
      pdf.y = y + h;
    }
    pdf.moveDown(0.8);
  };

  const meters = (items: { label: string; value: number }[]) => {
    for (const it of items) {
      ensure(26);
      const y = pdf.y;
      const v = Math.max(0, Math.min(10, it.value));
      pdf.font("b").fontSize(10).fillColor(INK).text(it.label, M, y + 2, { width: 110, lineBreak: false });
      pdf.roundedRect(M + 116, y + 4, W - 160, 9, 4.5).fill(SOFT);
      pdf.roundedRect(M + 116, y + 4, Math.max(9, ((W - 160) * v) / 10), 9, 4.5).fill(A);
      pdf.font("b").fontSize(10).fillColor(A).text(`${v}/10`, M + W - 36, y + 1, { width: 36, align: "right", lineBreak: false });
      pdf.x = M;
      pdf.y = y + 24;
    }
    pdf.moveDown(0.6);
  };

  const swatches = (items: { name: string; hex: string; role?: string; usage?: string }[]) => {
    const cols = items.length <= 3 ? items.length : items.length === 4 ? 4 : 3;
    const gap = 12;
    const cw = (W - gap * (cols - 1)) / cols;
    for (let r = 0; r < items.length; r += cols) {
      const row = items.slice(r, r + cols);
      const textHs = row.map((it) => (it.usage ? textH(it.usage, "r", 8.5, cw - 4, 2) : 0));
      const h = 96 + 46 + Math.max(0, ...textHs);
      ensure(h);
      const y = pdf.y;
      row.forEach((it, i) => {
        const x = M + i * (cw + gap);
        pdf.roundedRect(x, y, cw, 96, 10).fill(it.hex);
        if (it.hex.toUpperCase() === "#FFFFFF" || readable(it.hex) === INK) pdf.roundedRect(x, y, cw, 96, 10).lineWidth(0.6).strokeColor(LINE).stroke();
        pdf.font("b").fontSize(10.5).fillColor(INK).text(it.name, x, y + 104, { width: cw, lineBreak: false, ellipsis: true });
        pdf.font("r").fontSize(9).fillColor(MUTED).text([it.hex, it.role].filter(Boolean).join("  ·  "), x, y + 120, { width: cw, lineBreak: false });
        if (it.usage) pdf.font("r").fontSize(8.5).fillColor(BODY).text(it.usage, x, y + 136, { width: cw - 4, lineGap: 2 });
      });
      pdf.x = M;
      pdf.y = y + h + 6;
    }
  };

  const typeSpec = (items: { role: string; family: string; weight: string; sample: string; why?: string }[]) => {
    for (const it of items) {
      const h = 32 + textH(it.sample, "h", 22, W - 32, 4) + (it.why ? textH(it.why, "r", 9.5, W - 32, 3) + 8 : 0) + 22;
      ensure(h);
      const y = pdf.y;
      pdf.roundedRect(M, y, W, h, 10).fill(SOFT);
      pdf.font("b").fontSize(9).fillColor(A).text(it.role.toUpperCase(), M + 16, y + 14, { width: 80, lineBreak: false });
      pdf.font("b").fontSize(11).fillColor(INK).text([it.family, it.weight].filter(Boolean).join("  ·  "), M + 96, y + 13, { width: W - 112, lineBreak: false, ellipsis: true });
      pdf.font("h").fontSize(22).fillColor(INK).text(it.sample, M + 16, y + 36, { width: W - 32, lineGap: 4 });
      if (it.why) pdf.font("r").fontSize(9.5).fillColor(MUTED).text(it.why, M + 16, undefined, { width: W - 32, lineGap: 3 });
      pdf.x = M;
      pdf.y = y + h + 10;
    }
  };

  const dodont = (b: Extract<Block, { t: "dodont" }>) => {
    const gap = 12;
    const cw = (W - gap) / 2;
    const listH = (xs: string[]) => xs.reduce((a, x) => a + textH(x, "r", 9.5, cw - 44, 3) + 8, 0);
    const h = 40 + Math.max(listH(b.dos), listH(b.donts)) + 8;
    ensure(Math.min(h, 300));
    const y = pdf.y;
    const col = (x: number, title: string, items: string[], good: boolean) => {
      const c = good ? "#15803D" : "#B91C1C";
      pdf.roundedRect(x, y, cw, h, 10).fill(tint(c, 0.93));
      pdf.font("b").fontSize(10.5).fillColor(c).text(`${good ? "✓" : "✕"}  ${title}`, x + 16, y + 14, { width: cw - 32 });
      let yy = y + 38;
      for (const it of items) {
        pdf.circle(x + 20, yy + 6, 2.2).fill(c);
        pdf.font("r").fontSize(9.5).fillColor(BODY).text(it, x + 28, yy, { width: cw - 44, lineGap: 3 });
        yy = pdf.y + 8;
      }
    };
    col(M, b.doTitle, b.dos, true);
    col(M + cw + gap, b.dontTitle, b.donts, false);
    pdf.x = M;
    pdf.y = y + h + 14;
  };

  const cards = (items: Card[], cols: 1 | 2 | 3 | 4) => {
    const gap = 12;
    const cw = (W - gap * (cols - 1)) / cols;
    const imgH = cols === 1 ? 220 : cols === 2 ? 150 : 100;
    const cardH = (c: Card) => {
      let h = 16;
      if (c.image && images.get(c.image)) h += imgH + 10;
      if (c.kicker) h += 14;
      h += textH(c.title, "b", cols >= 3 ? 10.5 : 11.5, cw - 28, 3) + 4;
      if (c.body) h += textH(c.body, "r", 9.5, cw - 28, 3) + 6;
      if (c.swatches?.length) h += 18;
      if (c.footer) h += textH(c.footer, "r", 8.5, cw - 28, 2) + 6;
      return h + 10;
    };
    for (let r = 0; r < items.length; r += cols) {
      const row = items.slice(r, r + cols);
      const h = Math.max(...row.map(cardH));
      ensure(h);
      const y = pdf.y;
      row.forEach((c, i) => {
        const x = M + i * (cw + gap);
        pdf.roundedRect(x, y, cw, h, 12).fill("#FFFFFF");
        pdf.roundedRect(x, y, cw, h, 12).lineWidth(0.8).strokeColor(LINE).stroke();
        let yy = y + 14;
        const img = c.image ? images.get(c.image) : undefined;
        if (img) {
          photo(img, x + 10, y + 10, cw - 20, imgH, 8);
          yy = y + 10 + imgH + 12;
        } else {
          pdf.rect(x + 14, y + 14, 22, 3).fill(i % 2 ? A2 : A);
          yy = y + 24;
        }
        if (c.kicker) {
          pdf.font("b").fontSize(8.5).fillColor(i % 2 && !img ? A2 : A).text(c.kicker, x + 14, yy, { width: cw - 28, lineBreak: false, ellipsis: true });
          yy += 14;
        }
        pdf.font("b").fontSize(cols >= 3 ? 10.5 : 11.5).fillColor(INK).text(c.title, x + 14, yy, { width: cw - 28, lineGap: 3 });
        yy = pdf.y + 4;
        if (c.body) {
          pdf.font("r").fontSize(9.5).fillColor(BODY).text(c.body, x + 14, yy, { width: cw - 28, lineGap: 3 });
          yy = pdf.y + 6;
        }
        if (c.swatches?.length) {
          c.swatches.slice(0, 6).forEach((h2, k) => pdf.circle(x + 21 + k * 18, yy + 7, 6.5).fill(h2));
          yy += 18;
        }
        if (c.footer) pdf.font("r").fontSize(8.5).fillColor(MUTED).text(c.footer, x + 14, yy, { width: cw - 28, lineGap: 2 });
      });
      pdf.x = M;
      pdf.y = y + h + gap;
    }
  };

  const post = (b: Extract<Block, { t: "post" }>) => {
    const pw = Math.min(W, 380);
    const img = b.image ? images.get(b.image) : undefined;
    const textHt = textH(b.text, "r", 10, pw - 32, 4);
    const tagsT = b.tags?.length ? b.tags.join(" ") : "";
    const h = 58 + (img ? pw * 0.75 + 10 : 0) + textHt + (tagsT ? textH(tagsT, "r", 9.5, pw - 32, 3) + 8 : 0) + (b.cta ? 36 : 0) + 18;
    ensure(Math.min(h, BOTTOM - M));
    const y = pdf.y;
    pdf.roundedRect(M, y, pw, h, 14).fill("#FFFFFF");
    pdf.roundedRect(M, y, pw, h, 14).lineWidth(0.8).strokeColor(LINE).stroke();
    pdf.circle(M + 30, y + 28, 14).fill(A);
    pdf.font("b").fontSize(11).fillColor(readable(A)).text(b.name.slice(0, 1), M + 16, y + 21.5, { width: 28, align: "center", lineBreak: false });
    pdf.font("b").fontSize(10.5).fillColor(INK).text(b.name, M + 52, y + 16, { width: pw - 70, lineBreak: false, ellipsis: true });
    pdf.font("r").fontSize(8.5).fillColor(MUTED).text(b.platform, M + 52, y + 31, { width: pw - 70, lineBreak: false, ellipsis: true });
    let yy = y + 54;
    if (img) {
      photo(img, M, yy, pw, pw * 0.75, 0);
      yy += pw * 0.75 + 10;
    }
    pdf.font("r").fontSize(10).fillColor(BODY).text(b.text, M + 16, yy, { width: pw - 32, lineGap: 4 });
    yy = pdf.y + 6;
    if (tagsT) {
      pdf.font("r").fontSize(9.5).fillColor(A).text(tagsT, M + 16, yy, { width: pw - 32, lineGap: 3 });
      yy = pdf.y + 8;
    }
    if (b.cta) {
      pdf.font("b").fontSize(9.5);
      const bw = pdf.widthOfString(b.cta) + 28;
      pdf.roundedRect(M + 16, yy, bw, 24, 12).fill(A);
      pdf.fillColor(readable(A)).text(b.cta, M + 30, yy + 7, { lineBreak: false });
    }
    if (b.note) {
      const nx = M + pw + 16;
      const nw = W - pw - 16;
      if (nw > 90) {
        pdf.font("b").fontSize(8.5).fillColor(MUTED).text("NOTE", nx, y + 6, { width: nw });
        pdf.font("r").fontSize(9).fillColor(BODY).text(b.note, nx, undefined, { width: nw, lineGap: 3 });
      }
    }
    pdf.x = M;
    pdf.y = y + h + 16;
    if (b.note && W - pw - 16 <= 90) callout("NOTE", b.note, "neutral");
  };

  const carousel = (items: { heading: string; text: string }[]) => {
    const cols = 3;
    const gap = 10;
    const cw = (W - gap * (cols - 1)) / cols;
    for (let r = 0; r < items.length; r += cols) {
      ensure(cw + 10);
      const y = pdf.y;
      items.slice(r, r + cols).forEach((it, i) => {
        const k = r + i;
        const x = M + i * (cw + gap);
        const bg = k === 0 ? d.theme.dark : k % 2 ? A : tint(A, 0.86);
        const fg = readable(bg);
        pdf.roundedRect(x, y, cw, cw, 10).fill(bg);
        pdf.font("b").fontSize(8).fillColor(fg).fillOpacity(0.75).text(`${k + 1} / ${items.length}`, x + 12, y + 12, { width: cw - 24, lineBreak: false }).fillOpacity(1);
        pdf.font("h").fontSize(12.5).fillColor(fg).text(it.heading, x + 12, y + 34, { width: cw - 24, lineGap: 3, height: cw * 0.42, ellipsis: true });
        pdf.font("r").fontSize(8.5).fillColor(fg).fillOpacity(0.9).text(it.text, x + 12, Math.max(pdf.y + 6, y + cw * 0.5), { width: cw - 24, lineGap: 2, height: cw * 0.44, ellipsis: true }).fillOpacity(1);
      });
      pdf.x = M;
      pdf.y = y + cw + gap;
    }
    pdf.moveDown(0.4);
  };

  const table = (header: string[], rows: string[][], firstNarrow = false) => {
    const n = Math.max(header.length, ...rows.map((r) => r.length));
    const weights = Array.from({ length: n }, (_, i) => Math.min(40, Math.max(firstNarrow && i === 0 ? 4 : 8, (header[i] ?? "").length * 2, ...rows.map((r) => (r[i] ?? "").length))));
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / total) * W);
    const pad = 7;
    const size = n > 3 ? 8.8 : 9.5;
    const rowH = (cells: string[], font: string) => Math.max(...cells.map((c, i) => textH(c, font, size, widths[i] - pad * 2, 2))) + pad * 2;
    const draw = (cells: string[], y: number, h: number, head: boolean, zebra: boolean) => {
      if (head) pdf.roundedRect(M, y, W, h, 6).fill(d.theme.dark);
      else if (zebra) pdf.rect(M, y, W, h).fill(SOFT);
      let x = M;
      cells.forEach((c, i) => {
        pdf.font(head || i === 0 ? "b" : "r").fontSize(size).fillColor(head ? "#FFFFFF" : i === 0 ? INK : BODY).text(c, x + pad, y + pad, { width: widths[i] - pad * 2, lineGap: 2 });
        x += widths[i];
      });
    };
    const hh = header.some(Boolean) ? rowH(header, "b") : 0;
    ensure(hh + 40);
    let y = pdf.y;
    if (hh) {
      draw(header, y, hh, true, false);
      y += hh;
    }
    rows.forEach((r, ri) => {
      const cells = Array.from({ length: n }, (_, i) => r[i] ?? "");
      const h = rowH(cells, "r");
      if (y + h > BOTTOM) {
        newPage();
        y = pdf.y;
      }
      draw(cells, y, h, false, ri % 2 === 1);
      y += h;
    });
    pdf.x = M;
    pdf.y = y + 14;
  };

  const kpis = (items: { label: string; value: string; note?: string }[]) => {
    const cols = Math.min(3, items.length);
    const gap = 10;
    const cw = (W - gap * (cols - 1)) / cols;
    ensure(80);
    const y = pdf.y;
    items.slice(0, cols).forEach((k, i) => {
      const x = M + i * (cw + gap);
      pdf.roundedRect(x, y, cw, 72, 10).fill(tint(A, 0.9));
      pdf.font("h").fontSize(k.value.length > 10 ? 16 : 22).fillColor(A).text(k.value, x + 14, y + 12, { width: cw - 28, lineBreak: false, ellipsis: true });
      pdf.font("b").fontSize(9).fillColor(INK).text(k.label, x + 14, y + 44, { width: cw - 28, lineBreak: false, ellipsis: true });
      if (k.note) pdf.font("r").fontSize(8).fillColor(MUTED).text(k.note, x + 14, y + 57, { width: cw - 28, lineBreak: false, ellipsis: true });
    });
    pdf.x = M;
    pdf.y = y + 84;
  };

  const image = (u: string, caption?: string, tall?: boolean) => {
    const img = images.get(u);
    if (!img) return;
    const size = fit(imageSize(img), W, tall ? 420 : 300);
    ensure(size.height + (caption ? 22 : 8));
    const x = M + (W - size.width) / 2;
    photo(img, x, pdf.y, size.width, size.height, 10);
    pdf.y += size.height + 6;
    if (caption) {
      pdf.font("r").fontSize(8.5).fillColor(MUTED).text(caption, M, pdf.y, { width: W, align: "center" });
      pdf.moveDown(0.4);
    }
    pdf.x = M;
    pdf.moveDown(0.6);
  };

  const article = (b: Extract<Block, { t: "article" }>) => {
    const lines = parseMarkdown(b.markdown);
    const pending = [...(b.photos ?? [])];
    const placeAfter = (heading: string) => {
      const i = pending.findIndex((p) => p.after && (heading.includes(p.after) || p.after.includes(heading)));
      if (i >= 0) {
        const [p] = pending.splice(i, 1);
        image(p.url, p.caption);
      }
    };
    let headings = 0;
    for (const l of lines) {
      if (l.k === "h") {
        headings += 1;
        const size = l.level === 1 ? 16 : l.level === 2 ? 13.5 : 11.5;
        ensure(textH(l.text, "b", size, W, 3) + 50);
        pdf.moveDown(l.level === 1 ? 0.9 : 0.6);
        if (l.level <= 2) {
          pdf.rect(M, pdf.y + 2, 3, size).fill(A);
          pdf.font("h").fontSize(size).fillColor(INK).text(l.text, M + 12, pdf.y, { width: W - 12, lineGap: 3 });
        } else {
          pdf.font("b").fontSize(size).fillColor(INK).text(l.text, M, pdf.y, { width: W, lineGap: 3 });
        }
        pdf.x = M;
        pdf.moveDown(0.45);
        placeAfter(l.text);
        // A photo whose section wasn't found goes after the next headings in turn.
        if (headings > 1 && pending.length && !pending.some((p) => p.after && lines.some((x) => x.k === "h" && (x.text.includes(p.after) || p.after.includes(x.text))))) {
          const p = pending.shift()!;
          image(p.url, p.caption);
        }
      } else if (l.k === "p") paragraph(l.text, 10.8);
      else if (l.k === "li") bullets([l.text], l.ordered ? "dot" : "dot");
      else if (l.k === "quote") quote(l.text);
      else if (l.k === "rule") {
        ensure(20);
        pdf.moveTo(M + W / 2 - 20, pdf.y + 8).lineTo(M + W / 2 + 20, pdf.y + 8).lineWidth(1).strokeColor(LINE).stroke();
        pdf.y += 20;
      }
    }
    for (const p of pending) image(p.url, p.caption);
  };

  const block = (b: Block) => {
    switch (b.t) {
      case "lead": {
        const h = textH(b.text, "r", 13, W, 6);
        ensure(Math.min(h, 120));
        pdf.font("r").fontSize(13).fillColor(INK).text(b.text, M, pdf.y, { width: W, lineGap: 6 });
        pdf.moveDown(0.9);
        break;
      }
      case "h2":
        ensure(60);
        pdf.moveDown(0.4);
        pdf.font("h").fontSize(14).fillColor(INK).text(b.text, M, pdf.y, { width: W });
        pdf.moveDown(0.4);
        break;
      case "h3":
        // Keep a sub-heading with the start of what follows it.
        ensure(130);
        pdf.moveDown(0.4);
        pdf.font("b").fontSize(11.5).fillColor(INK).text(b.text, M, pdf.y, { width: W });
        pdf.moveDown(0.35);
        break;
      case "p":
        paragraph(b.text);
        break;
      case "article":
        article(b);
        break;
      case "image":
        image(b.url, b.caption, b.tall);
        break;
      case "bullets":
        bullets(b.items, b.style);
        break;
      case "quote":
        quote(b.text, b.by);
        break;
      case "callout":
        callout(b.label, b.text, b.tone);
        break;
      case "chips":
        chips(b.items, b.label);
        break;
      case "swatches":
        swatches(b.items);
        break;
      case "type":
        typeSpec(b.items);
        break;
      case "dodont":
        dodont(b);
        break;
      case "cards":
        cards(b.items, b.cols);
        break;
      case "post":
        post(b);
        break;
      case "carousel":
        carousel(b.items);
        break;
      case "script":
        table([...b.header], b.rows.map((r) => [r.time, r.visual, r.voice]), true);
        break;
      case "kv":
        kv(b.items);
        break;
      case "meters":
        meters(b.items);
        break;
      case "table":
        table(b.header, b.rows);
        break;
      case "kpis":
        kpis(b.items);
        break;
      case "chart": {
        const png = chartPng(b.chart, b.palette);
        if (!png) break;
        const size = fit({ width: png.width, height: png.height }, W, 300);
        ensure(size.height + 40);
        if (b.title) {
          pdf.font("b").fontSize(11).fillColor(INK).text(b.title, M, pdf.y, { width: W, continued: Boolean(b.estimated) });
          if (b.estimated) pdf.font("r").fontSize(9).fillColor("#C2410C").text(`  ${b.estimated}`);
          pdf.moveDown(0.3);
        }
        pdf.image(png.data, M + (W - size.width) / 2, pdf.y, size);
        pdf.y += size.height + 6;
        if (b.caption) pdf.font("r").fontSize(9).fillColor(MUTED).text(b.caption, M, pdf.y, { width: W, align: "center" });
        pdf.x = M;
        pdf.moveDown(0.8);
        break;
      }
    }
  };

  const section = (s: Section, first: boolean) => {
    if (first || s.newPage || pdf.y > BOTTOM - 180) newPage();
    else pdf.moveDown(1.4);
    const y = pdf.y;
    if (s.kicker) {
      pdf.font("b").fontSize(9).fillColor(A).text(s.kicker.toUpperCase(), M, y, { width: W, characterSpacing: 1 });
      pdf.moveDown(0.25);
    }
    pdf.font("h").fontSize(s.title.length > 40 ? 17 : 21).fillColor(INK).text(s.title, M, pdf.y, { width: W, lineGap: 4 });
    pdf.rect(M, pdf.y + 6, 34, 3).fill(A);
    pdf.x = M;
    pdf.y += 20;
    if (s.intro) {
      pdf.font("r").fontSize(10.5).fillColor(MUTED).text(s.intro, M, pdf.y, { width: W, lineGap: 4 });
      pdf.moveDown(0.8);
    }
    s.blocks.forEach(block);
  };

  d.sections.forEach((s, i) => section(s, i === 0));

  // Footer and page numbers (not on the cover).
  const range = pdf.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    pdf.switchToPage(range.start + i);
    pdf.page.margins.bottom = 0;
    pdf.moveTo(M, PAGE_H - 44).lineTo(M + W, PAGE_H - 44).lineWidth(0.5).strokeColor(LINE).stroke();
    pdf.font("r").fontSize(8).fillColor(MUTED).text(d.footer, M, PAGE_H - 36, { width: W - 40, lineBreak: false, ellipsis: true });
    pdf.text(String(i + 1), M + W - 40, PAGE_H - 36, { width: 40, align: "right", lineBreak: false });
  }
  pdf.end();
  return done;
}
