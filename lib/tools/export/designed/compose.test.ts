import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDesign, hasDesign, siteCopy, type ComposeContext } from "./compose.ts";
import { designImages, excerpt, inlineRuns, parseMarkdown, type Design } from "./model.ts";

const IMG = "https://x.supabase.co/storage/v1/object/sign/exports/u/a.png?token=t";
const ctx = (toolId: string, output: unknown, lang: "ko" | "en" = "ko", input: Record<string, unknown> = {}): ComposeContext => ({ toolId, output, input, lang, brandName: "달빛정원", brandColors: ["#2F3E5C", "#E8B04B"], createdAt: "2026-10-29T01:00:00Z", toolName: { ko: "도구", en: "Tool" } });
const texts = (d: Design) => JSON.stringify(d);

test("only the designed tools get a design", () => {
  for (const id of ["blog", "brand-dna", "logo", "copy", "content-transformer", "presentation", "homepage", "image", "brand-model", "sangsepage"]) assert.ok(hasDesign(id), id);
  assert.equal(composeDesign(ctx("blog", null)), null);
  assert.equal(composeDesign(ctx("no-such-tool", { a: 1 })), null);
});

test("a blog becomes an article with its photos, a paste-ready manuscript and card-news slides", () => {
  const d = composeDesign(ctx("blog", { titles: ["가을 몽블랑", "다른 제목"], meta_description: "설명", body_markdown: "# 가을 몽블랑\n\n## 골목의 위로\n\n첫 문단 **강조**.\n\n## 아침의 밤\n\n둘째 문단.", image_slots: [{ after_section: "골목의 위로", purpose: "카페", prompt: "p", image_url: IMG }], hashtags: ["해운대카페", "#몽블랑"], char_count: 900 }, "ko", { platform: "naver" }))!;
  assert.equal(d.title, "가을 몽블랑");
  assert.equal(d.eyebrow, "네이버 블로그 원고");
  const article = d.sections[0].blocks.find((b) => b.t === "article");
  assert.ok(article && article.t === "article" && !article.markdown.startsWith("# 가을"), "the repeated H1 is dropped");
  assert.ok(d.docSections?.[0].blocks.some((b) => b.t === "article" && b.photos?.length === 1), "Word keeps every photo in the text");
  assert.ok(texts(d).includes("#해운대카페") && texts(d).includes("#몽블랑") && !texts(d).includes("##몽블랑"));
  assert.equal(d.slides[0].kind, "cover");
  assert.ok(d.slides.some((s) => s.kind === "image" && s.title === "골목의 위로"), "the photo goes on its section's slide");
  assert.deepEqual(designImages(d), [IMG]);
});

test("labels follow the run's language", () => {
  const brand = { summary: "s", essence: { one_line: "Garden at dusk", purpose: "p", promise: "q" }, archetype: { name: "Caregiver", why: "w" }, dimensions: { warmth: 9, expertise: 6, boldness: 3, playfulness: 4, premium: 6 }, traits: [{ trait: "Warm", means: "m", not: "n" }], values: [], positioning: { statement: "st" }, voice: { tone_words: ["calm"], do: ["a"], dont: ["b"], samples: [] }, palette: [{ name: "Navy", hex: "#2F3E5C", role: "primary", usage: "u" }], typography: { heading: { family: "Gowun Batang", weight: "700", why: "y" } }, visual: {}, messaging: { taglines: ["t1", "t2", "t3"] }, touchpoints: [] };
  const en = composeDesign(ctx("brand-dna", brand, "en"))!;
  const ko = composeDesign(ctx("brand-dna", brand, "ko"))!;
  assert.equal(en.eyebrow, "Brand guidebook");
  assert.equal(ko.eyebrow, "브랜드 가이드북");
  assert.ok(texts(en).includes("Personality") && !texts(en).includes("브랜드의 성격"));
  assert.equal(en.theme.accent, "#2F3E5C");
});

test("logo, ads, content pack, deck and site all compose without their optional parts", () => {
  const logo = composeDesign(ctx("logo", { concepts: [{ name: "Crescent", concept_rationale: "r", symbol: "s", color_spec: { hex: ["#2F3E5C"] }, type_spec: { family: "Pretendard", weight: "bold", tracking: "normal" }, usage_notes: "u", image: { url: IMG }, symbol_image: { url: IMG } }], mockups: [] }))!;
  assert.equal(logo.coverImage, IMG);
  assert.equal(logo.sections.length, 3);
  const ads = composeDesign(ctx("copy", { core_message: "core", angles: [{ motivation: "m", headline: "h", body: "b", cta: "go", variant_b: { headline: "h2", body: "b2", test_note: "n" } }], channel_versions: [{ channel: "Instagram", copy: "c", note: "" }], words_to_avoid: [] }))!;
  assert.ok(ads.slides.some((s) => s.kind === "block" && s.block.t === "post"));
  const pack = composeDesign(ctx("content-transformer", { core_message: "core", key_points: ["a", "b"], versions: [{ platform: "instagram_carousel", angle: "a", title: "t", body: "", slides: [{ heading: "h1", text: "x" }, { heading: "h2", text: "y" }], script: [], posts: [], hashtags: ["tag"], cta: "", note: "" }, { platform: "shorts_script", angle: "", title: "", body: "", slides: [], script: [{ time: "0-3s", visual: "v", voice: "o" }], posts: [], hashtags: [], cta: "", note: "" }], dropped: [] }))!;
  assert.equal(pack.slides.filter((s) => s.kind === "statement").length, 2, "one slide per carousel card");
  assert.ok(pack.sections.some((s) => s.blocks.some((b) => b.t === "script")));
  const deck = composeDesign(ctx("presentation", { title: "Pitch", subtitle: "", storyline: "story", slides: [{ layout: "chart", headline: "Visitors", points: [], visual: "", speaker_notes: "say this", chart: { kind: "bar", unit: "명", categories: ["Low", "High"], series: [{ name: "n", values: [40, 60] }], source: "estimate", takeaway: "40–60" } }], closing_ask: "Join" }))!;
  assert.deepEqual(deck.slides, [], "the deck itself keeps its own writer");
  assert.ok(texts(deck).includes("추정"));
  assert.ok(deck.docSections?.some((s) => s.blocks.some((b) => b.t === "p" && b.text === "say this")), "Word is the speaker script");
  const site = composeDesign(ctx("homepage", { html: "<nav>Menu</nav><h1>Moonlight</h1><p>Rest a while</p><h2>Menu</h2><p>Mont Blanc ₩7,500</p><script>x</script>", sections: [], design: { concept: "c", palette: ["#2F3E5C"] }, sitemap: [{ title: "Hero", goal: "g", layout: "l" }] }))!;
  assert.ok(site.docSections?.[0].blocks.some((b) => b.t === "p" && b.text.includes("₩7,500")));
});

test("site copy keeps the page's own words, not scripts or menus", () => {
  const copy = siteCopy("<title>T</title><nav><a>Home</a></nav><h1>Moonlight</h1><p>Rest a while</p><button>Menu</button><script>evil()</script><h2>Visit</h2><p>Open 10&ndash;22</p>");
  assert.equal(copy[0].heading, "Moonlight");
  assert.deepEqual(copy[0].lines, ["Rest a while"]);
  assert.equal(copy[1].heading, "Visit");
  assert.ok(!JSON.stringify(copy).includes("evil") && !JSON.stringify(copy).includes("Home"));
});

test("markdown helpers", () => {
  assert.deepEqual(inlineRuns("a **b** c"), [{ text: "a ", bold: false }, { text: "b", bold: true }, { text: " c", bold: false }]);
  const lines = parseMarkdown("## Head\n\npara one\nline two\n\n- item\n1. first\n> quote");
  assert.deepEqual(lines.map((l) => l.k), ["h", "p", "li", "li", "quote"]);
  assert.equal(lines[1].k === "p" && lines[1].text, "para one line two");
  assert.equal(excerpt("짧은 글.", 50), "짧은 글.");
  assert.ok(excerpt("문장 하나입니다. 문장 둘입니다. 문장 셋입니다.", 20).endsWith("."));
});

test("photo tools become a photo set; the lookbook carries the AI notice", () => {
  const set = composeDesign(ctx("image", { images: [1, 2, 3, 4].map((i) => ({ name: `Cut ${i}`, purpose: "p", asset_id: "a", url: IMG, seed: "s" })), refined_prompt: "", negative_prompt: "" }, "ko", { description: "밤 몽블랑", preset: "studio", ratio: "4:5" }))!;
  assert.equal(set.coverImage, IMG);
  assert.equal(set.sections.filter((s) => s.blocks.some((b) => b.t === "image")).length, 4);
  const look = composeDesign(ctx("brand-model", { shots: [{ asset_id: "a", url: IMG }], model_seed: "s", disclosure: "AI 생성 이미지" }, "en", { model_profile: "f30", mood: "natural", setting: "cafe" }))!;
  assert.ok(JSON.stringify(look).includes("AI-generated"));
  assert.equal(look.subtitle, "Woman, 30s · Natural · Café");
});

test("a data tool's report is laid out with its charts, in English when asked", () => {
  const d = composeDesign(ctx("trend", { summary: "s", recommended: "Dessert box", ideas: [{ name: "Dessert box", one_liner: "x", scores: { market_size: 7, growth: 6, margin: 5, personal_fit: 8, entry_barrier: 3, competition: 4, execution_difficulty: 3, capital_need: 2 }, composite: 7, demand_trend: [{ period: "2025", index: 40 }, { period: "2026", index: 70 }], target_customer: "t", entry_cost_krw: 5000000, price_gap: { band: "b", evidence: "e" }, differentiation_angles: [], verdict: "go", risks: [] }], signals: [] }, "en"))!;
  assert.ok(d.sections.some((s) => s.blocks.some((b) => b.t === "chart")));
  assert.ok(d.slides.length > 3);
  assert.ok((JSON.stringify(d.sections.map((s) => s.title)).match(/[가-힣]+/g) ?? []).length === 0, "section titles are English");
});
