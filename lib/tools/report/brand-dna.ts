import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 브랜드 DNA 스튜디오: the brand board as a document — personality radar,
// positioning, traits (this / not that), voice with sample lines, the
// palette with roles and contrast, type pairing, visual direction,
// taglines and touchpoints.

export const DIMENSIONS = [
  { key: "warmth", ko: "따뜻함", en: "Warmth" },
  { key: "expertise", ko: "전문성", en: "Expertise" },
  { key: "boldness", ko: "대담함", en: "Boldness" },
  { key: "playfulness", ko: "장난기", en: "Playfulness" },
  { key: "premium", ko: "고급스러움", en: "Premium" },
] as const;

export const ROLE_LABELS: Record<string, string> = { primary: "주색", secondary: "보조색", accent: "강조색", neutral: "중립색", background: "배경색" };

const HEX = /^#?([0-9a-f]{6})$/i;
export function normHex(v: string): string | null {
  const m = HEX.exec(v.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** WCAG 2.x relative luminance and contrast ratio. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** The more readable text colour on this background, with its ratio. */
export function textOn(hex: string): { color: "#FFFFFF" | "#111111"; ratio: number } {
  const w = contrast(hex, "#FFFFFF");
  const k = contrast(hex, "#111111");
  return w >= k ? { color: "#FFFFFF", ratio: w } : { color: "#111111", ratio: k };
}

export function readPalette(o: Record<string, unknown>) {
  return objs(o.palette)
    .map((c) => ({ name: str(c.name), hex: normHex(str(c.hex)), role: str(c.role), usage: str(c.usage) }))
    .filter((c): c is { name: string; hex: string; role: string; usage: string } => Boolean(c.hex));
}

export function brandDnaReport(o: Record<string, unknown>, input: Record<string, unknown> = {}): Report {
  const essence = obj(o.essence);
  const arche = obj(o.archetype);
  const dims = obj(o.dimensions);
  const pos = obj(o.positioning);
  const voice = obj(o.voice);
  const type = obj(o.typography);
  const visual = obj(o.visual);
  const msg = obj(o.messaging);
  const palette = readPalette(o);
  const heading = obj(type.heading);
  const body = obj(type.body);
  const sections: ReportSection[] = [];

  sections.push({
    id: "core",
    kicker: "핵심",
    title: str(essence.one_line) || "브랜드 핵심",
    lead: str(o.summary) || undefined,
    blocks: keep([
      {
        type: "chart",
        title: `성격 · ${str(arche.name)}`,
        half: true,
        chart: { kind: "radar", axes: DIMENSIONS.map((d) => d.ko), series: [{ name: str(input.brand_name) || "브랜드", values: DIMENSIONS.map((d) => Math.max(0, Math.min(10, num(dims[d.key])))) }], max: 10 },
      },
      { type: "text", title: "왜 이 원형인가", text: str(arche.why), half: true },
      { type: "callout", label: "포지셔닝", text: str(pos.statement) },
      {
        type: "cards",
        columns: 3,
        items: [
          { title: "목적", lines: [str(essence.purpose)] },
          { title: "약속", lines: [str(essence.promise)] },
          { title: "다른 점", lines: [str(pos.difference)] },
        ].filter((c) => c.lines[0]),
      },
      strs(pos.reasons_to_believe).length > 0 && { type: "bullets", title: "믿을 이유", style: "check", items: strs(pos.reasons_to_believe) },
    ]),
  });

  sections.push({
    id: "personality",
    kicker: "성격",
    title: "이렇게, 이렇게는 아니게",
    blocks: keep([
      { type: "table", header: ["성격", "이렇게", "이렇게는 아님"], rows: objs(o.traits).map((t) => [str(t.trait), str(t.means), str(t.not)]) },
      { type: "table", title: "가치", header: ["가치", "실제로는"], rows: objs(o.values).map((v) => [str(v.value), str(v.in_practice)]) },
    ]),
  });

  sections.push({
    id: "voice",
    kicker: "목소리",
    title: strs(voice.tone_words).join(" · ") || "말투",
    blocks: keep([
      { type: "bullets", title: "이렇게 말해요", style: "check", items: strs(voice.do), half: true },
      { type: "bullets", title: "이렇게는 말하지 않아요", items: strs(voice.dont), half: true },
      { type: "table", title: "상황별 예시", header: ["상황", "문장"], rows: objs(voice.samples).map((s) => [str(s.context), str(s.line)]) },
    ]),
  });

  sections.push({
    id: "look",
    kicker: "모습",
    title: "색과 서체",
    blocks: keep([
      palette.length > 0 && {
        type: "table",
        title: "팔레트",
        header: ["색", "HEX", "역할", "쓰는 곳", "글자 대비"],
        rows: palette.map((c) => {
          const t = textOn(c.hex);
          return [c.name, c.hex, ROLE_LABELS[c.role] ?? c.role, c.usage, `${t.color === "#FFFFFF" ? "흰 글자" : "검은 글자"} ${t.ratio.toFixed(1)}:1`];
        }),
      },
      {
        type: "table",
        title: "서체",
        header: ["용도", "서체", "굵기", "이유"],
        rows: [
          ["제목", str(heading.family), str(heading.weight), str(heading.why)],
          ["본문", str(body.family), str(body.weight), str(body.why)],
        ].filter((r) => r[1]),
      },
      { type: "text", title: `무드 · ${strs(visual.mood_words).join(", ")}`, text: [str(visual.imagery), str(visual.shapes)].filter(Boolean).join("\n") },
      strs(visual.avoid).length > 0 && { type: "bullets", title: "피할 것", items: strs(visual.avoid) },
    ]),
  });

  sections.push({
    id: "messages",
    kicker: "메시지",
    title: "태그라인과 적용",
    blocks: keep([
      { type: "bullets", title: "태그라인 후보", style: "num", items: strs(msg.taglines) },
      { type: "text", title: "한 문단 소개", text: str(msg.elevator_pitch) },
      { type: "bullets", title: "핵심 메시지", items: strs(msg.key_messages) },
      { type: "table", title: "접점별 적용", header: ["접점", "적용"], rows: objs(o.touchpoints).map((t) => [str(t.touchpoint), str(t.apply)]) },
    ]),
  });

  const brandPalette = palette.map((c) => c.hex);
  return {
    palette: brandPalette.length >= 3 ? [...brandPalette, ...PALETTES["brand-dna"]].slice(0, 6) : PALETTES["brand-dna"],
    hero: {
      eyebrow: "브랜드 DNA",
      title: str(input.brand_name) || str(essence.one_line) || "브랜드 보드",
      subtitle: str(essence.one_line) || undefined,
      kpis: [
        str(arche.name) ? { label: "원형", value: str(arche.name) } : null,
        str(heading.family) ? { label: "제목 서체", value: str(heading.family) } : null,
        palette[0] ? { label: "주색", value: palette[0].hex, note: palette[0].name } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
