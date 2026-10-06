// Renders every logo asset from one vector source (해바: a smiling sun with
// sunflower petals — 해 = sun — in Haeba Sun colours). Run: node scripts/brand/render-brand.mjs
// Outputs: public/brand/mark.svg + haeba-64/128/256.png, app/icon.png,
// app/apple-icon.png, app/sublogo.png, app/fulllogo.png, app/opengraph-image.jpg.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = process.cwd();
const FONTS = ["Pretendard-Bold.otf", "Pretendard-ExtraBold.otf", "Pretendard-Medium.otf", "Pretendard-Regular.otf"].map((f) => join(ROOT, "node_modules/pretendard/dist/public/static", f));

const SUN_A = "#FB8B3C"; // sunrise
const SUN_B = "#B8390B"; // ember
const INK = "#1C1814";
const PAPER = "#FAF8F5";

/** The mark's inner drawing on a 1000×1000 canvas: 해바, a smiling sun —
 *  twelve rounded petals (해바라기, the sunflower) around a white face. */
const glyph = (fill = "#fff", face = SUN_B) => `
  <g fill="${fill}">
    ${Array.from({ length: 12 }, (_, i) => `<rect x="458" y="150" width="84" height="178" rx="42" transform="rotate(${i * 30} 500 500)"/>`).join("")}
    <circle cx="500" cy="500" r="138"/>
  </g>
  <g fill="${face}">
    <circle cx="453" cy="476" r="17"/>
    <circle cx="547" cy="476" r="17"/>
  </g>
  <path d="M440 530 Q500 582 560 530" fill="none" stroke="${face}" stroke-width="22" stroke-linecap="round"/>`;

const defs = `
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${SUN_A}"/>
      <stop offset="1" stop-color="${SUN_B}"/>
    </linearGradient>
  </defs>`;

/** App-icon mark: rounded square (or full bleed for Apple) with the glyph. */
const markSvg = ({ fullBleed = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">${defs}
  <rect x="0" y="0" width="1000" height="1000" rx="${fullBleed ? 0 : 228}" fill="url(#sun)"/>
  ${glyph()}
</svg>`;

function png(svg, width, background) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: width }, background, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Pretendard" } });
  return r.render().asPng();
}

const mark = markSvg();
writeFileSync(join(ROOT, "public/brand/mark.svg"), mark);
for (const s of [64, 128, 256]) writeFileSync(join(ROOT, `public/brand/haeba-${s}.png`), png(mark, s));
writeFileSync(join(ROOT, "app/icon.png"), png(mark, 256));
writeFileSync(join(ROOT, "app/apple-icon.png"), await sharp(png(markSvg({ fullBleed: true }), 180)).flatten({ background: SUN_B }).png().toBuffer());
// Square mark with breathing room (used for print and store listings).
writeFileSync(join(ROOT, "app/sublogo.png"), png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254" width="1254" height="1254"><g transform="translate(192 192) scale(0.87)">${mark.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></svg>`, 1254));

// Full logo: mark + wordmark on paper.
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" width="1774" height="887">${defs}
  <rect width="1774" height="887" fill="${PAPER}"/>
  <g transform="translate(300 233) scale(0.42)"><rect width="1000" height="1000" rx="228" fill="url(#sun)"/>${glyph()}</g>
  <text x="790" y="535" font-family="Pretendard" font-weight="800" font-size="236" fill="${INK}" letter-spacing="-6">AI 해바</text>
</svg>`;
writeFileSync(join(ROOT, "app/fulllogo.png"), png(full, 1774));

// Social share image (1200×630): warm paper, the mark, the promise.
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">${defs}
  <rect width="1200" height="630" fill="${PAPER}"/>
  <circle cx="1060" cy="700" r="420" fill="url(#sun)" opacity="0.14"/>
  <circle cx="1060" cy="700" r="300" fill="url(#sun)" opacity="0.18"/>
  <circle cx="1060" cy="700" r="180" fill="url(#sun)" opacity="0.9"/>
  <g transform="translate(88 96) scale(0.13)"><rect width="1000" height="1000" rx="228" fill="url(#sun)"/>${glyph()}</g>
  <text x="236" y="182" font-family="Pretendard" font-weight="800" font-size="64" fill="${INK}" letter-spacing="-1.5">AI 해바</text>
  <text x="88" y="330" font-family="Pretendard" font-weight="800" font-size="58" fill="${INK}" letter-spacing="-1.5">아이디어를 사업으로,</text>
  <text x="88" y="408" font-family="Pretendard" font-weight="800" font-size="58" fill="${SUN_B}" letter-spacing="-1.5">결과물까지 끝내는 AI 스튜디오</text>
  <text x="88" y="486" font-family="Pretendard" font-weight="500" font-size="28" fill="#554D45">발견 · 브랜드 · 캠페인 · 문서 · 리서치 — 전문 도구들이 결과를 이어 받습니다</text>
  <text x="88" y="532" font-family="Pretendard" font-weight="400" font-size="24" fill="#675F57">From idea to brand, sales and operations — tools that hand results forward</text>
</svg>`;
writeFileSync(join(ROOT, "app/opengraph-image.jpg"), await sharp(png(og, 1200)).jpeg({ quality: 90 }).toBuffer());
console.log("brand assets written");
