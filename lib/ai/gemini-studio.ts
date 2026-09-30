import "server-only";
import { ThinkingLevel, type Part } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { buildBaseInstruction, buildContext, referenceOf, referenceParts } from "@/lib/tools/generate-prompt";
import { redactInventedPrices } from "@/lib/tools/price-guard";
import { extractHtml } from "@/lib/tools/html-extract";
import { addUsage, generateOneImage, getClient, PRO_IMAGE_MODEL, TEXT_MODEL, toGeminiParts, type AspectRatio } from "./gemini";
import type { ImageStorageContext, TokenUsage } from "./types";
import type { SceneType } from "@/lib/site-kit/kit";
import { assembleSite, toJs, unknownImports, viteProject } from "@/lib/site-kit/assemble";

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
    const manifest = { id: "image", name_ko: "브랜드 비주얼", summary: "브랜드 비주얼 사진", model: PRO_IMAGE_MODEL } as ToolManifest;
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

async function planJson<T>(system: string, prompt: string, schema: object, abortSignal: AbortSignal | undefined, attachments: Part[] = [], model: string = TEXT_MODEL): Promise<{ plan: T; usage: TokenUsage }> {
  const res = await getClient().models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }, ...attachments] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      maxOutputTokens: 16_384,
      ...(model === PRO_TEXT_MODEL ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      abortSignal,
    },
  });
  return { plan: JSON.parse(res.text ?? "{}") as T, usage: addUsage(ZERO, res.usageMetadata) };
}

const HEX = /^#[0-9a-f]{6}$/i;

// ------------------------------------------------------------ homepage

// Korean-capable faces on Google Fonts (each checked to load). Headings
// pick from the full range — editorial serifs, geometric, heavy display,
// handwriting, playful — and body text from the readable ones.
const DISPLAY_FONTS: Record<string, string | null> = {
  Pretendard: null,
  "Noto Serif KR": "Noto+Serif+KR:wght@400;600;700;900",
  "Gowun Batang": "Gowun+Batang:wght@400;700",
  "Nanum Myeongjo": "Nanum+Myeongjo:wght@400;700;800",
  "Song Myung": "Song+Myung",
  Hahmlet: "Hahmlet:wght@400;600;800",
  "IBM Plex Sans KR": "IBM+Plex+Sans+KR:wght@400;600;700",
  "Gothic A1": "Gothic+A1:wght@400;700;900",
  Orbit: "Orbit",
  "Black Han Sans": "Black+Han+Sans",
  "Do Hyeon": "Do+Hyeon",
  "Gasoek One": "Gasoek+One",
  "Bagel Fat One": "Bagel+Fat+One",
  Jua: "Jua",
  Dongle: "Dongle:wght@400;700",
  "Gowun Dodum": "Gowun+Dodum",
  "Nanum Pen Script": "Nanum+Pen+Script",
  "Hi Melody": "Hi+Melody",
  "Yeon Sung": "Yeon+Sung",
  Diphylleia: "Diphylleia",
};
const BODY_FONTS: Record<string, string | null> = {
  Pretendard: null,
  "Noto Sans KR": "Noto+Sans+KR:wght@400;500;700",
  "IBM Plex Sans KR": "IBM+Plex+Sans+KR:wght@400;600;700",
  "Gowun Dodum": "Gowun+Dodum",
  "Nanum Gothic": "Nanum+Gothic:wght@400;700;800",
  "Noto Serif KR": "Noto+Serif+KR:wght@400;600;700;900",
};

// The page's skeleton is chosen per run instead of fixed: every site used
// to be "sticky header + full-screen photo hero + 6-10 sections".
const HERO_ARCHETYPES = [
  "full-bleed photo with a gradient scrim and the headline over it",
  "split screen: huge headline on a solid color field on one side, tall photo on the other",
  "giant typographic hero: an oversized headline filling the width, a small framed photo tucked into the layout",
  "photo mosaic / collage of 3 images at different sizes with the headline overlapping one of them",
  "centered short statement on a bold color field, the photo starting right below as a wide band",
  "editorial magazine cover: masthead-style wordmark, issue-like date line, cover photo with captions",
  "offset frame: photo in an inset rounded frame, headline breaking out of the frame's edge",
  "horizontal strip: a row of cropped photos scrolling sideways under a one-line headline",
] as const;
const NAV_STYLES = [
  "sticky translucent top bar with links and the action button",
  "minimal: wordmark top-left and a single menu button opening a full-screen overlay",
  "floating pill-shaped nav centered near the top, detached from the edges",
  "no top links: a sticky bottom action bar on mobile and a small corner wordmark",
  "vertical side rail with section numbers on desktop, top bar on mobile",
] as const;
const SHAPES = ["sharp corners (0-2px) and hairline rules", "soft rounded cards (16-24px)", "pill buttons and circular image crops", "organic blob shapes and wavy dividers", "tilted sticker-like cards and badges"] as const;
const TEXTURES = ["none — pure flat color", "subtle film grain (an inline SVG noise filter)", "paper / linen tone with soft shadows", "visible layout grid lines as decoration", "large faded outline numbers or letters in the background"] as const;
const SIGNATURES = [
  "an infinite marquee text band",
  "a sticky booking/order bar that follows the scroll",
  "big numbered steps connected by a line",
  "a before/after or then/now comparison",
  "a horizontal scroll gallery",
  "a rotating circular text badge",
  "pull quotes set huge between sections",
  "a stats band with oversized numbers",
  "hand-drawn style underlines and arrows (inline SVG)",
  "a menu/price list styled like a printed menu board",
] as const;

// What each kind of site has to do, so a booking page and a portfolio
// don't come out with the same section list.
const PURPOSE_BLUEPRINT: Record<string, string> = {
  intro: "소개 사이트: 이 가게의 이야기와 공간·사람·원칙을 보여 주는 흐름. 방문·연락으로 끝납니다.",
  booking: "예약 사이트: 첫 화면과 스크롤 내내 예약 행동이 보이고(고정 예약 버튼·바), 가능한 시간/방법, 위치·찾아오는 길, 예약 전 궁금한 점(FAQ)을 짧게.",
  sales: "판매 사이트: 상품이 주인공 — 상품 그리드와 가격 카드, 선택을 돕는 비교, 배송·교환 안내, 구매 버튼 반복.",
  portfolio: "포트폴리오: 작업이 주인공 — 큰 이미지의 프로젝트 목록, 대표 작업 1~2개의 케이스 스토리(문제·과정·결과), 작업 방식, 의뢰 방법.",
  landing: "랜딩 페이지: 제안 하나에 집중 — 짧고 강한 흐름(약속 → 근거 → 제안 → 의심 해소 → 행동), 섹션 4~6개, 같은 행동 버튼 반복.",
};

const PRETENDARD_LINK = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';
const fontLinkTag = (family: string) => `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${family}&display=swap">`;

interface SitePlan {
  big_idea: string;
  request_details: string[];
  concept: string;
  mood: string[];
  palette: { background: string; surface: string; text: string; muted: string; primary: string; accent: string };
  display_font: string;
  body_font: string;
  hero_archetype: string;
  nav_style: string;
  shape_language: string;
  texture: string;
  signature_elements: string[];
  layout_direction: string;
  primary_action: string;
  sections: { id: string; title: string; goal: string; layout: string; content: string[] }[];
  interactions: { component: string; where: string; behavior: string }[];
  experience: {
    scene: SceneType | "none";
    scene_section: string;
    scene_reason: string;
    scene_text: string;
    scene_shapes: "soft" | "geometric" | "rings" | "mixed";
    scene_align: "center" | "left" | "right";
    scene_variant: string;
    scene_motion: "calm" | "lively" | "dramatic";
    scene_placement: "hero-background" | "hero-side" | "section-band" | "closing-cta";
    scroll_moments: string[];
    micro_interactions: string[];
  };
  images: { id: string; ratio: AspectRatio; prompt: string; alt: string; section: string }[];
}

const SITE_PLAN_SCHEMA = {
  type: "object",
  properties: {
    big_idea: {
      type: "string",
      description:
        "이 요청에서만 나올 수 있는 크리에이티브 빅 아이디어 한두 문장 (한국어). 방문자가 사이트를 스크롤하며 겪는 하나의 경험으로 표현 (예: '반죽이 16시간 발효되는 시간을 스크롤로 따라가며 빵이 완성된다'). 업종 일반론 금지",
    },
    request_details: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 12,
      description: "사용자 입력에 있는 구체적인 내용(상호, 지역, 상품·서비스명, 특징, 고객, 사용자가 쓴 표현, 요청한 기능)과 그것이 사이트 어디에 어떻게 보이는지 (한국어). 입력의 모든 구체적 요소가 빠짐없이 들어가야 함",
    },
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
    display_font: { type: "string", enum: Object.keys(DISPLAY_FONTS), description: "헤드라인 서체 — 콘셉트에 맞게 과감하게. 늘 같은 서체를 고르지 마세요" },
    body_font: { type: "string", enum: Object.keys(BODY_FONTS), description: "본문 서체" },
    hero_archetype: { type: "string", description: "첫 화면 구성 (영문, 아래 제안 목록 중 하나를 고르거나 콘셉트에 맞게 새로)" },
    nav_style: { type: "string", description: "내비게이션 방식 (영문)" },
    shape_language: { type: "string", description: "모서리·도형 언어 (영문)" },
    texture: { type: "string", description: "배경 질감 (영문)" },
    signature_elements: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, description: "이 사이트를 기억에 남게 할 시그니처 요소 1~3개 (영문)" },
    layout_direction: { type: "string", description: "레이아웃 방향 (예: 풀스크린 사진 히어로 + 비대칭 에디토리얼 그리드 + 넉넉한 여백)" },
    primary_action: { type: "string", description: "방문자가 할 단 하나의 행동과 버튼 문구 (한국어)" },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "영문 소문자 id (예: story, menu, process)" },
          title: { type: "string", description: "섹션 제목 (한국어, 실제 사이트에 쓸 문구)" },
          goal: { type: "string", description: "이 섹션이 방문자에게 하는 일" },
          layout: { type: "string", description: "이 섹션만의 레이아웃 (예: 좌측 대형 사진 + 우측 텍스트, 3열 벤토 그리드, 가로 숫자 띠, 단계 타임라인)" },
          content: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 8,
            description: "이 섹션에 실제로 들어갈 내용 목록 (한국어): 소제목, 카드별 항목, 버튼 문구, 사진, 입력에서 가져올 사실. 한 줄짜리 섹션이 되지 않게 구체적으로",
          },
        },
        required: ["id", "title", "goal", "layout", "content"],
      },
    },
    interactions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      description: "방문자가 직접 만지는 인터랙티브 요소 3~6개 — 사이트 목적에 맞게 고르세요: 메뉴·상품 탭/카테고리 필터, 사진 갤러리 + 확대 라이트박스, 사진/후기 캐러셀(좌우 버튼·스와이프), FAQ 아코디언, 스크롤 후 나타나는 고정 예약·주문 바, 예약/문의 폼(문자·이메일로 보내기), 지도 + 주소 복사 버튼, 숫자 카운트업(입력에 있는 숫자만), 전후 비교 슬라이더, 수량·옵션 선택 계산기",
      items: {
        type: "object",
        properties: {
          component: { type: "string", description: "요소 이름 (영문)" },
          where: { type: "string", description: "들어갈 섹션 id" },
          behavior: { type: "string", description: "동작을 구체적으로 (한국어)" },
        },
        required: ["component", "where", "behavior"],
      },
    },
    experience: {
      type: "object",
      description: "이 사이트의 몰입형 경험 — 3D 장면 하나와 스크롤 연출. 빅 아이디어를 몸으로 느끼게 하는 방향으로",
      properties: {
        scene: {
          type: "string",
          enum: ["liquid-image", "orb", "particles-text", "photo-ring", "waves", "floating", "aurora", "bokeh", "ribbons", "contours", "none"],
          description:
            "톤에 맞는 WebGL 장면 하나, 또는 none. liquid-image=사진이 커서에 일렁임(음식·패션·공간·예술), orb=변형되는 3D 구체(웰니스·뷰티·크리에이티브·테크), particles-text=입자가 상호나 형태를 그림(런칭·이벤트·테크), photo-ring=사진들의 3D 링 또는 갤러리 월(포트폴리오·갤러리·상품·공방), waves=흐르는 3D 지형(테크·컨설팅·제조·바다), floating=떠다니는 3D 도형(교육·키즈·유쾌한 브랜드·신제품), aurora=살아 있는 그라데이션(차분·고급·문구 중심), bokeh=부드러운 빛망울(카페·웨딩·호텔·따뜻하고 차분한 곳), ribbons=흐르는 리본(패션·뷰티·음악·웰니스), contours=등고선(아웃도어·여행·부동산·건축·컨설팅), none=3D 없이 절제된 CSS·GSAP 움직임만(법률·의료·장례·금융처럼 신뢰와 절제가 먼저인 곳, 또는 사진이 주인공이어야 할 때). [요청 분석]의 톤·에너지·피할 것에 맞춰 고르고, 무작위로 고르지 마세요",
        },
        scene_section: { type: "string", description: "장면이 들어갈 섹션 id (scene_placement와 맞게: 보통 hero)" },
        scene_variant: {
          type: "string",
          enum: ["", "glossy", "pearl", "wire", "text", "sphere", "wave", "ring", "wall", "dots", "lines", "mesh", "gloss", "glass", "matte", "metal", "flow", "soft", "dusk", "warm", "cool", "silk", "neon", "map", "fine"],
          description: "장면의 모습. orb: glossy(화려)·pearl(부드럽고 절제)·wire(테크·선) / particles-text: text·sphere·wave / photo-ring: ring(드래그 회전)·wall(차분한 갤러리 월) / waves: dots·lines(차분)·mesh(테크) / floating: gloss·glass(맑고 고급)·matte(따뜻·키즈)·metal(강렬) / aurora: flow·soft(가장 차분)·dusk(노을) / bokeh: warm·cool / ribbons: silk(우아)·neon(밤·음악) / contours: map·fine. none이면 빈 문자열",
        },
        scene_motion: { type: "string", enum: ["calm", "lively", "dramatic"], description: "움직임의 속도·세기 — 톤의 에너지와 맞게 (격식·고급·의료·교육은 calm, 대부분 lively, 이벤트·음악·스포츠는 dramatic)" },
        scene_placement: {
          type: "string",
          enum: ["hero-background", "hero-side", "section-band", "closing-cta"],
          description: "장면 위치: hero-background(첫 화면 전체 배경), hero-side(분할 첫 화면의 한쪽), section-band(중간의 몰입 띠 섹션), closing-cta(마지막 행동 섹션 배경). 사진이 주인공인 첫 화면이면 section-band나 closing-cta도 좋습니다",
        },
        scene_reason: { type: "string", description: "이 장면이 이 가게의 이야기와 어떻게 연결되는지 (한국어 한 문장)" },
        scene_text: { type: "string", description: "particles-text일 때 입자가 그릴 짧은 단어(상호, 12자 이내). 아니면 빈 문자열" },
        scene_shapes: { type: "string", enum: ["soft", "geometric", "rings", "mixed"], description: "floating일 때 도형 계열" },
        scene_align: { type: "string", enum: ["center", "left", "right"], description: "orb·floating의 화면 위치 — 헤드라인과 겹치지 않게" },
        scroll_moments: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
          description:
            "GSAP ScrollTrigger 스크롤 연출 3~6개를 구체적으로 (영문): 예) pinned horizontal scroll of the menu cards on desktop, headline words rising in on load, hero photo scale-down + clip-path reveal on scroll, parallax layers in the story section, scrubbed timeline line drawing between process steps, section background color shift, number count-up on enter",
        },
        micro_interactions: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 5,
          description: "작은 인터랙션 (영문): magnetic primary buttons, 3D tilt on cards, custom cursor label over gallery, hover image reveal on list rows, marquee that reacts to scroll speed, animated underline links 등",
        },
      },
      required: ["scene", "scene_section", "scene_reason", "scene_text", "scene_shapes", "scene_align", "scene_variant", "scene_motion", "scene_placement", "scroll_moments", "micro_interactions"],
    },
    images: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      description: "사이트에 들어갈 사진 7장. 첫 장은 반드시 id 'hero'. 나머지는 상품·디테일 클로즈업, 공간·분위기, 만드는 과정·손, 고객이 쓰는 순간(얼굴 없이), 갤러리용 컷 등 서로 다른 장면.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["hero", "photo1", "photo2", "photo3", "photo4", "photo5", "photo6"] },
          ratio: { type: "string", enum: ["16:9", "4:3", "3:4", "1:1"] },
          section: { type: "string", description: "이 사진이 들어갈 섹션 id" },
          alt: { type: "string", description: "대체 텍스트 (한국어)" },
          prompt: {
            type: "string",
            description:
              "English image prompt like a photo director's brief: the exact subject from THIS business, setting, camera angle and lens, light direction and quality, surface and props, color grade matching the palette, mood, composition. Hero: wide, with calm negative space for a headline. All seven shots are different scenes with one shared color grade (hero scene, product detail close-ups, space/ambience, hands at work, customer moment — no identifiable faces, no text).",
          },
        },
        required: ["id", "ratio", "section", "alt", "prompt"],
      },
    },
  },
  required: ["big_idea", "request_details", "experience", "concept", "mood", "palette", "display_font", "body_font", "hero_archetype", "nav_style", "shape_language", "texture", "signature_elements", "layout_direction", "primary_action", "sections", "interactions", "images"],
} as const;

const SITE_BRIEF = `You are the lead designer and front-end engineer at an award-winning Seoul branding studio. You build a complete, production-quality single-file website for a Korean small business, following the art director's plan exactly. The result must look like a real premium brand site (Awwwards / Framer-template quality), never like a generic template.

OUTPUT: only the HTML document, starting with <!doctype html>. No markdown fences, no commentary.

STACK — a modern front-end build, delivered as one HTML document with two parts:
1. Markup + CSS: semantic HTML and one <style> block of hand-written CSS — a design-token layer of CSS custom properties from the plan's palette (--bg, --surface, --ink, --muted, --primary, --accent), a fluid type scale with clamp(), spacing tokens, then components and sections. Modern CSS: grid, subgrid, container queries, aspect-ratio, clamp, color-mix, backdrop-filter, mix-blend-mode, clip-path, scroll-snap, :has(), :focus-visible, @media 640/960/1200px. No CSS framework, no Tailwind. The page must look complete and readable with this layer alone (no JS).
2. ONE TypeScript module: <script type="text/typescript"> … </script> placed right before </body> (the server compiles it to JavaScript and adds the import map — never write <script type="module">, an import map, or any CDN <script src>). It is real TypeScript: interfaces/types for data (menu items, FAQ, gallery), typed helpers, querySelector<HTMLElement>, null checks, no any where a type is obvious. Erasable syntax only (no enums, namespaces, decorators). It may import ONLY:
   - "three" and "three/addons/…" (Three.js r186)
   - "gsap", "gsap/ScrollTrigger", "gsap/SplitText", "gsap/Flip", "gsap/Observer" (GSAP 3.13, default export gsap)
   - "lenis" (Lenis 1.3 smooth scroll, default export)
   - "@site/kit" — the studio's tested WebGL kit:
     mountScene(host: HTMLElement | null, { type: "liquid-image" | "orb" | "particles-text" | "photo-ring" | "waves" | "floating" | "aurora" | "bokeh" | "ribbons" | "contours", variant?: string /* the plan's scene_variant */, motion?: "calm" | "lively" | "dramatic" /* the plan's scene_motion */, colors: string[] /* palette hexes */, image?: string /* liquid-image */, images?: string[] /* photo-ring */, text?: string /* particles-text */, shapes?: "soft" | "geometric" | "rings" | "mixed", align?: "center" | "left" | "right", intensity?: number /* 0..1 */ }): { setProgress(p: number): void; destroy(): void } | null
       — appends an absolutely positioned canvas filling host (give host position: relative/absolute, a real size, and keep a normal <img> or CSS background inside it as the fallback; returns null without WebGL). It handles resize, pointer, off-screen pausing and reduced motion itself.
     splitWords(el: Element | null): HTMLElement[] — wraps each word in .w > .wi spans and RETURNS THE .wi SPANS (animate the returned array directly, e.g. gsap.from(words, { yPercent: 110, stagger: 0.06 })); Korean-safe
     magnetic(selector: string, strength?: number) — buttons lean toward the pointer
     tilt(selector: string, maxDeg?: number) — cards tilt in 3D under the pointer
     prefersReducedMotion(): boolean
   Build the plan's experience exactly as planned — scene, scene_variant (pass as variant) and scene_motion (pass as motion) — at the plan's scene_placement: hero-background = the host fills the whole first screen (min-height: 100svh; position: absolute; inset: 0; z-index 0) with the headline, subline and buttons above it (position: relative; z-index: 1); hero-side = one half of a split first screen, text on the other half; section-band = a full-width immersive band (60–90svh) between content sections with one short statement over it; closing-cta = the background of the final call-to-action section. Keep text readable over any scene (text shadow, a soft scrim or a solid text panel). If the plan's scene is "none", do not import or mount any WebGL — carry the tone with refined motion only (GSAP reveals, parallax on photos, subtle hover states). For liquid-image the host holds the hero <img> and the scene distorts that same photo; for photo-ring the hero shows the ring of the site's photos with the headline over it. colors = the brand colors that stand out on the hero background (primary, accent, …) — never the background color itself. Mount it (read image URLs from the page's own <img> elements, e.g. document.querySelector<HTMLImageElement>(".PREFIX-hero img")?.src, never hard-coded); then Lenis smooth scroll wired to ScrollTrigger (const lenis = new Lenis({ autoRaf: false }); lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); anchor links use lenis.scrollTo(target, { offset: -headerHeight })); then every scroll moment and micro-interaction in the plan with gsap + ScrollTrigger, inside gsap.matchMedia() so pinned/horizontal effects run only at (min-width: 960px) and nothing animates under (prefers-reduced-motion: reduce). Structure the module as small named functions called from one init(), each wrapped so a failure in one never stops the others: const safe = (name: string, fn: () => void) => { try { fn(); } catch (e) { console.warn(name, e); } };
   Progressive enhancement: never hide content in CSS waiting for JS (no opacity: 0 or transform on .wi, reveal classes or sections in the stylesheet); animate with gsap.from()/fromTo() so content is visible if the module never runs. Scroll-triggered entrances use start: "top 85%" and once: true. Always null-check querySelector results before animating them. Everything interactive (tabs, lightbox, carousel, sticky bar, form, copy address, today's hours) is also implemented in this module.
- Fonts: do NOT write any font <link> or @import — the server adds them. Use the plan's body font for body text and the plan's display font for headings, each with a system-font fallback stack.
- Icons are small inline <svg> elements (stroke icons, currentColor, 1.75 stroke width) that you draw yourself. No icon libraries. Use word-break: keep-all and text-wrap: balance for Korean headings.

ORIGINAL CODE: write this page from scratch for this business. Prefix every class name, id and CSS custom property with the site prefix given below (e.g. .PREFIX-hero, --PREFIX-ink), and do not reproduce any existing template, theme or tutorial markup.

IMAGES: use exactly the placeholders listed in the plan's images ({{IMG:hero}}, {{IMG:photo1}} … {{IMG:photo6}}) as src/background URLs, each exactly once (never the same photo twice), hero first. No other image URLs. Give every <img> its alt text, object-cover, and a sized container; lazy-load all but the hero. Photos should be generous and varied in size (full-bleed bands, tall portrait crops, gallery grids), not small thumbnails.

DESIGN — the plan decides the page's skeleton; build exactly what it says, not a default template:
- Navigation: build the plan's nav_style exactly (it may be a floating pill, an overlay menu, a bottom bar, a side rail or a classic top bar). Whatever it is, it must work on mobile.
- Hero: build the plan's hero_archetype exactly, using {{IMG:hero}}. Do NOT fall back to "full-screen photo with a dark overlay" unless that is the archetype. Large expressive display headline (clamp() sizing, tight leading, keep-all) and the primary action.
- Shape language, texture and signature elements: apply the plan's shape_language and texture across the whole page and build every signature element for real (e.g. a working CSS marquee, a sticky bar, an SVG rotating badge).
- Sections: exactly the plan's sections, each with its OWN layout from the plan. Never repeat the same layout twice in a row. Alternate background tones to create rhythm. The page ends with a closing action and a footer with the business's facts.
- Real visual craft: generous spacing scale, max-width containers, 12-column thinking, large type contrast, subtle borders and layered shadows, generously rounded cards (16–28px), hover lift and image zoom transitions, focus-visible rings, smooth scroll.
- Motion: GSAP choreography from the plan (headline words rising in via splitWords, clip-path image reveals, parallax, pinned horizontal galleries on desktop, scrubbed progress lines) — expressive but never blocking reading; content stays visible without JS; respect prefers-reduced-motion.
- Immersion: the plan's scene (if any) is the site's signature moment at its placement — compose that section around it (headline layered over or beside the canvas, enough height, a scroll cue). Its speed and boldness follow the plan's scene_motion and the tone: calm sites stay quiet and precise, lively ones playful, dramatic ones bold.
- Mobile-first and flawless from 360px to 1440px (test mentally: nav, hero text size, grids collapsing to one column, no horizontal scroll).
- Semantic HTML, one h1, meta description, Open Graph title/description, lang="ko", theme-color.

INTERACTION (build every item in the plan's "interactions" for real in the TypeScript module; everything must still be usable without JS):
- Tabs / category filters switch content with aria-selected and keyboard support; galleries open a lightbox (click to enlarge, next/prev, Esc and backdrop close); carousels have prev/next buttons, dots and touch swipe; the FAQ uses <details>/<summary> with a styled marker; count-up numbers animate once when visible (only numbers from the input).
- A sticky action bar (booking / order / call) slides in after the hero is scrolled past, and hides near the footer.
- CONTACT UTILITIES from the user's facts only: tel: links for phone numbers, mailto: for email, a KakaoTalk channel link when a Kakao ID is given, and when an address is given a Google Maps embed (<iframe src="https://www.google.com/maps?q=URL-ENCODED-ADDRESS&output=embed" loading="lazy">) with a "주소 복사" button (navigator.clipboard) and a "길찾기" link. Opening hours shown as a clear table with today highlighted by JS.
- A booking / inquiry form (name, phone, preferred date/time, message) with inline validation; on submit it composes an SMS (sms:) or email (mailto:) to the business with the filled text — or, if neither is given, shows a friendly message to call or message instead. Never pretend it was sent to a server.
- Buttons everywhere they make sense: every section ends with a clear next action; primary and secondary button styles, hover/focus/active states, 44px touch targets.
- Micro-interactions: hover lift on cards, image zoom on hover, animated underline links, scroll progress bar or back-to-top button, smooth anchor scrolling with the sticky header offset.

STRUCTURE (robust layout): the document itself scrolls — never a 100vh/100svh container with overflow: auto/scroll, never scroll-snap on a wrapper, never overflow: hidden on html/body (Lenis and ScrollTrigger drive the window scroll). <body> is a plain vertical flow — nav/header, <main> with the sections in order, then <footer>. Never make <body> a grid or flex row; a side rail or split layout lives inside one section (or uses position: sticky/fixed), and the footer always spans the full width at the bottom. Each section is full width with its own inner container; nothing may overlap the next section or overflow at 360px.

PURPOSE: a booking site has a real booking form (name, date/time, menu or service, request) that composes an sms:/mailto: message plus a tel: button; a sales site has product cards with a clear order/buy action; a portfolio has a filterable gallery with a lightbox; a landing page repeats one primary call to action at least three times.

CONTENT DEPTH: build each section from the plan's section "content" list — real headings, several items per card grid, supporting copy, captions under photos, and a button. No section is a single sentence. The footer carries the business facts (address, hours, phone, SNS), quick links and the copyright.

PRICES AND OFFERS (strict): every price, product tier, quantity (stems, grams, minutes, sessions), discount, free gift, guarantee or statistic on the page must appear in the user's input. Do not add extra tiers or sizes to fill a three-card grid — show only the items the user gave (one or two cards is fine), and write [입력 필요] where a detail is missing. Never build a statistic, count-up or big-number card around a missing figure — drop that card instead of showing a big "[입력 필요]"; use count-ups only for numbers the user gave. The same applies to reviews, awards, certifications, years in business and origins.

CONTENT: all visible copy in natural, specific Korean written for THIS business — its product, place, customers and the user's own words. Headlines are claims or invitations, not labels. No lorem ipsum, no "여기에 소개글", no English filler. Follow the facts rules below strictly: use the user's contact/address/hours/prices verbatim; anything not given is written as [입력 필요]; never invent reviews, awards, statistics, certifications or origins.`;

const REVIEW_BRIEF = `You are the creative director and senior front-end reviewer at the same studio. A designer handed you the draft page below. Audit it hard against the art director's plan and this checklist, then return the COMPLETE improved HTML document (only the HTML, starting with <!doctype html>, keeping the same two-part stack: markup + one <style>, and ONE <script type="text/typescript"> module before </body> that imports only three, three/addons/…, gsap, gsap/ScrollTrigger|SplitText|Flip|Observer, lenis and @site/kit):
0. Specific, not generic: the big idea and every item in request_details is visible on the page; a visitor could not mistake this for another business's site. Rewrite anything that reads like template filler.
0b. The TypeScript module compiles (valid TS, erasable types, no stray markup), mounts the plan's scene (if it has one) with mountScene using the plan's variant, motion and placement (host sized, fallback image inside), and imports no WebGL when the scene is "none", wires Lenis to ScrollTrigger, builds every scroll moment and micro-interaction from the plan, and wraps each feature in safe(). Fix any API misuse of three/gsap/lenis.
1. The hero, navigation, shape language, texture and signature elements match the plan — nothing reads like a generic template.
2. Every interaction in the plan works (tabs, lightbox, carousel with swipe, accordion, sticky action bar, count-up, form composing sms:/mailto:, map embed with copy-address, today's hours highlight) and degrades gracefully without JS.
3. Every section has real depth from the plan's content list, a clear next-step button, and a distinct layout; no section is thin or repetitive.
4. All seven photo placeholders are used exactly once, large and well cropped; no broken or duplicate images.
5. Typography has strong hierarchy and rhythm; spacing is generous and consistent; colors keep WCAG AA contrast; mobile (360px) and desktop (1440px) both look finished — no overflow, no tiny tap targets.
6. Structure: <body> is a plain vertical flow (nav, main, footer); no grid/flex on body; the footer spans the full width at the very bottom; no element overlaps another section. The purpose-specific block exists (booking form composing sms:/mailto: for booking, buy actions for sales, filterable gallery for portfolio, repeated CTA for landing).
7. No stat or count-up card is built around a missing number; remove such cards rather than showing a big [입력 필요].
8. Facts: keep every real fact from the input exactly; anything missing stays [입력 필요]; no invented prices, reviews, awards or numbers.
Fix everything you find: rewrite weak copy, strengthen layouts, add what's missing, remove clutter. Keep the same class prefix and the same image placeholders. Do not shorten the page.`;

/** What's wrong with a generated page, if anything (for choosing between drafts). */
export function pageProblems(html: string, imageIds: string[], needsScene = true): string[] {
  const problems: string[] = [];
  if (!/<!doctype html>/i.test(html) || !/<\/html>\s*$/i.test(html.trim())) problems.push("incomplete document");
  for (const id of imageIds) {
    const n = html.split(`{{IMG:${id}}}`).length - 1;
    if (n === 0) problems.push(`missing ${id}`);
  }
  const ts = [...html.matchAll(/<script\b[^>]*type=["']?text\/typescript["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  if (!ts.trim()) problems.push("no TypeScript module");
  else {
    try {
      toJs(ts);
    } catch (err) {
      problems.push(`script does not compile: ${(err as Error).message.split("\n")[0]}`);
    }
    const unknown = unknownImports(ts);
    if (unknown.length) problems.push(`unknown imports: ${unknown.join(", ")}`);
    if (needsScene && !/mountScene\s*\(/.test(ts)) problems.push("no 3D scene");
  }
  if (!/<(button|a)\b/i.test(html)) problems.push("no buttons");
  return problems;
}

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
async function writePage(system: string, prompt: string, abortSignal: AbortSignal | undefined, attachments: Part[] = []): Promise<{ html: string; usage: TokenUsage }> {
  let usage = ZERO;
  // Losing attempts are cancelled once a page is chosen (or the run is).
  const race = new AbortController();
  const stop = () => race.abort();
  abortSignal?.addEventListener("abort", stop);
  const attempt = async (model: string) => {
    const res = await getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }, ...attachments] }],
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

/** The brief every homepage step reads: the request (with the agent's directives) and today's date. */
function siteBrief(manifest: ToolManifest, input: Record<string, unknown>, profile: BusinessProfile | null): string {
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });
  return `${buildContext(manifest, input, profile)}\n\n오늘 날짜: ${today} (저작권 연도 등에 사용)`;
}

function siteSystem(manifest: ToolManifest, brief: string): string {
  return [brief, "", "[Facts and quality rules from the product]", ...buildBaseInstruction(manifest).slice(1)].join("\n");
}

export type { SitePlan };

/** Art direction: concept, palette, type, hero, sections, scene and shot list (Pro, fast model as backup). */
export async function planSite(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
): Promise<{ plan: SitePlan; usage: TokenUsage }> {
  // No web research step here: the art director and the Pro model know
  // what good brand sites look like, and the run needs the time budget
  // for the page and its photos.
  const brief = siteBrief(manifest, input, profile);
  // "참고 자료" images and PDFs (an old site's screenshot, a brochure).
  const refParts = await toGeminiParts(referenceParts(input, { documents: true }), abortSignal);
  // Design options the art director chooses from — by the request's tone
  // (the [요청 분석] block in the brief), never at random.
  const menu = {
    hero_archetypes: HERO_ARCHETYPES,
    nav_styles: NAV_STYLES,
    shape_languages: SHAPES,
    textures: TEXTURES,
    signature_elements: SIGNATURES,
  };
  const purpose = typeof input.purpose === "string" ? input.purpose : "";
  const mode = referenceOf(input)?.mode.id ?? "";
  const commandNote: Record<string, string> = {
    redesign: "기존 사이트 리디자인: 참고 자료의 기존 사이트 구조(첫 화면, 메뉴, 섹션 순서)를 먼저 파악하고, 새 사이트는 첫 화면 구성·내비게이션·색·서체가 기존과 확실히 다르게 기획하세요. 기존 사이트의 정보는 하나도 빠뜨리지 마세요.",
    "from-doc": "소개 자료로 만들기: 참고 문서의 장·목차·상품 목록을 섹션 구조의 뼈대로 쓰고, 문서에 있는 사실만 담으세요.",
    mood: "분위기 참고: 참고 이미지에서 색·질감·빛·서체의 느낌을 뽑아 palette·texture·display_font에 반영하되, 레이아웃과 문구는 복제하지 마세요.",
    reference: "참고 자료의 사실과 내용을 근거로, 구성과 디자인은 새로 기획하세요.",
  };
  // The plan comes from the Pro model; when Pro is rate-limited or down
  // the fast model plans instead, rather than failing the run.
  const planArgs = [
    [
      "당신은 서울의 브랜딩 스튜디오 아트 디렉터입니다. 소상공인의 홈페이지를 만들기 전에 디자인 콘셉트, 색, 서체, 첫 화면 구성, 내비게이션, 도형·질감, 시그니처 요소, 섹션 구성, 촬영 목록을 정합니다.",
      "업종의 뻔한 클리셰(베이커리=파스텔, 병원=파란색)와 뻔한 템플릿(전체 화면 사진 + 어두운 오버레이 + 가운데 제목)을 피하고, 이 가게의 입력 내용에서 고유한 콘셉트를 찾으세요. 브랜드 컬러가 있으면 반드시 primary로 쓰세요.",
      "섹션 수와 순서는 사이트의 목적이 정합니다(아래 목적별 구성). '필요 섹션'은 모두 포함하되 방문자가 한 가지 행동으로 이어지게 배치하세요.",
      "입력에 '사용자의 자유 요청'이 있으면 그것이 모든 제안과 규칙보다 우선입니다.",
      "요청이 구체적이면: 요청의 모든 요소(상호·상품·특징·고객·원하는 기능과 분위기)를 request_details에 적고 사이트에 빠짐없이 보이게 하세요. 사용자가 쓴 표현을 살리세요.",
      "빅 아이디어·섹션 문구·스크롤 연출 어디에도 입력에 없는 숫자(발효 시간, 경력 연수, 개수, 고객 수, 퍼센트)를 만들지 마세요. 숫자가 필요하면 입력의 숫자만 씁니다.",
      "요청이 짧거나 막연하면: 섹션을 6~8개로 풍부하게 구성하고, 업종·지역·고객에서 출발해 크리에이티브를 대담하게 확장하세요 — 이 가게만의 빅 아이디어, 브랜드 스토리의 방향, 섹션별 구체 내용, 몰입형 3D 장면과 스크롤 연출, 만지고 싶은 인터랙션까지 풍부하게. 단 가격·수치·후기·수상·경력 같은 사실은 절대 만들지 않습니다.",
      "모든 디자인 결정(색, 서체, 첫 화면, 도형·질감, 3D 장면과 모습·속도, 스크롤 연출)은 브리프의 [요청 분석]에 있는 톤·대상·보는 사람·피할 것에서 출발합니다. 무작위로 고르거나 이전 사이트의 패턴을 반복하지 말고, 이 요청에 가장 어울리는 것을 고르세요. 선택지 목록은 참고일 뿐, 톤에 맞으면 새로 만들어도 됩니다.",
      "결과물은 수상작 수준(Awwwards)의 인터랙티브 사이트입니다. 다만 움직임의 양은 톤이 정합니다: 격식·신뢰가 먼저인 곳은 절제된 전환과 차분한 장면(또는 3D 없음), 활기찬 곳은 과감한 연출. 모든 섹션에 행동 버튼이 있습니다.",
      "요청이 저장된 프로필과 다른 가게·고객사·프로젝트라면 프로필의 이름·색·톤을 쓰지 말고, 이 서비스(해봇 AI)의 이름도 사이트에 넣지 마세요.",
    ].join("\n"),
    [
      `다음 가게의 홈페이지를 기획하세요.\n\n${brief}`,
      purpose && PURPOSE_BLUEPRINT[purpose] ? `\n[목적별 구성]\n${PURPOSE_BLUEPRINT[purpose]}` : "",
      mode && commandNote[mode] ? `\n[참고 자료 작업 방식]\n${commandNote[mode]}` : "",
      `\n[디자인 선택지 — 톤에 맞는 것을 고르거나 새로 만드세요]\n${JSON.stringify(menu, null, 2)}`,
    ].join("\n"),
    SITE_PLAN_SCHEMA,
    abortSignal,
    refParts,
  ] as const;
  const { plan, usage: planUsage } = await planJson<SitePlan>(...planArgs, PRO_TEXT_MODEL).catch((err) => {
    if (abortSignal?.aborted) throw err;
    console.warn("homepage: Pro plan failed, planning with the fast model", (err as Error).message);
    return planJson<SitePlan>(...planArgs, TEXT_MODEL);
  });

  if (!Array.isArray(plan.images) || !Array.isArray(plan.sections)) throw new Error("홈페이지 기획을 만들지 못했습니다");
  return { plan, usage: planUsage };
}

/** Starts the plan's photos (they're made while the page is written). */
export function shootSite(plan: SitePlan, storage: ImageStorageContext, abortSignal: AbortSignal | undefined) {
  return Promise.all(plan.images.map((img) => shoot(img.prompt, img.ratio, img.id, "homepage", storage, abortSignal)));
}

/** A random class prefix keeps the markup original, which also keeps
 * Gemini's recitation filter (it blocks output that matches known
 * code — common for portfolio templates) from emptying the reply. */
export function sitePrefix(): string {
  return `h${Math.random().toString(36).slice(2, 5)}`;
}

/** The designer's first full page for the plan. */
export async function writeSite(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  plan: SitePlan,
  prefix: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ html: string; usage: TokenUsage }> {
  const brief = siteBrief(manifest, input, profile);
  const refParts = await toGeminiParts(referenceParts(input, { documents: true }), abortSignal);
  const pagePrompt = `[Art director's plan]\n${JSON.stringify(plan, null, 2)}\n\nSite prefix for every class, id and CSS variable: ${prefix}\n\n[Business input and profile]\n${brief}\n\nBuild the complete site now.`;
  return writePage(siteSystem(manifest, SITE_BRIEF), pagePrompt, abortSignal, refParts);
}

/**
 * A second full pass over a page: the senior review against the plan and
 * checklist, plus — from the agent's critic — the specific problems to fix.
 */
export async function reviseSite(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  plan: SitePlan,
  prefix: string,
  html: string,
  critiqueText: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ html: string; usage: TokenUsage }> {
  const brief = siteBrief(manifest, input, profile);
  return writePage(
    siteSystem(manifest, REVIEW_BRIEF),
    `[Art director's plan]\n${JSON.stringify(plan, null, 2)}\n\nSite prefix: ${prefix}\n\n[Business input and profile]\n${brief}${critiqueText ? `\n\n[Critique from the creative director — fix every point; restructure sections if the critique says so]\n${critiqueText}` : ""}\n\n[Draft page to review and improve]\n${html}`,
    abortSignal,
  );
}

export function siteImageIds(plan: SitePlan): string[] {
  return plan.images.map((i) => i.id);
}

export function siteProblems(plan: SitePlan, html: string): string[] {
  return pageProblems(html, siteImageIds(plan), plan.experience?.scene !== "none");
}

/** Photos, fonts, price guard, TypeScript compile and import map → the tool's output. */
export function assembleHomepage(input: Record<string, unknown>, plan: SitePlan, page: string, shots: { url: string | null }[]): Record<string, unknown> {
  const palette = plan.palette;
  let html = page;
  // Photos first (the TypeScript may read them from the page's <img>s or
  // name them directly), then fonts, then the TypeScript is compiled and
  // the import map added.
  plan.images.forEach((img, i) => {
    const url = shots[i]?.url;
    if (url) html = html.replaceAll(`{{IMG:${img.id}}}`, url);
  });
  html = fillMissingImages(html, palette);
  // Font links are added here rather than written by the model: exact,
  // widely copied lines like these are what trips the recitation filter.
  const families = [DISPLAY_FONTS[plan.display_font], BODY_FONTS[plan.body_font]].filter((f): f is string => Boolean(f));
  // Layout guard: a flex or grid <body> puts the footer beside the page
  // instead of under it, the most common broken layout in drafts.
  const guard = "<style>html,body{overflow-x:clip}body{display:block!important}body>footer{width:100%}</style>";
  const fonts = [PRETENDARD_LINK, ...[...new Set(families)].map(fontLinkTag), guard].join("\n");
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fonts}\n</head>`) : html.replace(/<body/i, `<head>${fonts}</head>\n<body`);
  // Prices the user gave — typed, or in their reference material (a menu,
  // the old site) — are kept; any other won amount becomes [입력 필요].
  const givenText = [...Object.values(input).filter((v): v is string => typeof v === "string"), referenceOf(input)?.text ?? ""].join("\n");
  html = redactInventedPrices(html, givenText);
  const site = assembleSite(html);
  if (site.problems.length) console.warn("homepage: assemble", JSON.stringify(site.problems));
  html = site.html;
  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || "homepage";
  let project: Record<string, string> | undefined;
  try {
    project = site.mainTs ? viteProject(html, site.mainTs, title) : undefined;
  } catch (err) {
    console.warn("homepage: project export skipped", (err as Error).message);
  }
  const tone = (input._brief as { tone?: unknown } | undefined)?.tone;
  return {
    html,
    sections: plan.sections.map((s) => s.title),
    // The site's plan, for the sitemap on the result page.
    sitemap: plan.sections.map((s) => ({ title: s.title, goal: s.goal, layout: s.layout })),
    hero_image_prompt: plan.images[0]?.prompt ?? "",
    preview_url: "",
    zip_asset_id: "",
    design: {
      concept: plan.concept,
      mood: plan.mood,
      palette: Object.values(palette).filter((c) => HEX.test(c)),
      display_font: plan.display_font,
      body_font: plan.body_font,
      hero: plan.hero_archetype,
      nav: plan.nav_style,
      signature: plan.signature_elements,
      big_idea: plan.big_idea,
      scene: plan.experience?.scene,
      scene_variant: plan.experience?.scene_variant,
      tone: typeof tone === "string" ? tone : undefined,
      scroll: plan.experience?.scroll_moments,
    },
    ...(project ? { project_files: project } : {}),
  };
}

/** The one-shot pipeline (other engines' fallback path and the legacy runner): plan → page + photos → review → assemble. */
export async function generateHomepage(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<{ output: unknown; sources: Source[]; usage: TokenUsage }> {
  let usage = ZERO;
  const started = Date.now();
  const { plan, usage: planUsage } = await planSite(manifest, input, profile, abortSignal);
  usage = sumUsage(usage, planUsage);
  const prefix = sitePrefix();
  const photos = shootSite(plan, storage, abortSignal);
  const page = await writeSite(manifest, input, profile, plan, prefix, abortSignal);
  usage = sumUsage(usage, page.usage);
  const firstMs = Date.now() - started;

  // Senior review: a second pass audits the draft and returns the
  // improved page. The better of the two (fewest problems) is kept. The
  // review is skipped when the draft took long, and cut off before the
  // route's time limit.
  const candidates: string[] = [page.html];
  if (Date.now() - started < 140_000) {
    const cutoff = new AbortController();
    const onAbort = () => cutoff.abort();
    abortSignal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => cutoff.abort(), Math.max(10_000, 245_000 - (Date.now() - started)));
    try {
      const reviewed = await reviseSite(manifest, input, profile, plan, prefix, page.html, "", cutoff.signal);
      usage = sumUsage(usage, reviewed.usage);
      candidates.unshift(reviewed.html);
    } catch (err) {
      if (abortSignal?.aborted) throw err;
      console.warn("homepage: review skipped", (err as Error).message);
    } finally {
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onAbort);
    }
  }
  const scored = candidates.map((h) => ({ h, problems: siteProblems(plan, h) }));
  const best = scored.reduce((a, b) => (b.problems.length < a.problems.length ? b : a));
  const shots = await photos;
  shots.forEach((s) => (usage = sumUsage(usage, s.usage)));
  console.info(`homepage: draft ${Math.round(firstMs / 1000)}s, total ${Math.round((Date.now() - started) / 1000)}s, photos ${shots.filter((s) => s.url).length}/${shots.length}, reviewed ${candidates.length > 1}, problems ${JSON.stringify(scored.map((c) => c.problems))}`);

  return { output: assembleHomepage(input, plan, best.h, shots), sources: [], usage };
}

// ------------------------------------------------------------ presentation

interface DeckVisualPlan {
  accent_color: string;
  cover_prompt: string;
  slide_images: { slide_index: number; prompt: string }[];
}

const deckVisualSchema = (budget: number) =>
  ({
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
        maxItems: budget,
        description: `사진이 설득력을 더하는 슬라이드 최대 ${budget}장. layout이 photo인 장은 모두 포함하고, 그다음 statement·quote·points 장에서 고릅니다. chart·table·big_number·comparison·process 장은 제외.`,
        items: {
          type: "object",
          properties: {
            slide_index: { type: "integer", description: "0부터 시작하는 슬라이드 번호" },
            prompt: {
              type: "string",
              description:
                "English photo prompt for this slide's claim: specific subject, setting, angle, light, color grade consistent with the cover. Full-bleed landscape for layout 'photo', portrait-ish otherwise. No identifiable faces, no text.",
            },
          },
          required: ["slide_index", "prompt"],
        },
      },
    },
    required: ["accent_color", "cover_prompt", "slide_images"],
  }) as const;

type DeckSlideLite = { headline: string; points: string[]; visual?: string; layout?: string };
const NO_PHOTO = new Set(["chart", "table", "big_number", "comparison", "process"]);

/** Cover and slide photos plus a brand accent for a written deck. Longer decks get more photos (up to 8). */
export async function addPresentationVisuals(
  deck: { title?: string; storyline?: string; slides: DeckSlideLite[] } & Record<string, unknown>,
  contextText: string,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<{ output: unknown; usage: TokenUsage }> {
  let usage = ZERO;
  const budget = Math.min(8, Math.max(3, Math.ceil(deck.slides.length / 2.5)));
  let plan: DeckVisualPlan;
  try {
    const r = await planJson<DeckVisualPlan>(
      "당신은 투자 설명회 덱을 만드는 프레젠테이션 아트 디렉터입니다. 덱 전체가 하나의 사진 톤과 색으로 보이도록 표지와 슬라이드 사진을 기획합니다.",
      `[발표 요청]\n${contextText}\n\n[덱]\n${JSON.stringify({ title: deck.title, storyline: deck.storyline, slides: deck.slides.map((s, i) => ({ index: i, layout: s.layout ?? "points", headline: s.headline, visual: s.visual })) })}`,
      deckVisualSchema(budget),
      abortSignal,
    );
    plan = r.plan;
    usage = sumUsage(usage, r.usage);
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    return { output: deck, usage };
  }

  const picked = new Map<number, string>();
  for (const s of plan.slide_images) {
    const slide = deck.slides[s.slide_index];
    if (slide && !NO_PHOTO.has(slide.layout ?? "") && !picked.has(s.slide_index)) picked.set(s.slide_index, s.prompt);
  }
  // A photo-layout slide is built around its picture: never leave one without.
  deck.slides.forEach((s, i) => {
    if (s.layout === "photo" && !picked.has(i)) picked.set(i, `Editorial documentary photograph, cinematic light, consistent color grade with the rest of the deck: ${s.visual || s.headline}. No text, no identifiable faces.`);
  });
  const wanted = [...picked.entries()].slice(0, Math.max(budget, deck.slides.filter((s) => s.layout === "photo").length));
  const [cover, ...shots] = await Promise.all([
    shoot(plan.cover_prompt, "16:9", "cover", "presentation", storage, abortSignal),
    ...wanted.map(([i, prompt]) => shoot(prompt, deck.slides[i].layout === "photo" ? "16:9" : "3:4", `slide-${i + 1}`, "presentation", storage, abortSignal)),
  ]);
  [cover, ...shots].forEach((s) => (usage = sumUsage(usage, s.usage)));
  const bySlide = new Map(wanted.map(([i], k) => [i, shots[k].url]));

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
