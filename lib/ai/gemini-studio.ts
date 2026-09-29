import "server-only";
import { ThinkingLevel } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { buildBaseInstruction, buildContext, referenceOf, referenceParts, type ImagePart } from "@/lib/tools/generate-prompt";
import { redactInventedPrices } from "@/lib/tools/price-guard";
import { extractHtml } from "@/lib/tools/html-extract";
import { addUsage, generateOneImage, getClient, PRO_IMAGE_MODEL, TEXT_MODEL, type AspectRatio } from "./gemini";
import type { ImageStorageContext, TokenUsage } from "./types";

// The two visual tools, done the way a design studio would: an art
// director first fixes the concept, palette, type and shot list; the
// Pro model then builds the page (or the deck is written by it), while
// the Pro image model shoots every picture in parallel. Pictures go to
// storage and come back as long-lived signed URLs, so a run row stays
// small and the downloaded HTML still shows them.

export const PRO_TEXT_MODEL = "gemini-3.1-pro-preview";
const YEAR = 60 * 60 * 24 * 365;
const ZERO: TokenUsage = { inputTokens: 0, outputTokens: 0 };

const sumUsage = (a: TokenUsage, b: TokenUsage): TokenUsage =>
  addUsage(a, { promptTokenCount: b.inputTokens ?? 0, candidatesTokenCount: b.outputTokens ?? 0 });

/** One photograph: Pro image model first, the fast one if it fails. Null when both fail. */
async function shoot(
  prompt: string,
  ratio: AspectRatio,
  name: string,
  folder: string,
  storage: ImageStorageContext,
  abortSignal: AbortSignal | undefined,
): Promise<{ url: string | null; usage: TokenUsage }> {
  const text = `${prompt} Photorealistic, editorial quality, natural light, rich detail, cohesive color grade. Absolutely no text, letters, numbers, logos, signage or watermarks anywhere in the image.`;
  try {
    // Pro image model, with the shared fallback to the fast one.
    const manifest = { id: "image", name_ko: "해봇 비주얼", summary: "브랜드 비주얼 사진", model: PRO_IMAGE_MODEL } as ToolManifest;
    const { image, usage } = await generateOneImage(manifest, [{ text }], Math.floor(Math.random() * 2 ** 31), abortSignal, ratio);
    const ext = image.mimeType.includes("png") ? "png" : "jpg";
    const path = `${storage.userId}/${folder}/${storage.runId}/${name}.${ext}`;
    const { error } = await storage.supabase.storage.from("exports").upload(path, Buffer.from(image.data, "base64"), { contentType: image.mimeType, upsert: true });
    if (error) throw new Error(error.message);
    const { data } = await storage.supabase.storage.from("exports").createSignedUrl(path, YEAR);
    if (!data?.signedUrl) throw new Error("signed url");
    return { url: data.signedUrl, usage };
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    return { url: null, usage: ZERO };
  }
}

async function planJson<T>(system: string, prompt: string, schema: object, abortSignal: AbortSignal | undefined, attachments: ImagePart[] = []): Promise<{ plan: T; usage: TokenUsage }> {
  const res = await getClient().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }, ...attachments.map((a) => ({ inlineData: a }))] }],
    config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens: 8192, abortSignal },
  });
  return { plan: JSON.parse(res.text ?? "{}") as T, usage: addUsage(ZERO, res.usageMetadata) };
}

const HEX = /^#[0-9a-f]{6}$/i;

// ------------------------------------------------------------ homepage

// Korean-capable display faces on Google Fonts; body text is Pretendard.
const DISPLAY_FONTS: Record<string, string | null> = {
  Pretendard: null,
  "Noto Serif KR": "Noto+Serif+KR:wght@400;600;700;900",
  "Gowun Batang": "Gowun+Batang:wght@400;700",
  "Nanum Myeongjo": "Nanum+Myeongjo:wght@400;700;800",
  "Song Myung": "Song+Myung",
  "IBM Plex Sans KR": "IBM+Plex+Sans+KR:wght@400;600;700",
  "Black Han Sans": "Black+Han+Sans",
  "Do Hyeon": "Do+Hyeon",
  "Gowun Dodum": "Gowun+Dodum",
};

const PRETENDARD_LINK = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';
const fontLinkTag = (family: string) => `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${family}&display=swap">`;

interface SitePlan {
  concept: string;
  mood: string[];
  palette: { background: string; surface: string; text: string; muted: string; primary: string; accent: string };
  display_font: string;
  layout_direction: string;
  primary_action: string;
  sections: { id: string; title: string; goal: string; layout: string }[];
  images: { id: string; ratio: AspectRatio; prompt: string; alt: string; section: string }[];
}

const SITE_PLAN_SCHEMA = {
  type: "object",
  properties: {
    concept: { type: "string", description: "이 사이트의 디자인 콘셉트 한 문장 (한국어). 업종의 뻔한 클리셰가 아니라 이 가게만의 이야기에서 나온 것" },
    mood: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5, description: "무드 키워드 (한국어)" },
    palette: {
      type: "object",
      description: "브랜드 컬러가 있으면 그것을 primary로. 대비(WCAG AA)를 지키는 HEX 6자리",
      properties: {
        background: { type: "string" },
        surface: { type: "string" },
        text: { type: "string" },
        muted: { type: "string" },
        primary: { type: "string" },
        accent: { type: "string" },
      },
      required: ["background", "surface", "text", "muted", "primary", "accent"],
    },
    display_font: { type: "string", enum: Object.keys(DISPLAY_FONTS), description: "헤드라인 서체" },
    layout_direction: { type: "string", description: "레이아웃 방향 (예: 풀스크린 사진 히어로 + 비대칭 에디토리얼 그리드 + 넉넉한 여백)" },
    primary_action: { type: "string", description: "방문자가 할 단 하나의 행동과 버튼 문구 (한국어)" },
    sections: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "영문 소문자 id (예: story, menu, process)" },
          title: { type: "string", description: "섹션 제목 (한국어, 실제 사이트에 쓸 문구)" },
          goal: { type: "string", description: "이 섹션이 방문자에게 하는 일" },
          layout: { type: "string", description: "이 섹션만의 레이아웃 (예: 좌측 대형 사진 + 우측 텍스트, 3열 벤토 그리드, 가로 숫자 띠, 단계 타임라인)" },
        },
        required: ["id", "title", "goal", "layout"],
      },
    },
    images: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      description: "사이트에 들어갈 사진 4장. 첫 장은 반드시 id 'hero'.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["hero", "photo1", "photo2", "photo3"] },
          ratio: { type: "string", enum: ["16:9", "4:3", "3:4", "1:1"] },
          section: { type: "string", description: "이 사진이 들어갈 섹션 id" },
          alt: { type: "string", description: "대체 텍스트 (한국어)" },
          prompt: {
            type: "string",
            description:
              "English image prompt like a photo director's brief: the exact subject from THIS business, setting, camera angle and lens, light direction and quality, surface and props, color grade matching the palette, mood, composition. Hero: wide, with calm negative space for a headline. Vary the four shots (hero scene, product detail close-up, space/ambience, hands at work or customer moment — no identifiable faces).",
          },
        },
        required: ["id", "ratio", "section", "alt", "prompt"],
      },
    },
  },
  required: ["concept", "mood", "palette", "display_font", "layout_direction", "primary_action", "sections", "images"],
} as const;

const SITE_BRIEF = `You are the lead designer and front-end engineer at an award-winning Seoul branding studio. You build a complete, production-quality single-file website for a Korean small business, following the art director's plan exactly. The result must look like a real premium brand site (Awwwards / Framer-template quality), never like a generic template.

OUTPUT: only the HTML document, starting with <!doctype html>. No markdown fences, no commentary.

STACK — the page must be fully self-contained and render instantly without JavaScript:
- All styling is your own hand-written CSS in one <style> block: a design-token layer of CSS custom properties from the plan's palette (--bg, --surface, --ink, --muted, --primary, --accent), a type scale with clamp(), spacing tokens, then components and sections. Use modern CSS (grid, flex, gap, aspect-ratio, clamp, color-mix, backdrop-filter, :focus-visible, @media for 640/960/1200px). No CSS framework, no Tailwind, no CDN scripts.
- Fonts: do NOT write any font <link> or @import — the server adds them. Just use font-family "Pretendard" for body text and the plan's display font for headings, each with a system-font fallback stack.
- Icons are small inline <svg> elements (stroke icons, currentColor, 1.75 stroke width) that you draw yourself. No icon libraries.
- One small inline <script> at the end for the mobile menu toggle, the reveal-on-scroll IntersectionObserver and the current year; everything must still look complete if it never runs. Use word-break: keep-all and text-wrap: balance for Korean headings.

ORIGINAL CODE: write this page from scratch for this business. Prefix every class name, id and CSS custom property with the site prefix given below (e.g. .PREFIX-hero, --PREFIX-ink), and do not reproduce any existing template, theme or tutorial markup.

IMAGES: use exactly these placeholders as src/background URLs, each exactly once (never the same photo twice), hero first: {{IMG:hero}}, {{IMG:photo1}}, {{IMG:photo2}}, {{IMG:photo3}}. No other image URLs. Give every <img> its alt text, object-cover, and a sized, rounded container; lazy-load all but the hero.

DESIGN (all required):
- Sticky translucent header (backdrop-blur) with wordmark, section links and the primary action button; a working mobile menu (hamburger toggling a panel).
- Hero: full-viewport photo ({{IMG:hero}}) with a tasteful gradient overlay for contrast, a large expressive display headline (clamp() sizing, tight leading, keep-all), a sub-line, primary and secondary buttons, and one small trust or detail line.
- Every section has its OWN layout from the plan (split image/text, bento grid, stat band, numbered process timeline, gallery, menu/price cards, FAQ accordion with <details>, final CTA band over an image or color field, rich footer). Never repeat the same layout twice in a row. Alternate background tones (bg / surface / primary-tinted / dark band) to create rhythm.
- Real visual craft: generous spacing scale, max-width containers, 12-column thinking, large type contrast, subtle borders and layered shadows, generously rounded cards (16–28px), hover lift and image zoom transitions, focus-visible rings, smooth scroll.
- Motion: reveal-on-scroll with IntersectionObserver that adds a class; the hidden starting state applies ONLY under html.js (set document.documentElement.classList.add('js') first), so the page is fully visible without JavaScript. Respect prefers-reduced-motion.
- Mobile-first and flawless from 360px to 1440px (test mentally: nav, hero text size, grids collapsing to one column, no horizontal scroll).
- Semantic HTML, one h1, meta description, Open Graph title/description, lang="ko", theme-color.

PRICES AND OFFERS (strict): every price, product tier, quantity (stems, grams, minutes, sessions), discount, free gift, guarantee or statistic on the page must appear in the user's input. Do not add extra tiers or sizes to fill a three-card grid — show only the items the user gave (one or two cards is fine), and write [입력 필요] where a detail is missing. The same applies to reviews, awards, certifications, years in business and origins.

CONTENT: all visible copy in natural, specific Korean written for THIS business — its product, place, customers and the user's own words. Headlines are claims or invitations, not labels. No lorem ipsum, no "여기에 소개글", no English filler. Follow the facts rules below strictly: use the user's contact/address/hours/prices verbatim; anything not given is written as [입력 필요]; never invent reviews, awards, statistics, certifications or origins.`;

function fallbackImage(p: SitePlan["palette"]): string {
  const a = HEX.test(p.primary) ? p.primary : "#4D7CFE";
  const b = HEX.test(p.accent) ? p.accent : "#0FA89B";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Placeholders a page can carry when some or all photos weren't made. */
export function fillMissingImages(html: string, palette?: SitePlan["palette"]): string {
  const fb = fallbackImage(palette ?? { background: "", surface: "", text: "", muted: "", primary: "#4D7CFE", accent: "#0FA89B" });
  return html.replace(/\{\{IMG:[a-z0-9_-]+\}\}/gi, fb).replaceAll("{{HERO_IMAGE_URL}}", fb);
}

/**
 * Writes the page. Gemini's recitation filter sometimes empties a reply
 * that resembles existing code (portfolio templates trip it often), so
 * two Pro attempts with different seeds and a fast-model backup run at
 * the same time: the first Pro page wins, the backup is used only if
 * both Pro replies were blocked. The run takes as long as one attempt.
 */
async function writePage(system: string, prompt: string, abortSignal: AbortSignal | undefined, attachments: ImagePart[] = []): Promise<{ html: string; usage: TokenUsage }> {
  let usage = ZERO;
  // Losing attempts are cancelled once a page is chosen (or the run is).
  const race = new AbortController();
  const stop = () => race.abort();
  abortSignal?.addEventListener("abort", stop);
  const attempt = async (model: string) => {
    const res = await getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }, ...attachments.map((a) => ({ inlineData: a }))] }],
      config: {
        systemInstruction: system,
        maxOutputTokens: 65_536,
        seed: Math.floor(Math.random() * 2 ** 31),
        // The plan already did the thinking; low thinking keeps a full
        // page well inside the route's 300 s budget.
        ...(model === PRO_TEXT_MODEL ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: race.signal,
      },
    });
    usage = addUsage(usage, res.usageMetadata);
    const html = extractHtml(res.text ?? "");
    if (!html) {
      console.error("homepage: no page in reply", JSON.stringify({ model, finish: res.candidates?.[0]?.finishReason, block: res.promptFeedback?.blockReason, len: res.text?.length ?? 0 }));
      throw new Error("no page");
    }
    return html;
  };

  const backup = attempt(TEXT_MODEL).catch(() => null);
  const pro = await Promise.any([attempt(PRO_TEXT_MODEL), attempt(PRO_TEXT_MODEL)]).catch(() => null);
  if (abortSignal?.aborted) throw new Error("aborted");
  const html = pro ?? (await backup);
  stop();
  abortSignal?.removeEventListener("abort", stop);
  if (!html) throw new Error("홈페이지를 만들지 못했습니다. 입력 내용을 조금 바꿔 다시 시도해 주세요.");
  return { html, usage };
}

export async function generateHomepage(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<{ output: unknown; sources: Source[]; usage: TokenUsage }> {
  // No web research step here: the art director and the Pro model know
  // what good brand sites look like, and the run needs the time budget
  // for the page and its photos.
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });
  const brief = `${buildContext(manifest, input, profile)}\n\n오늘 날짜: ${today} (저작권 연도 등에 사용)`;
  let usage = ZERO;
  const started = Date.now();
  // "참고 자료" images and PDFs (an old site's screenshot, a brochure).
  const refParts = referenceParts(input, { documents: true });

  const { plan, usage: planUsage } = await planJson<SitePlan>(
    [
      "당신은 서울의 브랜딩 스튜디오 아트 디렉터입니다. 소상공인의 홈페이지를 만들기 전에 디자인 콘셉트, 색, 서체, 섹션 구성, 촬영 목록을 정합니다.",
      "업종의 뻔한 클리셰(베이커리=파스텔, 병원=파란색)를 피하고, 이 가게의 입력 내용에서 고유한 콘셉트를 찾으세요. 브랜드 컬러가 있으면 반드시 primary로 쓰세요.",
      "섹션은 입력의 '필요 섹션'을 모두 포함하고, 방문자가 한 가지 행동으로 이어지는 순서로 배치하세요.",
    ].join("\n"),
    `다음 가게의 홈페이지를 기획하세요.\n\n${brief}`,
    SITE_PLAN_SCHEMA,
    abortSignal,
    refParts,
  );
  usage = sumUsage(usage, planUsage);

  const palette = plan.palette;

  const system = [
    SITE_BRIEF,
    "",
    "[Facts and quality rules from the product]",
    ...buildBaseInstruction(manifest).slice(1),
  ].join("\n");

  // A random class prefix keeps the markup original, which also keeps
  // Gemini's recitation filter (it blocks output that matches known
  // code — common for portfolio templates) from emptying the reply.
  const prefix = `h${Math.random().toString(36).slice(2, 5)}`;
  const pagePrompt = `[Art director's plan]\n${JSON.stringify(plan, null, 2)}\n\nSite prefix for every class, id and CSS variable: ${prefix}\n\n[Business input and profile]\n${brief}\n\nBuild the complete site now.`;

  // Photos and the page are made at the same time; the page only needs
  // the placeholder names.
  const [page, ...shots] = await Promise.all([
    writePage(system, pagePrompt, abortSignal, refParts),
    ...plan.images.map((img) => shoot(img.prompt, img.ratio, img.id, "homepage", storage, abortSignal)),
  ]);
  usage = sumUsage(usage, page.usage);
  shots.forEach((s) => (usage = sumUsage(usage, s.usage)));
  console.info(`homepage: plan+page+photos in ${Math.round((Date.now() - started) / 1000)}s, photos ${shots.filter((s) => s.url).length}/${shots.length}`);

  let html = page.html;
  // Font links are added here rather than written by the model: exact,
  // widely copied lines like these are what trips the recitation filter.
  const fonts = [PRETENDARD_LINK, ...(DISPLAY_FONTS[plan.display_font] ? [fontLinkTag(DISPLAY_FONTS[plan.display_font]!)] : [])].join("\n");
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fonts}\n</head>`) : html.replace(/<body/i, `<head>${fonts}</head>\n<body`);
  plan.images.forEach((img, i) => {
    const url = shots[i].url;
    if (url) html = html.replaceAll(`{{IMG:${img.id}}}`, url);
  });
  html = fillMissingImages(html, palette);
  // Prices the user gave — typed, or in their reference material (a menu,
  // the old site) — are kept; any other won amount becomes [입력 필요].
  const givenText = [...Object.values(input).filter((v): v is string => typeof v === "string"), referenceOf(input)?.text ?? ""].join("\n");
  html = redactInventedPrices(html, givenText);

  return {
    output: {
      html,
      sections: plan.sections.map((s) => s.title),
      hero_image_prompt: plan.images[0]?.prompt ?? "",
      preview_url: "",
      zip_asset_id: "",
      design: {
        concept: plan.concept,
        mood: plan.mood,
        palette: Object.values(palette).filter((c) => HEX.test(c)),
        display_font: plan.display_font,
      },
    },
    sources: [],
    usage,
  };
}

// ------------------------------------------------------------ presentation

interface DeckVisualPlan {
  accent_color: string;
  cover_prompt: string;
  slide_images: { slide_index: number; prompt: string }[];
}

const DECK_VISUAL_SCHEMA = {
  type: "object",
  properties: {
    accent_color: { type: "string", description: "덱의 대표 색 HEX 6자리. 브랜드 컬러가 있으면 그것, 없으면 주제와 톤에 맞게. 흰 글씨가 잘 읽히는 진한 색" },
    cover_prompt: {
      type: "string",
      description:
        "English prompt for the cover background photo: a cinematic, wide scene that captures the deck's core idea for THIS business, with calm dark or blurred areas where a white title will sit on the left. Specific subject, place, light, color grade.",
    },
    slide_images: {
      type: "array",
      maxItems: 4,
      description: "사진이 설득력을 더하는 슬라이드만 (표·그래프·숫자가 핵심인 장은 제외). 3~4장.",
      items: {
        type: "object",
        properties: {
          slide_index: { type: "integer", description: "0부터 시작하는 슬라이드 번호" },
          prompt: {
            type: "string",
            description: "English photo prompt for this slide's claim: specific subject, setting, angle, light, color grade consistent with the cover. Portrait-ish composition. No identifiable faces.",
          },
        },
        required: ["slide_index", "prompt"],
      },
    },
  },
  required: ["accent_color", "cover_prompt", "slide_images"],
} as const;

/** Cover and slide photos plus a brand accent for a written deck. */
export async function addPresentationVisuals(
  deck: { title?: string; storyline?: string; slides: { headline: string; points: string[]; visual?: string }[] } & Record<string, unknown>,
  contextText: string,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<{ output: unknown; usage: TokenUsage }> {
  let usage = ZERO;
  let plan: DeckVisualPlan;
  try {
    const r = await planJson<DeckVisualPlan>(
      "당신은 투자 설명회 덱을 만드는 프레젠테이션 아트 디렉터입니다. 덱 전체가 하나의 사진 톤과 색으로 보이도록 표지와 슬라이드 사진을 기획합니다.",
      `[발표 요청]\n${contextText}\n\n[덱]\n${JSON.stringify({ title: deck.title, storyline: deck.storyline, slides: deck.slides.map((s, i) => ({ index: i, headline: s.headline, visual: s.visual })) })}`,
      DECK_VISUAL_SCHEMA,
      abortSignal,
    );
    plan = r.plan;
    usage = sumUsage(usage, r.usage);
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    return { output: deck, usage };
  }

  const wanted = plan.slide_images.filter((s) => s.slide_index >= 0 && s.slide_index < deck.slides.length).slice(0, 4);
  const [cover, ...shots] = await Promise.all([
    shoot(plan.cover_prompt, "16:9", "cover", "presentation", storage, abortSignal),
    ...wanted.map((s) => shoot(s.prompt, "3:4", `slide-${s.slide_index + 1}`, "presentation", storage, abortSignal)),
  ]);
  [cover, ...shots].forEach((s) => (usage = sumUsage(usage, s.usage)));
  const bySlide = new Map(wanted.map((s, i) => [s.slide_index, shots[i].url]));

  return {
    output: {
      ...deck,
      accent_color: HEX.test(plan.accent_color) ? plan.accent_color : undefined,
      cover_image_url: cover.url ?? undefined,
      slides: deck.slides.map((s, i) => ({ ...s, image_url: bySlide.get(i) ?? undefined })),
    },
    usage,
  };
}

// ------------------------------------------------------------ blog, copy, strategy

interface ShotList {
  shots: { key: string; prompt: string; caption: string }[];
}

const shotListSchema = (keys: string[], ratioHint: string) => ({
  type: "object",
  properties: {
    shots: {
      type: "array",
      minItems: keys.length,
      maxItems: keys.length,
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: keys },
          caption: { type: "string", description: "한국어 한 줄 설명 (이 사진이 무엇을 보여주는지)" },
          prompt: {
            type: "string",
            description: `English photo brief: the exact subject from THIS business, setting, angle and lens, light, props, color grade shared by every shot in the set, mood, composition (${ratioHint}). No identifiable faces, no text.`,
          },
        },
        required: ["key", "caption", "prompt"],
      },
    },
  },
  required: ["shots"],
});

async function shootSet(
  system: string,
  brief: string,
  keys: { key: string; ratio: AspectRatio }[],
  folder: string,
  storage: ImageStorageContext,
  abortSignal: AbortSignal | undefined,
): Promise<{ shots: Map<string, { url: string; caption: string }>; usage: TokenUsage }> {
  let usage = ZERO;
  const out = new Map<string, { url: string; caption: string }>();
  let plan: ShotList;
  try {
    const r = await planJson<ShotList>(system, brief, shotListSchema(keys.map((k) => k.key), keys.map((k) => `${k.key}: ${k.ratio}`).join(", ")), abortSignal);
    plan = r.plan;
    usage = sumUsage(usage, r.usage);
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    return { shots: out, usage };
  }
  const results = await Promise.all(
    keys.map(async ({ key, ratio }) => {
      const shot = plan.shots.find((s) => s.key === key);
      if (!shot) return null;
      const r = await shoot(shot.prompt, ratio, key, folder, storage, abortSignal);
      usage = sumUsage(usage, r.usage);
      return r.url ? ([key, { url: r.url, caption: shot.caption }] as const) : null;
    }),
  );
  for (const r of results) if (r) out.set(r[0], r[1]);
  return { shots: out, usage };
}

type Obj = Record<string, unknown>;

/**
 * Pictures for the text tools whose work is visual in use: a blog post's
 * cover and in-body photos, a campaign's ad visual per angle, a
 * strategy's mood board. Best effort — the written result stands alone.
 */
export async function addToolVisuals(
  toolId: string,
  output: unknown,
  contextText: string,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<{ output: unknown; usage: TokenUsage }> {
  const o = (output ?? {}) as Obj;

  if (toolId === "blog") {
    const slots = (Array.isArray(o.image_slots) ? o.image_slots : []).slice(0, 3) as Obj[];
    const keys = [{ key: "cover", ratio: "16:9" as AspectRatio }, ...slots.map((_, i) => ({ key: `slot${i + 1}`, ratio: "4:3" as AspectRatio }))];
    const { shots, usage } = await shootSet(
      "당신은 네이버 블로그 상위 글의 사진을 찍는 에디토리얼 포토그래퍼입니다. 글의 표지 사진과 본문 사진을 하나의 톤으로 기획합니다. 이 가게·주제의 실제 모습처럼 보여야 하고, 스톡 사진처럼 보이면 안 됩니다.",
      `[요청]\n${contextText}\n\n[글]\n제목: ${(o.titles as string[] | undefined)?.[0] ?? ""}\n소제목: ${JSON.stringify(o.h2_outline ?? [])}\n\n[사진 자리]\ncover: 글 맨 위 대표 사진\n${slots.map((s, i) => `slot${i + 1}: ${s.after_section} 뒤 — ${s.purpose} (${s.prompt})`).join("\n")}`,
      keys,
      "blog",
      storage,
      abortSignal,
    );
    return {
      output: {
        ...o,
        cover_image_url: shots.get("cover")?.url,
        image_slots: (Array.isArray(o.image_slots) ? (o.image_slots as Obj[]) : []).map((s, i) => ({ ...s, image_url: shots.get(`slot${i + 1}`)?.url })),
      },
      usage,
    };
  }

  if (toolId === "copy") {
    const angles = (Array.isArray(o.angles) ? o.angles : []).slice(0, 4) as Obj[];
    const { shots, usage } = await shootSet(
      "당신은 인스타그램·메타 광고 소재를 만드는 캠페인 아트 디렉터입니다. 각 광고 각도(동기)마다 스크롤을 멈추게 하는 피드 광고 사진을 한 장씩 기획합니다. 캠페인 전체가 같은 색감과 세계관으로 보여야 하고, 사진 위쪽이나 아래쪽에 카피를 올릴 여백을 남깁니다.",
      `[요청]\n${contextText}\n\n[핵심 메시지]\n${String(o.core_message ?? "")}\n\n[광고 각도]\n${angles.map((a, i) => `angle${i + 1}: ${a.motivation} — ${a.headline} / ${a.body}`).join("\n")}`,
      angles.map((_, i) => ({ key: `angle${i + 1}`, ratio: "4:5" as AspectRatio })),
      "copy",
      storage,
      abortSignal,
    );
    return {
      output: { ...o, angles: (Array.isArray(o.angles) ? (o.angles as Obj[]) : []).map((a, i) => ({ ...a, image_url: shots.get(`angle${i + 1}`)?.url })) },
      usage,
    };
  }

  if (toolId === "strategy") {
    const territory = (Array.isArray(o.territories) ? (o.territories as Obj[]) : []).find((t) => t.name === o.recommended_territory) ?? (o.territories as Obj[] | undefined)?.[0];
    const { shots, usage } = await shootSet(
      "당신은 브랜드 전략을 시각화하는 무드보드 디렉터입니다. 추천 캠페인 방향의 세계관을 세 장의 사진(공간·장면, 제품·디테일, 고객의 순간)으로 보여줍니다. 세 장은 같은 색감과 빛으로 하나의 브랜드처럼 보여야 합니다.",
      `[요청]\n${contextText}\n\n[포지셔닝]\n${String(o.positioning_statement ?? "")}\n[약속]\n${String(o.promise ?? "")}\n[추천 방향]\n${JSON.stringify(territory ?? {})}\n\nmood1: 공간·장면 (16:9)\nmood2: 제품·디테일 (1:1)\nmood3: 고객의 순간 (1:1)`,
      [
        { key: "mood1", ratio: "16:9" },
        { key: "mood2", ratio: "1:1" },
        { key: "mood3", ratio: "1:1" },
      ],
      "strategy",
      storage,
      abortSignal,
    );
    const board = ["mood1", "mood2", "mood3"].flatMap((k) => {
      const s = shots.get(k);
      return s ? [{ url: s.url, caption: s.caption }] : [];
    });
    return { output: board.length ? { mood_board: board, ...o } : o, usage };
  }

  return { output, usage: ZERO };
}
