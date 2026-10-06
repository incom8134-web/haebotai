// Renders every logo asset from the AI 해바 mark (public/brand/haeba-mark-source.png:
// the gradient H with the rising sun over the 지니에듀테크 gem, transparent,
// square). Run: node scripts/brand/render-brand.mjs
// Outputs: public/brand/haeba-mark-64/128/256/512.png, app/icon.png,
// app/apple-icon.png, app/sublogo.png, app/fulllogo.png, app/opengraph-image.jpg.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "public/brand/haeba-mark-source.png");
const FONTS = ["Pretendard-Bold.otf", "Pretendard-ExtraBold.otf", "Pretendard-Medium.otf", "Pretendard-Regular.otf"].map((f) => join(ROOT, "node_modules/pretendard/dist/public/static", f));

const SUN = "#F26B1D"; // the warm end of the mark
const BLUE = "#3B4FE0"; // the cool end of the mark
const INK = "#1C1814";
const PAPER = "#FAF8F5";

const mark = readFileSync(SOURCE);
const markAt = (size) => sharp(mark).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
/** The mark centred on a square canvas, `scale` of its side. */
async function onSquare(side, scale, background) {
  const inner = await markAt(Math.round(side * scale));
  return sharp({ create: { width: side, height: side, channels: 4, background } }).composite([{ input: inner, gravity: "center" }]).png().toBuffer();
}
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const svgPng = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Pretendard" } }).render().asPng();

// In-app mark (components/brand-mark.tsx) and app icons.
for (const s of [64, 128, 256, 512]) writeFileSync(join(ROOT, `public/brand/haeba-mark-${s}.png`), await markAt(s));
writeFileSync(join(ROOT, "app/icon.png"), await markAt(256));
// Apple touch icons can't be transparent: the mark on white, with room around it.
writeFileSync(join(ROOT, "app/apple-icon.png"), await sharp(await onSquare(180, 0.78, { r: 255, g: 255, b: 255, alpha: 1 })).flatten({ background: "#ffffff" }).png().toBuffer());
// Square mark with breathing room (print and store listings).
writeFileSync(join(ROOT, "app/sublogo.png"), await onSquare(1254, 0.82, clear));

// Full logo: mark + wordmark on paper.
const full = svgPng(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" width="1774" height="887">
  <rect width="1774" height="887" fill="${PAPER}"/>
  <text x="790" y="535" font-family="Pretendard" font-weight="800" font-size="236" fill="${INK}" letter-spacing="-6">AI 해바</text></svg>`, 1774);
writeFileSync(join(ROOT, "app/fulllogo.png"), await sharp(full).composite([{ input: await markAt(440), left: 300, top: 224 }]).png().toBuffer());

// Social share image (1200×630): warm paper, the mark, the promise.
const og = svgPng(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SUN}"/><stop offset="1" stop-color="${BLUE}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="${PAPER}"/>
  <circle cx="1060" cy="700" r="420" fill="url(#glow)" opacity="0.10"/>
  <circle cx="1060" cy="700" r="300" fill="url(#glow)" opacity="0.14"/>
  <text x="236" y="182" font-family="Pretendard" font-weight="800" font-size="64" fill="${INK}" letter-spacing="-1.5">AI 해바</text>
  <text x="88" y="330" font-family="Pretendard" font-weight="800" font-size="58" fill="${INK}" letter-spacing="-1.5">아이디어를 사업으로,</text>
  <text x="88" y="408" font-family="Pretendard" font-weight="800" font-size="58" fill="${SUN}" letter-spacing="-1.5">결과물까지 끝내는 AI 스튜디오</text>
  <text x="88" y="486" font-family="Pretendard" font-weight="500" font-size="28" fill="#554D45">발견 · 브랜드 · 캠페인 · 문서 · 리서치 — 전문 도구들이 결과를 이어 받습니다</text>
  <text x="88" y="532" font-family="Pretendard" font-weight="400" font-size="24" fill="#675F57">From idea to brand, sales and operations — tools that hand results forward</text></svg>`, 1200);
writeFileSync(join(ROOT, "app/opengraph-image.jpg"), await sharp(og).composite([{ input: await markAt(130), left: 88, top: 86 }]).flatten({ background: PAPER }).jpeg({ quality: 90 }).toBuffer());
console.log("brand assets written");
