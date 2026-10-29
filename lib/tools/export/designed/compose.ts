import { excerpt, hex, parseMarkdown, plain, tr, type Block, type Card, type Design, type Lang, type Section, type Slide, type Theme } from "./model.ts";
import { buildReport } from "../../report/index.ts";
import { localizeLabels } from "../../report/localize.ts";
import type { Report, ReportBlock } from "../../report/types.ts";

// One composer per tool: the run's output laid out as the thing it is.
// Labels follow the run's result language (input._output_lang).

export interface ComposeContext {
  toolId: string;
  output: unknown;
  input: Record<string, unknown> | null;
  lang: Lang;
  brandName: string | null;
  brandColors?: string[];
  createdAt: string | null;
  toolName: { ko: string; en: string };
}

type O = Record<string, unknown>;
const obj = (v: unknown): O => (v && typeof v === "object" && !Array.isArray(v) ? (v as O) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const objs = (v: unknown): O[] => arr(v).filter((x): x is O => Boolean(x) && typeof x === "object" && !Array.isArray(x));
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const strs = (v: unknown): string[] => arr(v).map(s).filter(Boolean);
const url = (v: unknown): string | undefined => {
  const u = typeof v === "string" ? v : s(obj(v).url);
  return /^https?:\/\//.test(u) ? u : undefined;
};

const DEFAULT: Theme = { accent: "#2F5BEA", accent2: "#16A37F", dark: "#0F1726" };

function themeFrom(colors: string[], fallback: Theme = DEFAULT): Theme {
  const c = colors.map((x) => hex(x, "")).filter(Boolean);
  if (!c.length) return fallback;
  // The darkest color makes the dark ground; the most saturated mid tone leads.
  const lum = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  const sat = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  const usable = c.filter((h) => lum(h) > 35 && lum(h) < 215);
  const ranked = (usable.length ? usable : c).slice().sort((a, b) => sat(b) - sat(a));
  const accent = ranked[0] ?? fallback.accent;
  const accent2 = ranked.find((h) => h !== accent) ?? fallback.accent2;
  const darkest = c.slice().sort((a, b) => lum(a) - lum(b))[0];
  return { accent, accent2, dark: darkest && lum(darkest) < 70 ? darkest : fallback.dark };
}

function dateLine(createdAt: string | null, lang: Lang): string {
  const d = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return lang === "en" ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function meta(ctx: ComposeContext): string {
  return [ctx.brandName, dateLine(ctx.createdAt, ctx.lang)].filter(Boolean).join("  ·  ");
}

// ── Blog: an article, a clean manuscript, and card-news slides ──────────

const PLATFORM: Record<string, [string, string]> = { naver: ["네이버 블로그", "Naver Blog"], tistory: ["티스토리", "Tistory"], brunch: ["브런치", "Brunch"], wordpress: ["워드프레스", "WordPress"] };

function composeBlog(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const titles = strs(o.titles);
  const title = titles[0] || s(ctx.input?.topic) || t("블로그 원고", "Blog post");
  let body = s(o.body_markdown);
  // The body often opens with the title again as an H1.
  body = body.replace(/^#\s+.*\n+/, (m) => (plain(m) === plain(title) || m.length < 120 ? "" : m));
  const slots = objs(o.image_slots);
  const photos = slots.flatMap((sl) => {
    const u = url(sl.image_url) ?? url(sl.image);
    return u ? [{ after: s(sl.after_section), url: u, caption: s(sl.purpose) || undefined }] : [];
  });
  const cover = photos[0]?.url;
  const platform = PLATFORM[s(ctx.input?.platform)] ?? [t("블로그", "Blog"), "Blog"];
  const eyebrow = ctx.lang === "en" ? `${platform[1]} post` : `${platform[0]} 원고`;
  const tags = strs(o.hashtags).map((h) => (h.startsWith("#") ? h : `#${h}`));
  const meta_ = s(o.meta_description);
  // Titles only — grounding links are long redirect URLs.
  const sources = objs(o.sources).map((x) => s(x.title) || s(x.url)).filter(Boolean);
  const chars = typeof o.char_count === "number" ? o.char_count : plain(body).length;

  const checklist: Section = {
    title: t("발행 전 확인", "Before you publish"),
    kicker: t("체크리스트", "Checklist"),
    newPage: true,
    blocks: [
      ...(meta_ ? [{ t: "callout", label: t("검색 설명문 (메타 설명)", "Search description"), text: meta_, tone: "accent" } as Block] : []),
      ...(tags.length ? [{ t: "chips", label: t("해시태그 — 그대로 복사해 붙이세요", "Hashtags — copy as is"), items: tags } as Block] : []),
      ...(titles.length > 1 ? [{ t: "h3", text: t("다른 제목 후보", "Other title options") } as Block, { t: "bullets", items: titles.slice(1), style: "num" } as Block] : []),
      { t: "kv", items: [{ label: t("글자 수", "Length"), value: ctx.lang === "en" ? `${chars.toLocaleString()} characters` : `${chars.toLocaleString()}자` }, { label: t("사진", "Photos"), value: ctx.lang === "en" ? `${photos.length}` : `${photos.length}장` }, { label: t("올릴 곳", "Platform"), value: ctx.lang === "en" ? platform[1] : platform[0] }] },
      { t: "bullets", style: "check", items: [t("가격·날짜·연락처 같은 사실을 한 번 더 확인했나요?", "Double-checked prices, dates and contact details?"), t("사진은 본문 속 자리에 맞게 올렸나요?", "Placed each photo where it belongs in the text?"), t("첫 문단에 핵심 키워드가 들어 있나요?", "Is the main keyword in the first paragraph?")] },
      ...(sources.length ? [{ t: "h3", text: t("참고한 자료", "Sources") } as Block, { t: "bullets", items: sources } as Block] : []),
    ],
  };

  const sections: Section[] = [{ title, blocks: [...(meta_ ? [{ t: "lead", text: meta_ } as Block] : []), { t: "article", markdown: body, photos: photos.slice(cover ? 1 : 0) }, ...(tags.length ? [{ t: "chips", items: tags } as Block] : [])] }, checklist];
  // Word: the manuscript to paste — no lead, every photo in place.
  const docSections: Section[] = [{ title, blocks: [{ t: "article", markdown: body, photos }, ...(tags.length ? [{ t: "p", text: tags.join(" ") } as Block] : [])] }, checklist];

  // Card news: one slide per part of the post.
  const parts: { heading: string; text: string }[] = [];
  let cur: { heading: string; text: string } | null = null;
  for (const line of parseMarkdown(body)) {
    if (line.k === "h" && line.level <= 2) {
      if (cur) parts.push(cur);
      cur = { heading: line.text, text: "" };
    } else if (cur && (line.k === "p" || line.k === "li" || line.k === "quote")) cur.text += ` ${line.text}`;
  }
  if (cur) parts.push(cur);
  const photoFor = (heading: string) => photos.find((p) => p.after && (heading.includes(p.after) || p.after.includes(heading)))?.url;
  const slides: Slide[] = [
    { kind: "cover", title, subtitle: meta_ || undefined, kicker: eyebrow, image: cover },
    ...parts.slice(0, 8).map((p, i): Slide => {
      const img = photoFor(p.heading) ?? (i > 0 ? photos[i]?.url : undefined);
      return img ? { kind: "image", kicker: `${String(i + 1).padStart(2, "0")}`, title: p.heading, image: img, text: excerpt(p.text, 160) } : { kind: "block", kicker: `${String(i + 1).padStart(2, "0")}`, title: p.heading, block: { t: "p", text: excerpt(p.text, 260) } };
    }),
    { kind: "end", title: t("끝까지 읽어 주셔서 고마워요", "Thanks for reading"), text: tags.slice(0, 8).join("  ") },
  ];
  return { lang: ctx.lang, theme: themeFrom(ctx.brandColors ?? []), eyebrow, title, subtitle: meta_ || undefined, coverImage: cover, meta: meta(ctx), sections, docSections, slides, footer: title };
}

// ── Brand DNA: a brand guidebook ─────────────────────────────────────────

const DIM: Record<string, [string, string]> = { warmth: ["따뜻함", "Warmth"], expertise: ["전문성", "Expertise"], boldness: ["대담함", "Boldness"], playfulness: ["유쾌함", "Playfulness"], premium: ["고급스러움", "Premium"] };
const ROLE: Record<string, [string, string]> = { primary: ["메인", "Primary"], secondary: ["보조", "Secondary"], accent: ["강조", "Accent"], neutral: ["중립", "Neutral"], background: ["배경", "Background"] };

function composeBrandDna(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const ess = obj(o.essence), arch = obj(o.archetype), pos = obj(o.positioning), voice = obj(o.voice), vis = obj(o.visual), msg = obj(o.messaging), typo = obj(o.typography);
  const name = ctx.brandName || s(ctx.input?.brand_name) || t("브랜드", "Brand");
  const palette = objs(o.palette).map((p) => ({ name: s(p.name), hex: hex(p.hex, "#888888"), role: ROLE[s(p.role)] ? t(ROLE[s(p.role)][0], ROLE[s(p.role)][1]) : s(p.role), usage: s(p.usage) }));
  const theme = themeFrom(palette.map((p) => p.hex));
  const dims = obj(o.dimensions);
  const meters = Object.keys(DIM).filter((k) => typeof dims[k] === "number").map((k) => ({ label: t(DIM[k][0], DIM[k][1]), value: Number(dims[k]) }));
  const traits: Card[] = objs(o.traits).map((x) => ({ title: s(x.trait), body: s(x.means), footer: s(x.not) ? `${t("이건 아니에요", "Not")}: ${s(x.not)}` : undefined }));
  const values: Card[] = objs(o.values).map((x) => ({ title: s(x.value), body: s(x.in_practice) }));
  const samples: Card[] = objs(voice.samples).map((x) => ({ kicker: s(x.context), title: `“${s(x.line)}”` }));
  const sample = ctx.lang === "en" ? name : `${name} — 다정한 하루의 끝`;
  const fonts = ["heading", "body"].map((k) => obj(typo[k])).filter((f) => s(f.family)).map((f, i) => ({ role: i === 0 ? t("제목", "Headings") : t("본문", "Body"), family: s(f.family), weight: s(f.weight), sample: i === 0 ? sample : t("오늘 하루도 수고했어요. 따뜻한 한 잔 내려 드릴게요.", "You made it through today. Let us pour you something warm."), why: s(f.why) }));
  const taglines: Card[] = strs(msg.taglines).map((x, i) => ({ kicker: `${t("슬로건", "Tagline")} ${i + 1}`, title: x }));
  const touch: Card[] = objs(o.touchpoints).map((x) => ({ title: s(x.touchpoint), body: s(x.apply) }));

  const sections: Section[] = [
    { title: t("브랜드의 핵심", "The core"), kicker: "01", blocks: [{ t: "lead", text: s(o.summary) || s(ess.one_line) }, { t: "kv", items: [{ label: t("한 줄 정의", "In one line"), value: s(ess.one_line) }, { label: t("존재 이유", "Purpose"), value: s(ess.purpose) }, { label: t("약속", "Promise"), value: s(ess.promise) }].filter((x) => x.value) }, ...(s(arch.name) ? [{ t: "callout", label: `${t("브랜드 원형", "Archetype")} · ${s(arch.name)}`, text: s(arch.why), tone: "accent" } as Block] : [])] },
    { title: t("브랜드의 성격", "Personality"), kicker: "02", blocks: [...(meters.length ? [{ t: "meters", items: meters } as Block] : []), ...(traits.length ? [{ t: "cards", cols: traits.length > 3 ? 2 : 3, items: traits } as Block] : []), ...(values.length ? [{ t: "h3", text: t("지키는 가치", "Values we keep") } as Block, { t: "cards", cols: 2, items: values } as Block] : [])] },
    { title: t("포지셔닝", "Positioning"), kicker: "03", blocks: [...(s(pos.statement) ? [{ t: "quote", text: s(pos.statement) } as Block] : []), { t: "kv", items: [{ label: t("누구를 위해", "For"), value: s(pos.for_whom) }, { label: t("무엇으로", "Category"), value: s(pos.category) }, { label: t("무엇이 다른가", "Difference"), value: s(pos.difference) }].filter((x) => x.value) }, ...(strs(pos.reasons_to_believe).length ? [{ t: "h3", text: t("믿을 수 있는 이유", "Reasons to believe") } as Block, { t: "bullets", style: "check", items: strs(pos.reasons_to_believe) } as Block] : [])] },
    { title: t("말투와 목소리", "Voice"), kicker: "04", blocks: [...(strs(voice.tone_words).length ? [{ t: "chips", label: t("말투를 한 단어로", "Our tone in words"), items: strs(voice.tone_words) } as Block] : []), { t: "dodont", doTitle: t("이렇게 말해요", "Do"), dontTitle: t("이렇게는 말하지 않아요", "Don't"), dos: strs(voice.do), donts: strs(voice.dont) }, ...(samples.length ? [{ t: "h3", text: t("상황별 예문", "Sample lines") } as Block, { t: "cards", cols: 1, items: samples } as Block] : [])] },
    { title: t("색", "Color"), kicker: "05", newPage: true, blocks: [{ t: "swatches", items: palette }] },
    ...(fonts.length ? [{ title: t("글꼴", "Typography"), kicker: "06", blocks: [{ t: "type", items: fonts } as Block] }] : []),
    { title: t("보이는 모습", "Look & feel"), kicker: "07", blocks: [...(strs(vis.mood_words).length ? [{ t: "chips", label: t("분위기", "Mood"), items: strs(vis.mood_words) } as Block] : []), { t: "kv", items: [{ label: t("사진", "Imagery"), value: s(vis.imagery) }, { label: t("형태", "Shapes"), value: s(vis.shapes) }].filter((x) => x.value) }, ...(strs(vis.avoid).length ? [{ t: "callout", label: t("피할 것", "Avoid"), text: strs(vis.avoid).join(" · "), tone: "warn" } as Block] : [])] },
    { title: t("메시지", "Messaging"), kicker: "08", blocks: [...(taglines.length ? [{ t: "cards", cols: 3, items: taglines } as Block] : []), ...(s(msg.elevator_pitch) ? [{ t: "h3", text: t("30초 소개", "Elevator pitch") } as Block, { t: "quote", text: s(msg.elevator_pitch) } as Block] : []), ...(strs(msg.key_messages).length ? [{ t: "h3", text: t("핵심 메시지", "Key messages") } as Block, { t: "bullets", items: strs(msg.key_messages), style: "num" } as Block] : [])] },
    ...(touch.length ? [{ title: t("어디에 어떻게 쓰나요", "Where it shows up"), kicker: "09", blocks: [{ t: "cards", cols: 2, items: touch } as Block] }] : []),
  ];
  const slides: Slide[] = [
    { kind: "cover", title: name, subtitle: s(ess.one_line), kicker: t("브랜드 가이드", "Brand guide") },
    ...(s(ess.one_line) ? [{ kind: "statement", kicker: t("한 줄 정의", "In one line"), text: s(ess.one_line) } as Slide] : []),
    ...(meters.length ? [{ kind: "block", kicker: "02", title: t("우리의 성격", "Our personality"), block: { t: "meters", items: meters } } as Slide] : []),
    ...(traits.length ? [{ kind: "block", kicker: "02", title: t("이렇게 행동해요", "How we behave"), block: { t: "cards", cols: Math.min(3, traits.length) as 1 | 2 | 3, items: traits } } as Slide] : []),
    ...(s(pos.statement) ? [{ kind: "statement", kicker: t("포지셔닝", "Positioning"), text: s(pos.statement) } as Slide] : []),
    { kind: "block", kicker: "04", title: t("말투", "Voice"), block: { t: "dodont", doTitle: t("이렇게 말해요", "Do"), dontTitle: t("이렇게는 말하지 않아요", "Don't"), dos: strs(voice.do), donts: strs(voice.dont) } },
    ...(samples.length ? [{ kind: "block", kicker: "04", title: t("상황별 예문", "Sample lines"), block: { t: "cards", cols: 1, items: samples } } as Slide] : []),
    { kind: "block", kicker: "05", title: t("브랜드 컬러", "Brand colors"), block: { t: "swatches", items: palette } },
    ...(fonts.length ? [{ kind: "block", kicker: "06", title: t("글꼴", "Typography"), block: { t: "type", items: fonts } } as Slide] : []),
    ...(taglines.length ? [{ kind: "block", kicker: "08", title: t("슬로건 후보", "Taglines"), block: { t: "cards", cols: 3, items: taglines } } as Slide] : []),
    ...(touch.length ? [{ kind: "block", kicker: "09", title: t("어디에 어떻게 쓰나요", "Where it shows up"), block: { t: "cards", cols: 2, items: touch.slice(0, 6) } } as Slide] : []),
    { kind: "end", title: name, text: strs(msg.taglines)[0] },
  ];
  return { lang: ctx.lang, theme, eyebrow: t("브랜드 가이드북", "Brand guidebook"), title: name, subtitle: s(ess.one_line), meta: meta(ctx), sections, slides, footer: `${name} · ${t("브랜드 가이드", "Brand guide")}` };
}

// ── Logo: a concept book ────────────────────────────────────────────────

function composeLogo(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const concepts = objs(o.concepts);
  const name = ctx.brandName || s(ctx.input?.brand_name) || t("로고", "Logo");
  const colorsOf = (c: O) => strs(obj(c.color_spec).hex).map((h) => hex(h, "")).filter(Boolean);
  const theme = themeFrom(concepts.flatMap(colorsOf));
  const typeLine = (c: O) => {
    const ts = obj(c.type_spec);
    return [s(ts.family), s(ts.weight), s(ts.tracking) ? `${t("자간", "tracking")} ${s(ts.tracking)}` : ""].filter(Boolean).join(" · ");
  };
  const overview: Card[] = concepts.map((c, i) => ({ kicker: `${t("방향", "Direction")} ${i + 1}`, title: s(c.name), image: url(c.image), swatches: colorsOf(c), body: excerpt(s(c.concept_rationale), 90) }));
  const sections: Section[] = [
    { title: t("네 가지 방향 한눈에", "Four directions at a glance"), kicker: t("시안 비교", "Overview"), blocks: [{ t: "cards", cols: 2, items: overview }] },
    ...concepts.map((c, i): Section => ({
      title: s(c.name),
      kicker: `${t("방향", "Direction")} ${i + 1}`,
      newPage: true,
      blocks: [
        ...(url(c.image) ? [{ t: "image", url: url(c.image)!, tall: true } as Block] : []),
        { t: "p", text: s(c.concept_rationale) },
        { t: "kv", items: [{ label: t("심볼", "Symbol"), value: s(c.symbol) }, { label: t("글꼴", "Type"), value: typeLine(c) }].filter((x) => x.value) },
        ...(colorsOf(c).length ? [{ t: "swatches", items: colorsOf(c).map((h, k) => ({ name: k === 0 ? t("메인", "Main") : t("보조", "Support"), hex: h })) } as Block] : []),
        ...(s(c.usage_notes) ? [{ t: "callout", label: t("어디에 잘 어울리나요", "Where it works"), text: s(c.usage_notes), tone: "accent" } as Block] : []),
      ],
    })),
    { title: t("다음 단계", "Next steps"), kicker: t("확정하기 전에", "Before you decide"), blocks: [{ t: "bullets", style: "check", items: [t("가장 마음에 드는 방향 하나를 고르고, 작게(16px) 줄여도 알아볼 수 있는지 확인하세요.", "Pick one direction and check it still reads when tiny (16px)."), t("간판·컵·스티커처럼 실제로 쓸 곳에 대 보세요.", "Try it where it will live: sign, cup, sticker."), t("상표로 등록하려면 비슷한 상표가 있는지 먼저 검색하세요 (KIPRIS).", "Before registering, search for similar trademarks.")] }] },
  ];
  const slides: Slide[] = [
    { kind: "cover", title: name, subtitle: t("로고 방향 4가지", "Four logo directions"), kicker: t("로고 시안", "Logo concepts"), image: url(concepts[0]?.image) },
    { kind: "block", kicker: t("한눈에", "Overview"), title: t("네 가지 방향", "Four directions"), block: { t: "cards", cols: 2, items: overview.map((c) => ({ ...c, body: undefined })) } },
    ...concepts.map((c, i): Slide => (url(c.image) ? { kind: "image", kicker: `${t("방향", "Direction")} ${i + 1}`, title: s(c.name), image: url(c.image)!, text: excerpt(s(c.concept_rationale), 200) } : { kind: "block", kicker: `${t("방향", "Direction")} ${i + 1}`, title: s(c.name), block: { t: "p", text: s(c.concept_rationale) } })),
    { kind: "end", title: t("어떤 방향이 가장 좋으세요?", "Which direction feels right?"), text: concepts.map((c, i) => `${i + 1}. ${s(c.name)}`).join("   ") },
  ];
  return { lang: ctx.lang, theme, eyebrow: t("로고 시안집", "Logo concept book"), title: name, subtitle: t("서로 다른 로고 방향 네 가지", "Four distinct logo directions"), coverImage: url(concepts[0]?.image), meta: meta(ctx), sections, slides, footer: `${name} · ${t("로고 시안", "Logo concepts")}` };
}

// ── Ad copy: an ad board ────────────────────────────────────────────────

function composeCopy(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const angles = objs(o.angles);
  const name = ctx.brandName || t("광고", "Ads");
  const theme = themeFrom(ctx.brandColors ?? [], { ...DEFAULT, accent: "#E2553D", accent2: "#2F5BEA" });
  const channels = objs(o.channel_versions);
  const sections: Section[] = [
    { title: t("핵심 메시지", "Core message"), kicker: t("한 줄로", "In one line"), blocks: [{ t: "quote", text: s(o.core_message) }] },
    ...angles.map((a, i): Section => {
      const b = obj(a.variant_b);
      return {
        title: s(a.headline),
        kicker: `${t("광고", "Ad")} ${i + 1} · ${s(a.motivation)}`,
        blocks: [
          ...(url(a.image_url) ? [{ t: "image", url: url(a.image_url)! } as Block] : []),
          { t: "p", text: s(a.body) },
          ...(s(a.cta) ? [{ t: "chips", label: t("행동 유도 문구 (버튼)", "Call to action"), items: [s(a.cta)] } as Block] : []),
          ...(s(b.headline) ? [{ t: "table", header: ["", t("A안", "Version A"), t("B안", "Version B")], rows: [[t("제목", "Headline"), s(a.headline), s(b.headline)], [t("본문", "Body"), s(a.body), s(b.body)]] } as Block, ...(s(b.test_note) ? [{ t: "callout", label: t("A/B 테스트로 확인할 것", "What the A/B test checks"), text: s(b.test_note), tone: "neutral" } as Block] : [])] : []),
        ],
      };
    }),
    { title: t("채널별 문구", "Per channel"), kicker: t("그대로 올리기", "Ready to post"), newPage: true, blocks: channels.map((c): Block => ({ t: "post", platform: s(c.channel), name, text: s(c.copy), note: s(c.note) || undefined })) },
    ...(strs(o.words_to_avoid).length ? [{ title: t("쓰지 않을 표현", "Words to avoid"), kicker: t("광고 심의·신뢰", "Trust & compliance"), blocks: [{ t: "chips", items: strs(o.words_to_avoid) } as Block] }] : []),
  ];
  const slides: Slide[] = [
    { kind: "cover", title: s(o.core_message) || name, kicker: t("광고 시안", "Ad concepts"), subtitle: meta(ctx), image: url(angles[0]?.image_url) },
    ...angles.map((a, i): Slide => (url(a.image_url) ? { kind: "image", kicker: `${t("광고", "Ad")} ${i + 1} · ${s(a.motivation)}`, title: s(a.headline), image: url(a.image_url)!, text: `${s(a.body)}\n\n▶ ${s(a.cta)}` } : { kind: "block", kicker: `${t("광고", "Ad")} ${i + 1}`, title: s(a.headline), block: { t: "p", text: s(a.body) } })),
    ...angles.filter((a) => s(obj(a.variant_b).headline)).map((a, i): Slide => ({ kind: "block", kicker: `A/B · ${t("광고", "Ad")} ${i + 1}`, title: t("어느 쪽이 더 눌릴까요?", "Which one gets the click?"), block: { t: "cards", cols: 2, items: [{ kicker: t("A안", "A"), title: s(a.headline), body: s(a.body) }, { kicker: t("B안", "B"), title: s(obj(a.variant_b).headline), body: s(obj(a.variant_b).body), footer: s(obj(a.variant_b).test_note) }] } })),
    ...channels.map((c): Slide => ({ kind: "block", kicker: t("채널별 문구", "Per channel"), title: s(c.channel), block: { t: "post", platform: s(c.channel), name, text: s(c.copy), note: s(c.note) || undefined } })),
    ...(strs(o.words_to_avoid).length ? [{ kind: "block", kicker: t("주의", "Careful"), title: t("쓰지 않을 표현", "Words to avoid"), block: { t: "chips", items: strs(o.words_to_avoid) } } as Slide] : []),
  ];
  return { lang: ctx.lang, theme, eyebrow: t("광고 시안 보드", "Ad concept board"), title: s(o.core_message) || name, coverImage: url(angles[0]?.image_url), meta: meta(ctx), sections, slides, footer: `${name} · ${t("광고 시안", "Ad concepts")}` };
}

// ── Content Transformer: a channel content pack ────────────────────────

const PLATFORMS: Record<string, [string, string]> = { instagram_carousel: ["인스타 카드뉴스", "Instagram carousel"], instagram_caption: ["인스타 캡션", "Instagram caption"], threads: ["스레드 연재", "Threads series"], linkedin: ["링크드인", "LinkedIn"], shorts_script: ["쇼츠·릴스 대본", "Shorts / Reels script"], newsletter: ["뉴스레터", "Newsletter"], naver_blog: ["네이버 블로그", "Naver blog"], kakao: ["카카오톡 채널", "KakaoTalk channel"] };

function composeTransformer(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const name = ctx.brandName || t("우리 가게", "Our shop");
  const theme = themeFrom(ctx.brandColors ?? [], { ...DEFAULT, accent: "#7C4DDB", accent2: "#E2553D" });
  const versions = objs(o.versions);
  const pname = (v: O) => (PLATFORMS[s(v.platform)] ? t(PLATFORMS[s(v.platform)][0], PLATFORMS[s(v.platform)][1]) : s(v.platform));
  const tagsOf = (v: O) => strs(v.hashtags).map((h) => (h.startsWith("#") ? h : `#${h}`));
  const versionBlocks = (v: O): Block[] => {
    const out: Block[] = [];
    const slidesV = objs(v.slides).map((x) => ({ heading: s(x.heading), text: s(x.text) }));
    const script = objs(v.script).map((x) => ({ time: s(x.time), visual: s(x.visual), voice: s(x.voice) }));
    const posts = strs(v.posts);
    if (slidesV.length) out.push({ t: "carousel", items: slidesV });
    if (script.length) out.push({ t: "script", header: [t("시간", "Time"), t("화면", "On screen"), t("말·자막", "Voice / caption")], rows: script });
    if (posts.length) out.push({ t: "bullets", items: posts, style: "num" });
    if (s(v.body)) out.push(["instagram_caption", "kakao", "threads", "linkedin"].includes(s(v.platform)) ? { t: "post", platform: pname(v), name, text: s(v.body), tags: tagsOf(v), cta: s(v.cta) || undefined } : { t: "article", markdown: s(v.body) });
    else if (tagsOf(v).length) out.push({ t: "chips", items: tagsOf(v) });
    if (s(v.cta) && !["instagram_caption", "kakao", "threads", "linkedin"].includes(s(v.platform))) out.push({ t: "callout", label: t("마지막에 하게 할 행동", "Call to action"), text: s(v.cta), tone: "accent" });
    if (s(v.note)) out.push({ t: "callout", label: t("올릴 때 참고", "Posting note"), text: s(v.note), tone: "neutral" });
    return out;
  };
  const sections: Section[] = [
    { title: t("핵심 메시지", "Core message"), kicker: t("모든 버전의 중심", "At the center of every version"), blocks: [{ t: "quote", text: s(o.core_message) }, ...(strs(o.key_points).length ? [{ t: "bullets", items: strs(o.key_points), style: "check" } as Block] : [])] },
    ...versions.map((v, i): Section => ({ title: s(v.title) || pname(v), kicker: `${String(i + 1).padStart(2, "0")} · ${pname(v)}`, intro: s(v.angle) || undefined, newPage: i > 0, blocks: versionBlocks(v) })),
    ...(strs(o.dropped).length ? [{ title: t("원본에서 뺀 내용", "Left out of the source"), kicker: t("참고", "Note"), blocks: [{ t: "bullets", items: strs(o.dropped) } as Block] }] : []),
  ];
  const slides: Slide[] = [{ kind: "cover", title: s(o.core_message) || name, kicker: t("채널별 콘텐츠 팩", "Channel content pack"), subtitle: versions.map(pname).join(" · ") }];
  for (const v of versions) {
    const carousel = objs(v.slides);
    if (carousel.length) carousel.forEach((x, k) => slides.push({ kind: "statement", kicker: `${pname(v)} · ${k + 1}/${carousel.length}`, text: `${s(x.heading)}\n${s(x.text)}` }));
    const script = objs(v.script);
    if (script.length) slides.push({ kind: "block", kicker: pname(v), title: s(v.title) || pname(v), block: { t: "script", header: [t("시간", "Time"), t("화면", "On screen"), t("말·자막", "Voice / caption")], rows: script.map((x) => ({ time: s(x.time), visual: s(x.visual), voice: s(x.voice) })) } });
    if (s(v.body) && !carousel.length) slides.push({ kind: "block", kicker: pname(v), title: s(v.title) || pname(v), block: { t: "post", platform: pname(v), name, text: excerpt(s(v.body), 420), tags: tagsOf(v).slice(0, 8), cta: s(v.cta) || undefined } });
  }
  slides.push({ kind: "end", title: s(o.core_message) || name });
  // Word: just the copy, platform by platform, ready to paste.
  const docSections: Section[] = versions.map((v): Section => ({ title: pname(v), kicker: s(v.title) || undefined, blocks: versionBlocks(v).map((b): Block => (b.t === "post" ? { t: "p", text: [b.text, (b.tags ?? []).join(" ")].filter(Boolean).join("\n\n") } : b.t === "carousel" ? { t: "table", header: ["#", t("제목", "Heading"), t("내용", "Text")], rows: b.items.map((x, k) => [String(k + 1), x.heading, x.text]) } : b)) }));
  return { lang: ctx.lang, theme, eyebrow: t("채널별 콘텐츠 팩", "Channel content pack"), title: s(o.core_message) || name, subtitle: versions.map(pname).join(" · "), meta: meta(ctx), sections, docSections, slides, footer: `${name} · ${t("콘텐츠 팩", "Content pack")}` };
}

// ── Presentation: PDF handout and Word speaker script (the deck itself stays in ../pptx.ts) ──

function composePresentation(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const accent = hex(o.accent_color, DEFAULT.accent);
  const theme: Theme = { accent, accent2: DEFAULT.accent2, dark: DEFAULT.dark };
  const slidesIn = objs(o.slides);
  const slideBlocks = (sl: O): Block[] => {
    const out: Block[] = [];
    const stat = obj(sl.stat), chart = obj(sl.chart), table = obj(sl.table), cmp = obj(sl.compare), quote = obj(sl.quote);
    if (url(sl.image_url)) out.push({ t: "image", url: url(sl.image_url)! });
    if (s(stat.value)) out.push({ t: "kpis", items: [{ label: s(stat.label), value: s(stat.value), note: s(stat.context) || undefined }] });
    if (arr(chart.categories).length) {
      const series = objs(chart.series);
      out.push({ t: "table", header: [s(chart.unit) || "", ...series.map((x) => s(x.name))], rows: strs(chart.categories).map((c, k) => [c, ...series.map((x) => String(arr(x.values)[k] ?? ""))]) });
      if (s(chart.takeaway)) out.push({ t: "callout", label: chart.source === "estimate" ? t("핵심 · 추정치", "Takeaway · estimate") : t("핵심", "Takeaway"), text: s(chart.takeaway), tone: chart.source === "estimate" ? "warn" : "accent" });
    }
    if (arr(table.rows).length) out.push({ t: "table", header: strs(table.header), rows: arr(table.rows).map((r) => strs(r)) });
    if (s(cmp.left_title)) out.push({ t: "cards", cols: 2, items: [{ title: s(cmp.left_title), body: strs(cmp.left_points).map((x) => `• ${x}`).join("\n") }, { title: s(cmp.right_title), body: strs(cmp.right_points).map((x) => `• ${x}`).join("\n") }] });
    if (objs(sl.steps).length) out.push({ t: "cards", cols: Math.min(3, objs(sl.steps).length) as 1 | 2 | 3, items: objs(sl.steps).map((x, k) => ({ kicker: `${k + 1}`, title: s(x.title), body: s(x.text) })) });
    if (s(quote.text)) out.push({ t: "quote", text: s(quote.text), by: s(quote.source) || undefined });
    if (strs(sl.points).length) out.push({ t: "bullets", items: strs(sl.points) });
    return out;
  };
  const sections: Section[] = [
    ...(s(o.storyline) ? [{ title: t("이야기 흐름", "Storyline"), kicker: t("발표 전체", "The whole talk"), blocks: [{ t: "quote", text: s(o.storyline) } as Block, { t: "bullets", style: "num", items: slidesIn.map((x) => s(x.headline)) } as Block] }] : []),
    ...slidesIn.map((sl, i): Section => ({ title: s(sl.headline), kicker: `${t("슬라이드", "Slide")} ${i + 1}`, newPage: true, blocks: [...slideBlocks(sl), ...(s(sl.speaker_notes) ? [{ t: "callout", label: t("발표 메모", "Speaker notes"), text: s(sl.speaker_notes), tone: "neutral" } as Block] : [])] })),
    ...(s(o.closing_ask) ? [{ title: t("오늘의 요청", "The ask"), kicker: t("마무리", "Close"), newPage: true, blocks: [{ t: "quote", text: s(o.closing_ask) } as Block] }] : []),
  ];
  // Word: the speaker script — what to say, slide by slide.
  const docSections: Section[] = [
    ...(s(o.storyline) ? [{ title: t("발표 흐름", "Talk flow"), blocks: [{ t: "p", text: s(o.storyline) } as Block] }] : []),
    ...slidesIn.map((sl, i): Section => ({ title: `${i + 1}. ${s(sl.headline)}`, blocks: [...(s(sl.speaker_notes) ? [{ t: "p", text: s(sl.speaker_notes) } as Block] : []), ...(strs(sl.points).length ? [{ t: "bullets", items: strs(sl.points) } as Block] : []), ...(s(obj(sl.stat).value) ? [{ t: "kv", items: [{ label: s(obj(sl.stat).label), value: s(obj(sl.stat).value) }] } as Block] : [])] })),
    ...(s(o.closing_ask) ? [{ title: t("마무리 요청", "Closing ask"), blocks: [{ t: "p", text: s(o.closing_ask) } as Block] }] : []),
  ];
  return { lang: ctx.lang, theme, eyebrow: t("발표 자료", "Presentation"), title: s(o.title) || ctx.toolName[ctx.lang], subtitle: s(o.subtitle) || undefined, coverImage: url(o.cover_image_url), meta: meta(ctx), sections, docSections, slides: [], footer: s(o.title) };
}

// ── Website: a site plan, the site's copy, and walkthrough slides ──────

/** Visible text of the generated page, section by section, for the copy document. */
export function siteCopy(html: string): { heading: string; lines: string[] }[] {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<nav[\s\S]*?<\/nav>|<title[\s\S]*?<\/title>|<!--[\s\S]*?-->/gi, "");
  const tokens = body.split(/(<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>)/i);
  const out: { heading: string; lines: string[] }[] = [];
  const clean = (x: string) => x.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|li|div|span|a|button)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
  let cur: { heading: string; lines: string[] } = { heading: "", lines: [] };
  for (const tok of tokens) {
    if (/^<h[1-3]/i.test(tok)) {
      if (cur.heading || cur.lines.length) out.push(cur);
      cur = { heading: clean(tok).replace(/\s+/g, " ").trim(), lines: [] };
    } else {
      for (const l of clean(tok).split("\n")) {
        const v = l.replace(/\s+/g, " ").trim();
        // UI words (menu toggles, scroll hints) aren't the site's copy.
        if (v.length > 1 && !/^(menu|scroll|close|open|메뉴|닫기|✕|×)$/i.test(v) && !cur.lines.includes(v)) cur.lines.push(v);
      }
    }
  }
  if (cur.heading || cur.lines.length) out.push(cur);
  return out.filter((x) => x.heading || x.lines.length).slice(0, 30);
}

function composeHomepage(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const design = obj(o.design);
  const palette = strs(design.palette).map((h) => hex(h, "")).filter(Boolean);
  const theme = themeFrom(palette);
  const name = ctx.brandName || t("홈페이지", "Website");
  const sitemap: Card[] = objs(o.sitemap).map((x, i) => ({ kicker: `${String(i + 1).padStart(2, "0")}`, title: s(x.title), body: s(x.goal), footer: s(x.layout) || undefined }));
  const html = s(obj(o.project_files)["index.html"]) || s(o.html);
  const copy = html ? siteCopy(html) : [];
  const publish = [t("결과 화면에서 [HTML 다운로드]로 파일 하나를 받아요.", "Download the single file with [HTML download]."), t("Netlify Drop(app.netlify.com/drop)에 파일을 끌어다 놓으면 바로 주소가 생겨요.", "Drag it onto Netlify Drop (app.netlify.com/drop) to get a live address."), t("[입력 필요]로 표시된 주소·전화번호는 꼭 채워 주세요.", "Fill in anything marked [to fill in], like the address or phone."), t("도메인을 연결하면 우리 가게 주소로 열려요.", "Connect your own domain when you're ready.")];
  const sections: Section[] = [
    { title: t("디자인 콘셉트", "Design concept"), kicker: "01", blocks: [...(s(design.big_idea) || s(design.concept) ? [{ t: "quote", text: s(design.big_idea) || s(design.concept) } as Block] : []), ...(s(design.concept) && s(design.big_idea) ? [{ t: "p", text: s(design.concept) } as Block] : []), ...(strs(design.mood).length ? [{ t: "chips", label: t("분위기", "Mood"), items: strs(design.mood) } as Block] : []), ...(palette.length ? [{ t: "swatches", items: palette.map((h, i) => ({ name: `${t("색", "Color")} ${i + 1}`, hex: h })) } as Block] : []), ...(s(design.display_font) ? [{ t: "type", items: [{ role: t("제목", "Display"), family: s(design.display_font), weight: "", sample: name }, ...(s(design.body_font) ? [{ role: t("본문", "Body"), family: s(design.body_font), weight: "", sample: t("천천히 쉬어 가세요.", "Take your time.") }] : [])] } as Block] : [])] },
    ...(sitemap.length ? [{ title: t("페이지 구성", "Page structure"), kicker: "02", newPage: true, blocks: [{ t: "cards", cols: 2, items: sitemap } as Block] }] : []),
    ...(strs(design.signature).length ? [{ title: t("이 사이트만의 장치", "Signature details"), kicker: "03", blocks: [{ t: "bullets", items: strs(design.signature), style: "check" } as Block] }] : []),
    { title: t("올리는 방법", "How to publish"), kicker: "04", newPage: !sitemap.length, blocks: [{ t: "bullets", items: publish, style: "num" }] },
  ];
  const docSections: Section[] = copy.length
    ? [{ title: t("사이트 원고", "Site copy"), intro: t("홈페이지에 들어간 글을 구역별로 모았어요. 고칠 곳을 표시해 전달하거나 그대로 다시 쓸 수 있어요.", "Every line on the page, by section — mark up changes or reuse it elsewhere."), blocks: copy.flatMap((c): Block[] => [...(c.heading ? [{ t: "h2", text: c.heading } as Block] : []), ...(c.lines.length ? [{ t: "p", text: c.lines.join("\n") } as Block] : [])]) }, ...sections.slice(-1)]
    : sections;
  const slides: Slide[] = [
    { kind: "cover", title: name, subtitle: s(design.big_idea) || s(design.concept), kicker: t("홈페이지 소개", "Website walkthrough") },
    ...(s(design.concept) ? [{ kind: "statement", kicker: t("디자인 콘셉트", "Design concept"), text: s(design.concept) } as Slide] : []),
    ...(palette.length ? [{ kind: "block", kicker: t("색", "Color"), title: t("사이트의 색", "Site colors"), block: { t: "swatches", items: palette.map((h, i) => ({ name: `${t("색", "Color")} ${i + 1}`, hex: h })) } } as Slide] : []),
    ...(sitemap.length ? [{ kind: "block", kicker: t("페이지 구성", "Structure"), title: t("손님이 보게 될 순서", "What visitors see, in order"), block: { t: "cards", cols: 2, items: sitemap } } as Slide] : []),
    { kind: "block", kicker: t("올리는 방법", "Publish"), title: t("오늘 바로 올리기", "Go live today"), block: { t: "bullets", items: publish, style: "num" } },
    { kind: "end", title: name },
  ];
  return { lang: ctx.lang, theme, eyebrow: t("홈페이지 기획서", "Website plan"), title: name, subtitle: s(design.big_idea) || s(design.concept) || undefined, meta: meta(ctx), sections, docSections, slides, footer: `${name} · ${t("홈페이지", "Website")}` };
}


// ── Photo shoot: a photo set ───────────────────────────────────────────

const PRESET: Record<string, [string, string]> = { studio: ["제품 스튜디오컷", "Studio product shot"], packaging: ["패키징", "Packaging"], "3d_render": ["3D 렌더", "3D render"], landing_ui: ["랜딩 UI", "Landing UI"], ad_banner: ["광고 배너", "Ad banner"], background: ["배경", "Background"] };

function photoSet(ctx: ComposeContext, photos: { url: string; name: string; purpose: string }[], kind: { eyebrow: string; title: string; subtitle: string; footer: string }, extra: Section[], tips: string[]): Design {
  const t = tr(ctx.lang);
  const theme = themeFrom(ctx.brandColors ?? [], { ...DEFAULT, accent: "#C2410C", accent2: "#2F5BEA", dark: "#14161A" });
  const sections: Section[] = [
    { title: t("한눈에 보기", "At a glance"), kicker: kind.eyebrow, blocks: [{ t: "cards", cols: 2, items: photos.map((p, i) => ({ kicker: `${String(i + 1).padStart(2, "0")}`, title: p.name, image: p.url, body: p.purpose || undefined })) }] },
    ...photos.map((p, i): Section => ({ title: p.name, kicker: `${t("컷", "Shot")} ${i + 1} / ${photos.length}`, newPage: true, blocks: [{ t: "image", url: p.url, tall: true }, ...(p.purpose ? [{ t: "p", text: p.purpose } as Block] : [])] })),
    ...extra,
    { title: t("이렇게 쓰세요", "How to use them"), kicker: t("활용 팁", "Tips"), blocks: [{ t: "bullets", style: "check", items: tips }] },
  ];
  const slides: Slide[] = [
    { kind: "cover", title: kind.title, subtitle: kind.subtitle, kicker: kind.eyebrow, image: photos[0]?.url },
    { kind: "block", kicker: kind.eyebrow, title: t("한눈에 보기", "At a glance"), block: { t: "cards", cols: Math.min(4, Math.max(1, photos.length)) as 1 | 2 | 3 | 4, items: photos.map((p, i) => ({ kicker: `${i + 1}`, title: p.name, image: p.url })) } },
    ...photos.map((p, i): Slide => ({ kind: "image", kicker: `${t("컷", "Shot")} ${i + 1}`, title: p.name, image: p.url, text: p.purpose || undefined })),
    { kind: "end", title: kind.title, text: tips[0] },
  ];
  return { lang: ctx.lang, theme, eyebrow: kind.eyebrow, title: kind.title, subtitle: kind.subtitle, coverImage: photos[0]?.url, meta: meta(ctx), sections, slides, footer: kind.footer };
}

function composeImage(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const preset = PRESET[s(ctx.input?.preset)];
  const photos = objs(o.images).flatMap((x, i) => (url(x.url) ? [{ url: url(x.url)!, name: s(x.name) || `${t("컷", "Shot")} ${i + 1}`, purpose: s(x.purpose) }] : []));
  const title = s(ctx.input?.description) ? excerpt(s(ctx.input?.description), 60) : t("제품 사진", "Product photos");
  return photoSet(ctx, photos, { eyebrow: t("제품 사진 촬영본", "Product photo set"), title, subtitle: [preset ? t(preset[0], preset[1]) : "", s(ctx.input?.ratio)].filter(Boolean).join(" · "), footer: `${ctx.brandName ?? title} · ${t("제품 사진", "Product photos")}` }, [], [
    t("1번 컷은 상세페이지·스마트스토어 대표 이미지로 쓰기 좋아요.", "Use shot 1 as the main product image."),
    t("인스타 피드는 4:5, 스토리·릴스는 9:16 비율로 다시 만들면 잘리지 않아요.", "For Instagram, regenerate at 4:5 (feed) or 9:16 (stories) so nothing is cropped."),
    t("AI로 만든 사진은 광고에 쓸 때 'AI 생성 이미지'라고 밝혀 주세요.", "Label AI-made photos as AI-generated when you use them in ads."),
  ]);
}

const MODEL: Record<string, [string, string]> = { f20: ["여성 20대", "Woman, 20s"], f30: ["여성 30대", "Woman, 30s"], m20: ["남성 20대", "Man, 20s"], m30: ["남성 30대", "Man, 30s"], any: ["성별 무관", "Any"] };
const MOOD: Record<string, [string, string]> = { minimal: ["미니멀", "Minimal"], casual: ["캐주얼", "Casual"], luxury: ["럭셔리", "Luxury"], natural: ["내추럴", "Natural"] };
const SET: Record<string, [string, string]> = { studio: ["스튜디오", "Studio"], outdoor: ["야외", "Outdoor"], cafe: ["카페", "Café"], store: ["매장", "Store"] };

function composeModel(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const pick = (m: Record<string, [string, string]>, k: string) => (m[k] ? t(m[k][0], m[k][1]) : "");
  const look = [pick(MODEL, s(ctx.input?.model_profile)), pick(MOOD, s(ctx.input?.mood)), pick(SET, s(ctx.input?.setting))].filter(Boolean).join(" · ");
  const shots = objs(o.shots).flatMap((x, i) => (url(x.url) ? [{ url: url(x.url)!, name: `${t("룩", "Look")} ${i + 1}`, purpose: look }] : []));
  return photoSet(ctx, shots, { eyebrow: t("모델 룩북", "Model lookbook"), title: ctx.brandName ? `${ctx.brandName} ${t("룩북", "Lookbook")}` : t("모델 룩북", "Model lookbook"), subtitle: look, footer: `${ctx.brandName ?? ""} ${t("룩북", "Lookbook")}`.trim() }, [{ title: t("AI 생성 이미지 표시", "AI-generated image notice"), kicker: t("꼭 지켜 주세요", "Required"), blocks: [{ t: "callout", tone: "warn", label: s(o.disclosure) || t("AI 생성 이미지", "AI-generated image"), text: t("이 사진의 모델은 실제 사람이 아닌 AI로 만든 인물이에요. 광고·상세페이지에 쓸 때는 'AI 생성 이미지'라고 함께 표시해 주세요.", "The model in these photos is AI-generated, not a real person. Say so ('AI-generated image') wherever you use them in ads or product pages.") }] }], [
    t("룩 1~2는 상세페이지 첫 화면, 나머지는 착용·사용 컷으로 쓰기 좋아요.", "Looks 1–2 suit the top of a product page; the rest work as in-use shots."),
    t("같은 모델로 더 찍고 싶다면 결과 화면의 [같은 조건으로 다시 만들기]를 쓰세요.", "For more shots of the same model, use [Run again with the same inputs]."),
    t("제품 색이 실제와 다르면 제품 사진을 더 밝은 곳에서 다시 올려 주세요.", "If colors look off, upload a product photo taken in brighter light."),
  ]);
}

// ── Sales page: a page proof and its copy ──────────────────────────────

function composeSalesPage(ctx: ComposeContext): Design {
  const t = tr(ctx.lang);
  const o = obj(ctx.output);
  const name = s(ctx.input?.product_name) || ctx.brandName || t("상세페이지", "Product page");
  const renders = arr(o.rendered_images).map((x) => url(x)).filter((u): u is string => Boolean(u));
  const secs = objs(o.sections).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const faq = objs(o.faq).map((x) => ({ q: s(x.q), a: s(x.a) })).filter((x) => x.q);
  const theme = themeFrom(ctx.brandColors ?? [], { ...DEFAULT, accent: "#E2553D", accent2: "#16A37F" });
  const copyBlocks = (sec: O): Block[] => [{ t: "p", text: s(sec.body) }, ...(s(sec.image_instruction) ? [{ t: "callout", tone: "neutral", label: t("이미지 자리", "Image"), text: s(sec.image_instruction) } as Block] : [])];
  const sections: Section[] = [
    { title: t("이 페이지가 푸는 고민", "The doubts this page answers"), kicker: t("기획", "Plan"), blocks: [...(strs(o.pain_points).length ? [{ t: "bullets", items: strs(o.pain_points) } as Block] : []), ...(strs(o.usps).length ? [{ t: "h3", text: t("핵심 강점 3가지", "Three key strengths") } as Block, { t: "cards", cols: 3, items: strs(o.usps).map((u, i) => ({ kicker: `0${i + 1}`, title: u })) } as Block] : [])] },
    ...(renders.length ? [{ title: t("완성된 상세페이지", "The finished page"), kicker: t("시안", "Proof"), newPage: true, blocks: renders.map((u): Block => ({ t: "image", url: u, tall: true })) }] : []),
    { title: t("구역별 원고", "Copy by section"), kicker: t("원고", "Copy"), newPage: true, blocks: secs.flatMap((sec, i): Block[] => [{ t: "h3", text: `${String(i + 1).padStart(2, "0")} · ${s(sec.headline)}` }, ...copyBlocks(sec)]) },
    ...(faq.length ? [{ title: t("자주 묻는 질문", "FAQ"), kicker: "FAQ", blocks: [{ t: "kv", items: faq.map((f) => ({ label: f.q, value: f.a })) } as Block] }] : []),
    ...(s(o.shipping_template) ? [{ title: t("배송·교환 안내", "Shipping & returns"), kicker: t("템플릿", "Template"), blocks: [{ t: "p", text: s(o.shipping_template) } as Block] }] : []),
  ];
  const slides: Slide[] = [
    { kind: "cover", title: name, subtitle: strs(o.usps).join(" · "), kicker: t("상세페이지 기획", "Product page plan"), image: renders[0] },
    ...(strs(o.pain_points).length ? [{ kind: "block", kicker: t("손님의 고민", "Customer doubts"), title: t("구매를 망설이는 이유", "Why buyers hesitate"), block: { t: "bullets", items: strs(o.pain_points) } } as Slide] : []),
    ...(strs(o.usps).length ? [{ kind: "block", kicker: t("핵심 강점", "Strengths"), title: t("이래서 사요", "Why they buy"), block: { t: "cards", cols: 3, items: strs(o.usps).map((u, i) => ({ kicker: `0${i + 1}`, title: u })) } } as Slide] : []),
    ...secs.map((sec, i): Slide => ({ kind: "block", kicker: `${String(i + 1).padStart(2, "0")} · ${s(sec.type)}`, title: s(sec.headline), block: { t: "p", text: s(sec.body) }, note: s(sec.image_instruction) || undefined })),
    ...(faq.length ? [{ kind: "block", kicker: "FAQ", title: t("자주 묻는 질문", "FAQ"), block: { t: "kv", items: faq.slice(0, 6).map((f) => ({ label: f.q, value: f.a })) } } as Slide] : []),
    { kind: "end", title: name },
  ];
  const docSections: Section[] = [{ title: t("구역별 원고", "Copy by section"), intro: t("상세페이지에 들어갈 글을 순서대로 모았어요. 디자이너에게 그대로 전달하면 돼요.", "All the page copy in order — hand it straight to a designer."), blocks: secs.flatMap((sec, i): Block[] => [{ t: "h2", text: `${i + 1}. ${s(sec.headline)}` }, ...copyBlocks(sec)]) }, ...sections.filter((x) => x.kicker === "FAQ" || x.title === t("배송·교환 안내", "Shipping & returns"))];
  return { lang: ctx.lang, theme, eyebrow: t("상세페이지 시안", "Product page proof"), title: name, subtitle: strs(o.usps).join(" · ") || undefined, coverImage: renders[0], meta: meta(ctx), sections, docSections, slides, footer: `${name} · ${t("상세페이지", "Product page")}` };
}

// ── Data tools: their report, laid out by the designed writers ─────────

function reportBlock(b: ReportBlock, palette: string[], lang: Lang): Block[] {
  const t = tr(lang);
  switch (b.type) {
    case "kpis":
      return [{ t: "kpis", items: b.items.map((k) => ({ label: k.label, value: k.value, note: k.note })) }];
    case "chart":
      return [{ t: "chart", chart: b.chart, palette, title: b.title, caption: b.caption, estimated: b.estimated ? t("추정", "Estimate") : undefined }];
    case "table":
      return [...(b.title ? [{ t: "h3", text: b.title } as Block] : []), { t: "table", header: b.header, rows: b.rows }, ...(b.caption ? [{ t: "p", text: b.caption } as Block] : [])];
    case "text":
      return [...(b.title ? [{ t: "h3", text: b.title } as Block] : []), { t: "p", text: b.text }];
    case "callout":
      return [{ t: "callout", label: b.label, text: b.text, tone: b.tone === "warn" ? "warn" : "accent" }];
    case "bullets":
      return [...(b.title ? [{ t: "h3", text: b.title } as Block] : []), { t: "bullets", items: b.items, style: b.style }];
    case "cards":
      return [...(b.title ? [{ t: "h3", text: b.title } as Block] : []), { t: "cards", cols: b.columns ?? (b.items.length >= 3 ? 3 : 2), items: b.items.map((c) => ({ kicker: c.kicker, title: c.title, tag: c.badge, body: [...(c.facts ?? []).map((f) => `${f.label}: ${f.value}`), ...(c.lines ?? [])].join("\n") || undefined, footer: c.meter ? `${c.meter.label} ${Math.round(c.meter.value * 100)}%` : c.badge })) }];
    case "quad":
      return [...(b.title ? [{ t: "h3", text: b.title } as Block] : []), { t: "cards", cols: 2, items: b.cells.map((c) => ({ title: c.title, body: c.items.map((x) => `• ${x}`).join("\n") })) }];
    case "image":
      return [{ t: "image", url: b.url, caption: b.caption }];
    case "sources":
      return [];
  }
}

function composeReport(ctx: ComposeContext, report: Report): Design {
  const t = tr(ctx.lang);
  const r = localizeLabels(report, ctx.lang);
  const palette = r.palette.length ? r.palette : [DEFAULT.accent];
  const theme = themeFrom(palette, DEFAULT);
  const sources = r.sections.flatMap((sec) => sec.blocks.flatMap((b) => (b.type === "sources" ? b.items : []))).map((x) => x.title || x.url).filter(Boolean);
  const sections: Section[] = [
    ...(r.hero.kpis?.length || r.hero.subtitle ? [{ title: t("핵심 요약", "Summary"), kicker: r.hero.eyebrow, blocks: [...(r.hero.subtitle ? [{ t: "lead", text: r.hero.subtitle } as Block] : []), ...(r.hero.kpis?.length ? [{ t: "kpis", items: r.hero.kpis.map((k) => ({ label: k.label, value: k.value, note: k.note })) } as Block] : [])] }] : []),
    ...r.sections.filter((sec) => sec.blocks.some((b) => b.type !== "sources")).map((sec): Section => ({ title: sec.title, kicker: sec.kicker, intro: sec.lead && sec.lead !== r.hero.subtitle ? sec.lead : undefined, blocks: sec.blocks.flatMap((b) => reportBlock(b, palette, ctx.lang)) })),
    ...(sources.length ? [{ title: t("출처", "Sources"), kicker: t("근거", "Evidence"), blocks: [{ t: "bullets", items: [...new Set(sources)].slice(0, 30), style: "num" } as Block] }] : []),
  ];
  // Slides: the summary, then each section's opener and its blocks one by one.
  const slides: Slide[] = [{ kind: "cover", title: r.hero.title, subtitle: r.hero.subtitle, kicker: r.hero.eyebrow }];
  if (r.hero.kpis?.length) slides.push({ kind: "block", kicker: r.hero.eyebrow, title: t("핵심 숫자", "Key numbers"), block: { t: "kpis", items: r.hero.kpis.slice(0, 3).map((k) => ({ label: k.label, value: k.value, note: k.note })) } });
  for (const sec of r.sections) {
    const blocks = sec.blocks.flatMap((b) => reportBlock(b, palette, ctx.lang)).filter((b) => b.t !== "h3");
    if (!blocks.length) continue;
    blocks.slice(0, 4).forEach((b, i) => {
      const titled = sec.blocks.find((x) => "title" in x && x.title && reportBlock(x, palette, ctx.lang).some((y) => y === b));
      const block: Block = b.t === "table" ? { ...b, rows: b.rows.slice(0, 9) } : b.t === "cards" ? { ...b, items: b.items.slice(0, 6) } : b;
      slides.push({ kind: "block", kicker: sec.kicker || (i === 0 ? r.hero.eyebrow : undefined), title: i === 0 ? sec.title : (titled && "title" in titled && titled.title) || sec.title, block });
    });
  }
  slides.push({ kind: "end", title: r.hero.title });
  const name = ctx.toolName[ctx.lang];
  return { lang: ctx.lang, theme, eyebrow: r.hero.eyebrow || name, title: r.hero.title, subtitle: r.hero.subtitle, meta: meta(ctx), sections, slides, footer: `${ctx.brandName ? `${ctx.brandName} · ` : ""}${name}` };
}

const COMPOSERS: Record<string, (ctx: ComposeContext) => Design> = {
  blog: composeBlog,
  "brand-dna": composeBrandDna,
  logo: composeLogo,
  copy: composeCopy,
  "content-transformer": composeTransformer,
  presentation: composePresentation,
  homepage: composeHomepage,
  image: composeImage,
  "brand-model": composeModel,
  sangsepage: composeSalesPage,
};

/** Tools with a layout of their own (data tools get theirs from their report). */
export function hasDesign(toolId: string): boolean {
  return toolId in COMPOSERS;
}

/** The designed layout for this tool's result, or null when the tool still uses the generic export. */
export function composeDesign(ctx: ComposeContext): Design | null {
  if (!ctx.output || typeof ctx.output !== "object") return null;
  const fn = COMPOSERS[ctx.toolId];
  if (fn) return fn(ctx);
  // Data tools: their report, in the designed layout.
  const report = buildReport(ctx.toolId, ctx.output, ctx.input ?? {});
  return report ? composeReport(ctx, report) : null;
}
