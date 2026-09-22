import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// HAEBOT_A_TOOLS_SPEC.md §4.11 / Part 6 T7 — "rendered at 860px 네이버
// 스마트스토어 규격 through the satori pipeline." Satori needs a font
// buffer to render any text at all (unlike a browser, it has none built
// in) and is the one engine here that wraps Korean text correctly inside
// a fixed-width box — raw SVG <text> doesn't wrap at all. Pretendard
// ships real static .otf files via npm, so no font asset had to be
// vendored into the repo by hand.

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");
const regular = readFileSync(join(FONT_DIR, "Pretendard-Regular.otf"));
const bold = readFileSync(join(FONT_DIR, "Pretendard-Bold.otf"));

const WIDTH = 860;
const SECTION_HEIGHT = 320;

export interface RenderableSection {
  order: number;
  headline: string;
  body: string;
}

// ponytail: one fixed height per section keeps this to a single satori
// pass (no content-measuring second pass). Upgrade path if a real
// model's body text runs long: measure with a first pass, then render at
// the real height.
export async function renderSangsepage(sections: RenderableSection[]): Promise<string> {
  const height = sections.length * SECTION_HEIGHT;

  const tree = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        height,
        backgroundColor: "#ffffff",
      },
      children: sections.map((s, i) => ({
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: WIDTH,
            height: SECTION_HEIGHT,
            padding: "48px 56px",
            backgroundColor: i % 2 === 0 ? "#F7F7F8" : "#FFFFFF",
          },
          children: [
            {
              type: "span",
              props: {
                style: { fontSize: 14, fontWeight: 700, color: "#4D7CFE", letterSpacing: 2 },
                children: `0${s.order}`,
              },
            },
            {
              type: "span",
              props: {
                style: { fontSize: 32, fontWeight: 700, color: "#0E1011", marginTop: 12 },
                children: s.headline,
              },
            },
            {
              type: "span",
              props: {
                style: { fontSize: 18, color: "#5B6167", marginTop: 16, lineHeight: 1.6 },
                children: s.body,
              },
            },
          ],
        },
      })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const svg = await satori(tree, {
    width: WIDTH,
    height,
    fonts: [
      { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      { name: "Pretendard", data: bold, weight: 700, style: "normal" },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}
