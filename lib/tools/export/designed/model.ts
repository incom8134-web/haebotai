// Designed exports: a result laid out as the thing it is — a blog post
// reads as an article, a brand board as a guidebook, ads as an ad board —
// instead of every tool's JSON walked into the same outline
// (../document.ts). A composer per tool (./compose/*) turns the run's
// output into this model; the PDF, Word and PowerPoint writers in this
// folder each lay it out for their own job:
//   PDF   — the finished, designed piece (sections in flow)
//   Word  — the same content, clean and editable
//   PPT   — its own slide story (`slides`), not the document chopped up
// Pure: no I/O, so composers are tested without a server.

export type Lang = "ko" | "en";

export interface Theme {
  /** Main color (brand or tool), as #RRGGBB. */
  accent: string;
  /** A second color for variety (cards, rules). */
  accent2: string;
  /** Dark ground for covers and statement slides. */
  dark: string;
}

export interface Card {
  kicker?: string;
  title: string;
  body?: string;
  image?: string;
  footer?: string;
  tag?: string;
  /** Small color dots (a logo concept's palette). */
  swatches?: string[];
}

export type Block =
  /** A large opening paragraph. */
  | { t: "lead"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  /** Body text; **bold** spans are kept. Blank lines separate paragraphs. */
  | { t: "p"; text: string }
  /** An article body in Markdown (## headings, lists, quotes, **bold**), with photos placed after the headings they belong to. */
  | { t: "article"; markdown: string; photos?: { after: string; url: string; caption?: string }[] }
  | { t: "image"; url: string; caption?: string; tall?: boolean }
  | { t: "bullets"; items: string[]; style?: "dot" | "check" | "num" }
  | { t: "quote"; text: string; by?: string }
  | { t: "callout"; label: string; text: string; tone?: "accent" | "warn" | "neutral" }
  | { t: "chips"; label?: string; items: string[] }
  | { t: "swatches"; items: { name: string; hex: string; role?: string; usage?: string }[] }
  | { t: "type"; items: { role: string; family: string; weight: string; sample: string; why?: string }[] }
  | { t: "dodont"; doTitle: string; dontTitle: string; dos: string[]; donts: string[] }
  | { t: "cards"; cols: 1 | 2 | 3; items: Card[] }
  /** A social post as it would look in the feed. */
  | { t: "post"; platform: string; name: string; image?: string; text: string; tags?: string[]; cta?: string; note?: string }
  /** Carousel / card-news slides as square tiles. */
  | { t: "carousel"; items: { heading: string; text: string }[] }
  | { t: "script"; header: [string, string, string]; rows: { time: string; visual: string; voice: string }[] }
  | { t: "kv"; items: { label: string; value: string }[] }
  /** 1–10 scores, drawn as bars. */
  | { t: "meters"; items: { label: string; value: number }[] }
  | { t: "table"; header: string[]; rows: string[][] }
  | { t: "kpis"; items: { label: string; value: string; note?: string }[] };

export interface Section {
  title: string;
  kicker?: string;
  intro?: string;
  blocks: Block[];
  /** Start this section on a new page (PDF, Word). */
  newPage?: boolean;
}

/** One slide: a title and one main block laid out to fill it. */
export type Slide =
  | { kind: "cover"; title: string; subtitle?: string; kicker?: string; image?: string }
  | { kind: "statement"; text: string; kicker?: string; by?: string }
  | { kind: "image"; title: string; image: string; text?: string; kicker?: string }
  | { kind: "block"; title: string; kicker?: string; block: Block; note?: string }
  | { kind: "end"; title: string; text?: string };

export interface Design {
  lang: Lang;
  theme: Theme;
  /** Kind of document, e.g. "브랜드 가이드북". */
  eyebrow: string;
  title: string;
  subtitle?: string;
  coverImage?: string;
  /** Small line on the cover: brand · date. */
  meta?: string;
  sections: Section[];
  /** Word gets these instead of `sections` when the editable version should differ (a blog's clean manuscript). */
  docSections?: Section[];
  slides: Slide[];
  /** Footer label on every page/slide. */
  footer: string;
}

/** Bilingual label helper for composers. */
export const tr = (lang: Lang) => (ko: string, en: string) => (lang === "en" ? en : ko);

const HEX = /^#?[0-9a-f]{6}$/i;
export function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v.trim()) ? `#${v.trim().replace(/^#/, "").toUpperCase()}` : fallback;
}

/** Every image URL a design uses, so writers can fetch them once. */
export function designImages(d: Design): string[] {
  const out: string[] = [];
  const add = (u?: string) => {
    if (u) out.push(u);
  };
  add(d.coverImage);
  const walk = (b: Block) => {
    if (b.t === "image") add(b.url);
    if (b.t === "article") b.photos?.forEach((p) => add(p.url));
    if (b.t === "cards") b.items.forEach((c) => add(c.image));
    if (b.t === "post") add(b.image);
  };
  for (const s of [...d.sections, ...(d.docSections ?? [])]) s.blocks.forEach(walk);
  for (const s of d.slides) {
    if (s.kind === "cover" || s.kind === "image") add(s.image);
    if (s.kind === "block") walk(s.block);
  }
  return [...new Set(out)];
}

/** Markdown inline: **bold** runs, other markers dropped. */
export function inlineRuns(text: string): { text: string; bold: boolean }[] {
  const clean = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1").replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2").replace(/`([^`]+)`/g, "$1");
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__/g;
  let last = 0;
  for (let m = re.exec(clean); m; m = re.exec(clean)) {
    if (m.index > last) out.push({ text: clean.slice(last, m.index), bold: false });
    out.push({ text: m[1] ?? m[2], bold: true });
    last = m.index + m[0].length;
  }
  if (last < clean.length) out.push({ text: clean.slice(last), bold: false });
  return out.filter((r) => r.text);
}

export type MdLine =
  | { k: "h"; level: 1 | 2 | 3; text: string }
  | { k: "p"; text: string }
  | { k: "li"; text: string; ordered: boolean; n: number }
  | { k: "quote"; text: string }
  | { k: "rule" };

/** Markdown body into lines a writer can lay out (paragraph lines joined). */
export function parseMarkdown(md: string): MdLine[] {
  const out: MdLine[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ k: "p", text: para.join(" ").trim() });
    para = [];
  };
  let n = 0;
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flush();
      n = 0;
    } else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      out.push({ k: "h", level: Math.min(3, Math.max(1, m[1].length - 1)) as 1 | 2 | 3, text: m[2].replace(/\*\*/g, "").trim() });
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      flush();
      out.push({ k: "rule" });
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      flush();
      out.push({ k: "li", text: m[1], ordered: false, n: 0 });
    } else if ((m = line.match(/^(\d+)[.)]\s+(.*)$/))) {
      flush();
      n += 1;
      out.push({ k: "li", text: m[2], ordered: true, n });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      out.push({ k: "quote", text: m[1] });
    } else {
      para.push(line);
    }
  }
  flush();
  return out;
}

/** Plain text of a Markdown string (for summaries and slide text). */
export function plain(text: string): string {
  return inlineRuns(text.replace(/^#+\s*/gm, "").replace(/^[-*>]\s*/gm, ""))
    .map((r) => r.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first sentences of a text, up to `max` characters, ending cleanly. */
export function excerpt(text: string, max: number): string {
  const t = plain(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다. "), cut.lastIndexOf("요. "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max * 0.5 ? cut.slice(0, end + 1).trim() : `${cut.replace(/\s+\S*$/, "")}…`;
}
