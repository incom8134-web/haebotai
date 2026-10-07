import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// HAEBOT_A_TOOLS_SPEC.md §4.11 — a real 860px 스마트스토어 detail page,
// rendered with satori + resvg: hero photo, product title band, the
// customer's doubts, three selling points, each section with its own
// photo where one was generated, FAQ and shipping notes. Satori needs
// explicit sizes and can't measure text, so heights are estimated from
// character counts (Hangul ≈ one em wide) with a small safety margin.

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");
const regular = readFileSync(join(FONT_DIR, "Pretendard-Regular.otf"));
const bold = readFileSync(join(FONT_DIR, "Pretendard-Bold.otf"));
const black = readFileSync(join(FONT_DIR, "Pretendard-Black.otf"));

const WIDTH = 860;
const PAD = 64;
const INNER = WIDTH - PAD * 2;

interface SangsepageContent {
  productName: string;
  price?: number | null;
  painPoints: string[];
  usps: string[];
  sections: { order: number; type?: string; headline: string; body: string }[];
  faq: { q: string; a: string }[];
  shipping: string;
  accent: string;
  /** data: URIs — [0] is the hero, the rest go between sections. */
  photos: string[];
}

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style: { display: "flex", ...style }, children } });

/** Estimated rendered height of a text block. */
function textHeight(text: string, fontSize: number, width: number, lineHeight = 1.6): number {
  const perLine = Math.max(8, Math.floor(width / (fontSize * 0.98)));
  const lines = text.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
  return Math.ceil(lines * fontSize * lineHeight);
}

function text(value: string, fontSize: number, opts: { weight?: number; color?: string; width?: number; lineHeight?: number; align?: string } = {}) {
  const width = opts.width ?? INNER;
  return {
    node: el("div", { width, fontSize, fontWeight: opts.weight ?? 400, color: opts.color ?? "#1B1D1F", lineHeight: opts.lineHeight ?? 1.6, whiteSpace: "pre-wrap", textAlign: opts.align ?? "left", justifyContent: opts.align === "center" ? "center" : "flex-start" }, value),
    height: textHeight(value, fontSize, width, opts.lineHeight ?? 1.6),
  };
}

function photo(src: string, height: number): { node: Node; height: number } {
  return { node: { type: "img", props: { src, width: WIDTH, height, style: { objectFit: "cover", width: WIDTH, height } } }, height };
}

export async function renderSangsepage(c: SangsepageContent): Promise<Buffer> {
  const accent = /^#[0-9a-f]{6}$/i.test(c.accent) ? c.accent : "#E84A5F";
  const blocks: { node: Node; height: number }[] = [];

  // Hero
  if (c.photos[0]) blocks.push(photo(c.photos[0], 860));
  const first = c.sections[0];
  const heroParts = [
    text(c.productName, 44, { weight: 900, color: "#FFFFFF", lineHeight: 1.3 }),
    ...(first ? [text(first.headline, 24, { weight: 700, color: "#FFFFFF", lineHeight: 1.45 })] : []),
    ...(c.price ? [text(`${c.price.toLocaleString("ko-KR")}원`, 30, { weight: 900, color: "#FFFFFF" })] : []),
  ];
  blocks.push({
    node: el("div", { flexDirection: "column", gap: 16, width: WIDTH, padding: `56px ${PAD}px`, backgroundColor: accent }, heroParts.map((p) => p.node)),
    height: 112 + heroParts.reduce((h, p) => h + p.height + 16, 0),
  });

  // Doubts
  if (c.painPoints.length) {
    const title = text("이런 고민 있으셨죠?", 34, { weight: 900, align: "center" });
    const items = c.painPoints.map((p) => text(p, 21, { width: INNER - 72, color: "#3A3F44" }));
    blocks.push({
      node: el("div", { flexDirection: "column", alignItems: "center", gap: 18, width: WIDTH, padding: `72px ${PAD}px`, backgroundColor: "#F6F7F8" }, [
        title.node,
        ...items.map((it) => el("div", { width: INNER, gap: 16, alignItems: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 16, padding: "20px 24px" }, [el("div", { width: 32, height: 32, borderRadius: 16, backgroundColor: accent, color: "#FFF", fontSize: 18, fontWeight: 700, alignItems: "center", justifyContent: "center" }, "✓"), it.node])),
      ]),
      height: 144 + title.height + items.reduce((h, it) => h + Math.max(32, it.height) + 40 + 18, 0),
    });
  }

  // Three points
  if (c.usps.length) {
    const title = text("그래서 이렇게 만들었어요", 34, { weight: 900, align: "center" });
    const cards = c.usps.map((u, i) => {
      const label = text(`POINT ${String(i + 1).padStart(2, "0")}`, 16, { weight: 700, color: accent, width: INNER - 64 });
      const body = text(u, 23, { weight: 700, width: INNER - 64, lineHeight: 1.5 });
      return { node: el("div", { flexDirection: "column", gap: 8, width: INNER, padding: "28px 32px", borderRadius: 20, border: `2px solid ${accent}` }, [label.node, body.node]), height: label.height + body.height + 8 + 56 + 4 };
    });
    blocks.push({
      node: el("div", { flexDirection: "column", alignItems: "center", gap: 20, width: WIDTH, padding: `72px ${PAD}px` }, [title.node, ...cards.map((cd) => cd.node)]),
      height: 144 + title.height + cards.reduce((h, cd) => h + cd.height + 20, 0),
    });
  }

  // Sections, with the remaining photos placed after the 2nd and 4th
  const extra = c.photos.slice(1);
  c.sections.slice(1).forEach((s, i) => {
    const num = text(String(s.order).padStart(2, "0"), 18, { weight: 900, color: accent });
    const head = text(s.headline, 32, { weight: 900, lineHeight: 1.4 });
    const body = text(s.body, 21, { color: "#3A3F44", lineHeight: 1.75 });
    blocks.push({
      node: el("div", { flexDirection: "column", gap: 14, width: WIDTH, padding: `64px ${PAD}px`, backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FBF7F4" }, [num.node, head.node, body.node]),
      height: 128 + num.height + head.height + body.height + 28,
    });
    const img = i === 1 ? extra[0] : i === 3 ? extra[1] : undefined;
    if (img) blocks.push(photo(img, 640));
  });

  // FAQ
  if (c.faq.length) {
    const title = text("자주 묻는 질문", 32, { weight: 900 });
    const items = c.faq.map((f) => ({ q: text(`Q. ${f.q}`, 21, { weight: 700 }), a: text(`A. ${f.a}`, 20, { color: "#4A5056" }) }));
    blocks.push({
      node: el("div", { flexDirection: "column", gap: 22, width: WIDTH, padding: `64px ${PAD}px`, backgroundColor: "#F6F7F8" }, [
        title.node,
        ...items.map((it) => el("div", { flexDirection: "column", gap: 8, width: INNER }, [it.q.node, it.a.node])),
      ]),
      height: 128 + title.height + items.reduce((h, it) => h + it.q.height + it.a.height + 8 + 22, 0),
    });
  }

  if (c.shipping) {
    const t = text(c.shipping, 18, { color: "#5B6167", width: INNER - 48 });
    blocks.push({
      node: el("div", { width: WIDTH, padding: `48px ${PAD}px 72px` }, [el("div", { width: INNER, padding: 24, borderRadius: 16, border: "1px solid #E3E6E8" }, [t.node])]),
      height: 120 + t.height + 48 + 2,
    });
  }

  // 3% slack per block absorbs estimation error without big gaps.
  const height = Math.ceil(blocks.reduce((h, b) => h + b.height * 1.03, 0));
  const tree = el("div", { flexDirection: "column", width: WIDTH, height, backgroundColor: "#FFFFFF", fontFamily: "Pretendard" }, blocks.map((b) => ({ ...b.node, props: { ...b.node.props, style: { ...(b.node.props.style as object), flexShrink: 0 } } })));

  const svg = await satori(tree as never, {
    width: WIDTH,
    height,
    fonts: [
      { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      { name: "Pretendard", data: bold, weight: 700, style: "normal" },
      { name: "Pretendard", data: black, weight: 900, style: "normal" },
    ],
  });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng());
}
