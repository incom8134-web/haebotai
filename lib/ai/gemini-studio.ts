import "server-only";
import { ThinkingLevel } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { buildBaseInstruction, buildContext } from "@/lib/tools/generate-prompt";
import { redactInventedPrices } from "@/lib/tools/price-guard";
import { addUsage, generateOneImage, getClient, TEXT_MODEL, type AspectRatio } from "./gemini";
import type { ImageStorageContext, TokenUsage } from "./types";

// The two visual tools, done the way a design studio would: an art
// director first fixes the concept, palette, type and shot list; the
// Pro model then builds the page (or the deck is written by it), while
// the Pro image model shoots every picture in parallel. Pictures go to
// storage and come back as long-lived signed URLs, so a run row stays
// small and the downloaded HTML still shows them.

export const PRO_TEXT_MODEL = "gemini-3.1-pro-preview";
const IMAGE_MODELS = ["gemini-3-pro-image", "gemini-3.1-flash-image"];
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
  for (const model of IMAGE_MODELS) {
    try {
      const manifest = { id: "image", name_ko: "해봇 비주얼", summary: "브랜드 비주얼 사진", model } as ToolManifest;
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
    }
  }
  return { url: null, usage: ZERO };
}

async function planJson<T>(system: string, prompt: string, schema: object, abortSignal: AbortSignal | undefined): Promise<{ plan: T; usage: TokenUsage }> {
  const res = await getClient().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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
- Fonts (the only external requests): Pretendard for body — <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"> — plus the display font's Google Fonts <link> given below when it isn't Pretendard, each with a system-font fallback stack.
- Icons are small inline <svg> elements (stroke icons, currentColor, 1.75 stroke width) that you draw yourself. No icon libraries.
- One small inline <script> at the end for the mobile menu toggle, the reveal-on-scroll IntersectionObserver and the current year; everything must still look complete if it never runs. Use word-break: keep-all and text-wrap: balance for Korean headings.

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

  const { plan, usage: planUsage } = await planJson<SitePlan>(
    [
      "당신은 서울의 브랜딩 스튜디오 아트 디렉터입니다. 소상공인의 홈페이지를 만들기 전에 디자인 콘셉트, 색, 서체, 섹션 구성, 촬영 목록을 정합니다.",
      "업종의 뻔한 클리셰(베이커리=파스텔, 병원=파란색)를 피하고, 이 가게의 입력 내용에서 고유한 콘셉트를 찾으세요. 브랜드 컬러가 있으면 반드시 primary로 쓰세요.",
      "섹션은 입력의 '필요 섹션'을 모두 포함하고, 방문자가 한 가지 행동으로 이어지는 순서로 배치하세요.",
    ].join("\n"),
    `다음 가게의 홈페이지를 기획하세요.\n\n${brief}`,
    SITE_PLAN_SCHEMA,
    abortSignal,
  );
  usage = sumUsage(usage, planUsage);

  const palette = plan.palette;
  const fontLink = DISPLAY_FONTS[plan.display_font]
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${DISPLAY_FONTS[plan.display_font]}&display=swap">`
    : "(display font is Pretendard — no extra link)";

  const system = [
    SITE_BRIEF,
    "",
    "[Facts and quality rules from the product]",
    ...buildBaseInstruction(manifest).slice(1),
  ].join("\n");

  const pagePrompt = `[Art director's plan]\n${JSON.stringify(plan, null, 2)}\n\nDisplay font link: ${fontLink}\n\n[Business input and profile]\n${brief}\n\nBuild the complete site now.`;

  // Photos and the page are made at the same time; the page only needs
  // the placeholder names.
  const [page, ...shots] = await Promise.all([
    getClient().models.generateContent({
      model: PRO_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: pagePrompt }] }],
      // The plan already did the thinking; low thinking keeps a full page
      // well inside the route's 300 s budget.
      config: { systemInstruction: system, maxOutputTokens: 65_536, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, abortSignal },
    }),
    ...plan.images.map((img) => shoot(img.prompt, img.ratio, img.id, "homepage", storage, abortSignal)),
  ]);
  usage = addUsage(usage, page.usageMetadata);
  shots.forEach((s) => (usage = sumUsage(usage, s.usage)));
  console.info(`homepage: plan+page+photos in ${Math.round((Date.now() - started) / 1000)}s, photos ${shots.filter((s) => s.url).length}/${shots.length}`);

  let html = (page.text ?? "").trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
  if (!/<html[\s>]/i.test(html)) throw new Error("홈페이지 HTML을 만들지 못했습니다");
  plan.images.forEach((img, i) => {
    const url = shots[i].url;
    if (url) html = html.replaceAll(`{{IMG:${img.id}}}`, url);
  });
  html = fillMissingImages(html, palette);
  html = redactInventedPrices(html, Object.values(input).filter((v) => typeof v === "string").join("\n"));

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
