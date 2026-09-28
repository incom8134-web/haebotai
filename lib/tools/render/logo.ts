import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// Logo lockups: the image model draws only the symbol (it can't be
// trusted to spell Hangul), and the brand name is typeset here in
// Pretendard next to it — so the name is always spelled exactly as the
// user typed it, in a real font, at any weight the concept calls for.

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");
const WEIGHTS = { regular: 400, bold: 700, extrabold: 800, black: 900 } as const;
export type LogoWeight = keyof typeof WEIGHTS;
const FILES: Record<LogoWeight, string> = {
  regular: "Pretendard-Regular.otf",
  bold: "Pretendard-Bold.otf",
  extrabold: "Pretendard-ExtraBold.otf",
  black: "Pretendard-Black.otf",
};
let fonts: { name: string; data: Buffer; weight: 400 | 700 | 800 | 900; style: "normal" }[] | null = null;
function loadFonts() {
  fonts ??= (Object.keys(FILES) as LogoWeight[]).map((w) => ({ name: "Pretendard", data: readFileSync(join(FONT_DIR, FILES[w])), weight: WEIGHTS[w], style: "normal" as const }));
  return fonts;
}

const TRACKING = { tight: -2, normal: 0, wide: 6 } as const;
export type LogoTracking = keyof typeof TRACKING;

const WIDTH = 1200;
const HEIGHT = 520;

export async function renderLogoLockup(params: {
  symbol: { data: string; mimeType: string };
  brandName: string;
  color: string;
  weight: LogoWeight;
  tracking: LogoTracking;
}): Promise<Buffer> {
  const { symbol, brandName, weight, tracking } = params;
  const color = /^#[0-9a-f]{6}$/i.test(params.color) ? params.color : "#16181A";
  // Long names get a smaller size so they stay on one line.
  const fontSize = brandName.length > 10 ? 72 : brandName.length > 6 ? 96 : 116;

  const tree = {
    type: "div",
    props: {
      style: { width: WIDTH, height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", gap: 48, backgroundColor: "#FFFFFF", padding: 60 },
      children: [
        { type: "img", props: { src: `data:${symbol.mimeType};base64,${symbol.data}`, width: 300, height: 300, style: { objectFit: "contain" } } },
        {
          type: "span",
          props: {
            style: { fontFamily: "Pretendard", fontSize, fontWeight: WEIGHTS[weight], letterSpacing: TRACKING[tracking], color, lineHeight: 1 },
            children: brandName,
          },
        },
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const svg = await satori(tree, { width: WIDTH, height: HEIGHT, fonts: loadFonts() });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng());
}
