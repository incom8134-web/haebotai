import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Camera,
  ChartColumn,
  Dna,
  FileSignature,
  FileText,
  GitFork,
  Globe,
  KanbanSquare,
  LayoutTemplate,
  ListChecks,
  Magnet,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Network,
  PenTool,
  Pickaxe,
  Presentation,
  Radar,
  ScanEye,
  Search,
  UserRound,
  UserSquare,
  CalendarRange,
  FileSearch,
} from "lucide-react";
import type { Bilingual } from "./content";
import type { CategoryId } from "./types";

// The public product: 16 tools in 5 numbered steps, named in plain words
// (no studio/lab/forge jargon). Each entry is what members see — the
// tool's slug (its URL), name, one-line promise, category and verb.
// `engine` is the internal generation engine that runs it (the manifests
// in ./registry, keyed by their original ids). Hidden entries are modes of
// a public tool: they keep their own engine and URL and are reached from
// their parent tool. CATALOG order is the numbered order members see.

export type Verb = "build" | "sell" | "create" | "operate" | "research";

export interface CatalogTool {
  slug: string;
  category: CategoryId;
  verb: Verb;
  name: Bilingual;
  promise: Bilingual;
  /** What the member walks away with, shown on cards and the overview. */
  outputs: Bilingual[];
  icon: LucideIcon;
  /** Internal engine id (a registry manifest); null = not runnable yet. */
  engine: string | null;
  /** A mode of `parent` rather than a tool of its own: runnable, not listed. */
  hidden?: { parent: string };
  /** Tools this one naturally hands off to (slugs). */
  next: string[];
}

// The order a business usually goes in: find the idea, learn the market,
// build the brand, promote it, then handle documents and daily work.
export const CATEGORY_ORDER: CategoryId[] = ["discover", "research", "brand", "campaign", "operate"];

export const CATEGORIES: Record<CategoryId, { name: Bilingual; pitch: Bilingual; verb: Verb }> = {
  discover: {
    name: { ko: "아이디어 찾기", en: "Find an idea" },
    pitch: { ko: "무엇을 팔지, 얼마에 팔지 정해요", en: "Decide what to sell and for how much" },
    verb: "build",
  },
  research: {
    name: { ko: "시장·손님 알아보기", en: "Know your market" },
    pitch: { ko: "만들기 전에 시장과 손님부터 알아봐요", en: "Learn about the market and customers first" },
    verb: "research",
  },
  brand: {
    name: { ko: "브랜드 만들기", en: "Build your brand" },
    pitch: { ko: "손님이 보게 될 얼굴과 가게를 만들어요", en: "Make the face and the shop customers see" },
    verb: "sell",
  },
  campaign: {
    name: { ko: "홍보하기", en: "Promote" },
    pitch: { ko: "광고·블로그·SNS 글로 손님을 모아요", en: "Bring in customers with ads, blogs and posts" },
    verb: "create",
  },
  operate: {
    name: { ko: "문서·업무 정리", en: "Docs & daily work" },
    pitch: { ko: "사업계획서, 발표 자료, 할 일 계획까지", en: "Business plans, presentations and to-do plans" },
    verb: "operate",
  },
};

export const VERBS: Record<Verb, Bilingual> = {
  build: { ko: "설계하기", en: "Build" },
  sell: { ko: "판매하기", en: "Sell" },
  create: { ko: "만들기", en: "Create" },
  operate: { ko: "운영하기", en: "Operate" },
  research: { ko: "조사하기", en: "Research" },
};

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export const CATALOG: CatalogTool[] = [
  // ① 아이디어 찾기
  {
    slug: "idea-radar",
    category: "discover",
    verb: "build",
    name: b("사업 아이디어 찾기", "Find business ideas"),
    promise: b("내 경험·돈·시간에 맞는 사업 아이디어를 점수로 비교해요", "Business ideas that fit your skills, money and time, scored side by side"),
    outputs: [b("아이디어 카드와 점수", "Idea cards with scores"), b("누구에게 무엇을 팔지", "Who to sell what to"), b("가장 먼저 해 볼 일", "The first thing to try")],
    icon: Radar,
    engine: "idea-radar",
    next: ["offer-architect", "market-desk"],
  },
  {
    slug: "offer-architect",
    category: "discover",
    verb: "sell",
    name: b("팔 상품·가격 정하기", "Shape your offer & price"),
    promise: b("손님이 바로 이해하고 사고 싶어지는 상품 구성과 가격을 정해요", "An offer and price customers get at once and want to buy"),
    outputs: [b("핵심 상품과 장점", "Core offer and its value"), b("구성·사은품·보장", "Bundles, extras, guarantee"), b("판매 문구", "Sales message")],
    icon: Blocks,
    engine: "offer-architect",
    next: ["sales-page", "ad-factory"],
  },

  // ② 시장·손님 알아보기
  {
    slug: "market-desk",
    category: "research",
    verb: "research",
    name: b("시장 조사하기", "Research the market"),
    promise: b("시장 규모와 흐름을, 확인된 사실과 추측을 나눠서 정리해요", "Market size and trends, with facts kept apart from guesses"),
    outputs: [b("알아볼 질문과 추측", "Questions and assumptions"), b("출처가 붙은 근거", "Evidence with sources"), b("더 확인할 것", "What to check next")],
    icon: ChartColumn,
    engine: "market-desk",
    next: ["persona-mapper", "brand-dna"],
  },
  {
    slug: "persona-mapper",
    category: "research",
    verb: "research",
    name: b("손님 알아보기", "Know your customers"),
    promise: b("우리 손님이 무엇을 원하고, 왜 망설이고, 언제 사는지 한 장에", "What your customer wants, why they hesitate and when they buy, on one page"),
    outputs: [b("손님 카드", "Customer card"), b("사기까지의 과정", "Path to purchase"), b("손님에게 할 말", "What to tell them")],
    icon: UserRound,
    engine: "persona-mapper",
    next: ["campaign-planner", "ad-factory"],
  },

  // ③ 브랜드 만들기
  {
    slug: "brand-dna",
    category: "brand",
    verb: "create",
    name: b("브랜드 정하기", "Define your brand"),
    promise: b("성격·말투·색깔을 정하면, 다른 도구의 결과물도 모두 이 기준을 따라요", "Set personality, voice and colours; every other tool follows them"),
    outputs: [b("브랜드 성격과 말투", "Personality and voice"), b("핵심 메시지", "Key message"), b("색깔과 분위기", "Colours and mood")],
    icon: Dna,
    engine: "brand-dna",
    next: ["logo-lab", "web-builder"],
  },
  {
    slug: "logo-lab",
    category: "brand",
    verb: "create",
    name: b("로고 만들기", "Make a logo"),
    promise: b("서로 다른 로고 4가지를 그려서 비교해요", "Four different logos, drawn so you can compare"),
    outputs: [b("로고 시안 4개", "4 logo drafts"), b("색·글꼴 안내", "Colour and font notes"), b("쓰는 법", "How to use it")],
    icon: PenTool,
    engine: "logo",
    next: ["web-builder", "sales-page"],
  },
  {
    slug: "sales-page",
    category: "brand",
    verb: "sell",
    name: b("상세페이지 만들기", "Make a product page"),
    promise: b("스마트스토어 등에 올릴 상세페이지를 글과 이미지로 완성해요", "A product page for your online store, written and designed"),
    outputs: [b("구성과 문구", "Layout and copy"), b("제품 사진", "Product photos"), b("완성 이미지 (860px)", "Finished 860px image")],
    icon: LayoutTemplate,
    engine: "sangsepage",
    next: ["ad-factory", "content-transformer"],
  },
  {
    slug: "web-builder",
    category: "brand",
    verb: "sell",
    name: b("홈페이지 만들기", "Make a website"),
    promise: b("업종과 목적에 맞는 홈페이지를 바로 쓸 수 있게 만들어요", "A ready-to-use website for your business and goal"),
    outputs: [b("완성 홈페이지 (PC·휴대폰)", "Finished site (desktop and phone)"), b("HTML 파일", "HTML files"), b("디자인 설명", "Design notes")],
    icon: Globe,
    engine: "homepage",
    next: ["seo-composer", "campaign-planner"],
  },

  // ④ 홍보하기
  {
    slug: "campaign-planner",
    category: "campaign",
    verb: "create",
    name: b("홍보 계획 세우기", "Plan your promotion"),
    promise: b("무엇을, 어디에, 언제 알릴지 한 번에 짜요", "What to promote, where and when, planned in one go"),
    outputs: [b("핵심 메시지", "Key message"), b("채널별 할 일", "What to do on each channel"), b("30·60·90일 계획과 목표 숫자", "30/60/90-day plan and targets")],
    icon: CalendarRange,
    engine: "strategy",
    next: ["ad-factory", "seo-composer", "content-transformer"],
  },
  {
    slug: "ad-factory",
    category: "campaign",
    verb: "sell",
    name: b("광고 문구 쓰기", "Write ads"),
    promise: b("손님마다 다른 이유에 맞춘 광고 문구와 광고 이미지를 만들어요", "Ad copy and visuals for each reason customers buy"),
    outputs: [b("광고 제목과 문구", "Headlines and copy"), b("채널별 문구와 A/B 비교", "Copy per channel, A/B pairs"), b("광고 이미지", "Ad visuals")],
    icon: Megaphone,
    engine: "copy",
    next: ["campaign-planner", "content-transformer"],
  },
  {
    slug: "seo-composer",
    category: "campaign",
    verb: "create",
    name: b("블로그 글 쓰기", "Write a blog post"),
    promise: b("검색에 잘 걸리는 블로그 글을 사진과 함께 써요", "Blog posts that show up in search, with photos"),
    outputs: [b("제목 후보와 목차", "Titles and outline"), b("본문과 자주 묻는 질문", "Article and FAQ"), b("대표·본문 사진", "Cover and body photos")],
    icon: FileSearch,
    engine: "blog",
    next: ["content-transformer", "ad-factory"],
  },
  {
    slug: "content-transformer",
    category: "campaign",
    verb: "create",
    name: b("SNS 글로 바꾸기", "Rewrite for social"),
    promise: b("글 하나를 인스타·쇼츠·뉴스레터용으로 각각 바꿔 써요", "One piece of writing, rewritten for Instagram, Shorts and newsletters"),
    outputs: [b("채널별 글", "A version per channel"), b("짧은 영상 대본", "Short-video script"), b("뉴스레터", "Newsletter")],
    icon: GitFork,
    engine: "content-transformer",
    next: ["campaign-planner"],
  },

  // ⑤ 문서·업무 정리
  {
    slug: "doc-studio",
    category: "operate",
    verb: "operate",
    name: b("사업계획서 쓰기", "Write a business plan"),
    promise: b("투자·정부지원·대출용 사업계획서를 재무표까지 써요", "Business plans for investors, grants or loans, with financials"),
    outputs: [b("읽을 사람에 맞춘 목차", "Chapters for the reader"), b("재무표 (손익·손익분기)", "Financials (P&L, break-even)"), b("Word·PDF·엑셀", "Word, PDF and Excel")],
    icon: FileText,
    engine: "business-plan",
    next: ["pitch-director", "proposal-forge"],
  },
  {
    slug: "pitch-director",
    category: "operate",
    verb: "sell",
    name: b("발표 자료 만들기", "Make a presentation"),
    promise: b("듣는 사람이 결정하게 만드는 발표 자료를 사진·차트와 함께", "A presentation that helps people decide, with photos and charts"),
    outputs: [b("장면별 구성", "Slide-by-slide plan"), b("사진·차트가 들어간 발표 자료", "Deck with photos and charts"), b("PPT·PDF와 발표 대본", "PPT, PDF and speaker script")],
    icon: Presentation,
    engine: "presentation",
    next: ["doc-studio", "proposal-forge"],
  },
  {
    slug: "ops-planner",
    category: "operate",
    verb: "operate",
    name: b("할 일 계획 세우기", "Plan the weeks ahead"),
    promise: b("목표를 주 단위 할 일로 나누고, 끝났는지 확인할 기준까지", "Your goal split into weekly tasks, each with a clear finish line"),
    outputs: [b("주차별 할 일과 우선순위", "Weekly tasks and priorities"), b("중요한 날짜", "Key dates"), b("캘린더 파일", "Calendar file")],
    icon: KanbanSquare,
    engine: "calendar",
    next: ["sop-builder", "meeting-action"],
  },
  {
    slug: "prompt-maker",
    category: "operate",
    verb: "create",
    name: b("프롬프트 만들기", "Make a prompt"),
    promise: b("ChatGPT·이미지 AI 등에 시킬 말을 전문가처럼 대신 써 드려요", "Writes what to tell ChatGPT, image AIs and others, like an expert would"),
    outputs: [b("바로 붙여 넣는 프롬프트", "A ready-to-paste prompt"), b("넣을 자리 안내", "Fill-in-the-blank guide"), b("앱 안에서 바로 시험", "Test it right in the app")],
    icon: MessageSquareText,
    engine: "prompt",
    next: ["ops-planner"],
  },

  // Modes: they keep their own engine and URL and are reached from the
  // tool they belong to.
  {
    slug: "revenue-mapper",
    category: "discover",
    verb: "build",
    name: b("돈 버는 방법 정리", "Ways to earn"),
    promise: b("팔 상품·가격 정하기의 다른 방법 — 한 아이디어로 돈 버는 길과 가격 방식을 한 장에", "Offer & price mode — every way one idea can earn, with pricing models"),
    outputs: [b("돈 버는 길 지도", "Revenue map"), b("가격·구독·묶음 방식", "Pricing, subscription and bundles")],
    icon: Network,
    engine: "revenue-mapper",
    hidden: { parent: "offer-architect" },
    next: ["offer-architect", "doc-studio"],
  },
  {
    slug: "competitor-lens",
    category: "research",
    verb: "research",
    name: b("경쟁 가게 비교", "Compare competitors"),
    promise: b("시장 조사하기의 다른 방법 — 경쟁 가게를 나란히 놓고 우리 자리를 찾아요", "Market research mode — rivals side by side, and where you stand apart"),
    outputs: [b("비교표", "Comparison table"), b("우리가 다른 점", "How you stand apart")],
    icon: ScanEye,
    engine: "competitor-lens",
    hidden: { parent: "market-desk" },
    next: ["brand-dna", "offer-architect"],
  },
  {
    slug: "insight-miner",
    category: "research",
    verb: "research",
    name: b("후기 분석하기", "Analyse reviews"),
    promise: b("손님 알아보기의 다른 방법 — 후기·설문에서 손님의 진짜 마음을 찾아요", "Customer mode — what customers really want, from reviews and surveys"),
    outputs: [b("자주 나온 이야기", "Recurring themes"), b("불만·칭찬·요청", "Complaints, praise and requests")],
    icon: Pickaxe,
    engine: "insight-miner",
    hidden: { parent: "persona-mapper" },
    next: ["offer-architect", "persona-mapper"],
  },
  {
    slug: "hook-lab",
    category: "campaign",
    verb: "create",
    name: b("첫 문장 만들기", "Opening lines"),
    promise: b("광고 문구 쓰기의 다른 방법 — 영상·게시물의 첫 3초를 잡는 문장", "Ads mode — lines that hold the first 3 seconds of a video or post"),
    outputs: [b("유형별 첫 문장", "Opening lines by type"), b("채널별 변형", "Channel variants")],
    icon: Magnet,
    engine: "hook-lab",
    hidden: { parent: "ad-factory" },
    next: ["content-transformer", "ad-factory"],
  },
  {
    slug: "ad-photo",
    category: "campaign",
    verb: "create",
    name: b("제품 사진 만들기", "Product photos"),
    promise: b("광고 문구 쓰기의 다른 방법 — 제품 사진 4장", "Ads mode — four product photos"),
    outputs: [b("제품 사진 4장", "4 product photos")],
    icon: Camera,
    engine: "image",
    hidden: { parent: "ad-factory" },
    next: ["ad-factory", "sales-page"],
  },
  {
    slug: "ad-model",
    category: "campaign",
    verb: "create",
    name: b("모델 사진 만들기", "Model photos"),
    promise: b("광고 문구 쓰기의 다른 방법 — 같은 모델로 사진 4장", "Ads mode — four photos with the same model"),
    outputs: [b("모델 사진 4장", "4 model photos")],
    icon: UserSquare,
    engine: "brand-model",
    hidden: { parent: "ad-factory" },
    next: ["ad-factory"],
  },
  {
    slug: "seo-keywords",
    category: "campaign",
    verb: "research",
    name: b("검색어 찾기", "Find keywords"),
    promise: b("블로그 글 쓰기의 다른 방법 — 사람들이 찾는 검색어와 경쟁 정도", "Blog mode — what people search for, and how crowded it is"),
    outputs: [b("검색어 후보와 경쟁 정도", "Keywords and competition")],
    icon: Search,
    engine: "keyword",
    hidden: { parent: "seo-composer" },
    next: ["seo-composer"],
  },
  {
    slug: "proposal-forge",
    category: "operate",
    verb: "sell",
    name: b("제안서 쓰기", "Write a proposal"),
    promise: b("사업계획서 쓰기의 다른 방법 — 받는 사람이 '좋아요'라고 답하게 짜인 제안서", "Business plan mode — a proposal built to get a yes"),
    outputs: [b("요약·문제·해결", "Summary, problem, solution"), b("범위·일정·가격", "Scope, schedule, price")],
    icon: FileSignature,
    engine: "proposal",
    hidden: { parent: "doc-studio" },
    next: ["pitch-director"],
  },
  {
    slug: "sop-builder",
    category: "operate",
    verb: "operate",
    name: b("업무 순서 정리", "Write a how-to"),
    promise: b("할 일 계획 세우기의 다른 방법 — 누가 해도 똑같이 되는 업무 순서표", "Planning mode — a step-by-step how-to anyone can follow"),
    outputs: [b("단계별 순서", "Step-by-step order"), b("확인 목록", "Checklist")],
    icon: ListChecks,
    engine: "sop-builder",
    hidden: { parent: "ops-planner" },
    next: ["ops-planner"],
  },
  {
    slug: "meeting-action",
    category: "operate",
    verb: "operate",
    name: b("회의 정리하기", "Sum up a meeting"),
    promise: b("할 일 계획 세우기의 다른 방법 — 회의 메모를 정한 것·담당자·마감으로", "Planning mode — meeting notes turned into decisions, owners and deadlines"),
    outputs: [b("정한 것과 요약", "Decisions and summary"), b("사람별 할 일과 마감", "Tasks by person with deadlines")],
    icon: MessagesSquare,
    engine: "meeting-action",
    hidden: { parent: "ops-planner" },
    next: ["ops-planner"],
  },
];

/** Old tool ids and slugs (and their URLs) → the tool that replaced them ("" = the tools list). */
export const RETIRED: Record<string, string> = {
  money: "idea-radar",
  place: "seo-composer",
  grant: "doc-studio",
  trend: "idea-radar",
  "trend-radar": "idea-radar",
  "market-gap": "idea-radar",
  "mvp-blueprint": "ops-planner",
};

const BY_SLUG = new Map(CATALOG.map((t) => [t.slug, t]));
const BY_ENGINE = new Map(CATALOG.filter((t) => t.engine).map((t) => [t.engine as string, t]));

export function catalogTool(slugOrEngine: string): CatalogTool | undefined {
  return BY_SLUG.get(slugOrEngine) ?? BY_ENGINE.get(slugOrEngine);
}

/** The public URL slug for a tool, from its slug or its engine id (as stored on past runs). */
export function toolSlug(slugOrEngine: string): string {
  return catalogTool(slugOrEngine)?.slug ?? slugOrEngine;
}

/** The public tools, in catalog (numbered) order. */
export function publicTools(): CatalogTool[] {
  return CATALOG.filter((t) => !t.hidden);
}

/** A tool's number in the numbered list (1-based); a mode gets its parent's number. */
export function toolNumber(slug: string): number {
  const t = catalogTool(slug);
  const own = t?.hidden ? t.hidden.parent : t?.slug;
  return publicTools().findIndex((x) => x.slug === own) + 1;
}

/** A step's number (1-based) in CATEGORY_ORDER. */
export function stepNumber(category: CategoryId): number {
  return CATEGORY_ORDER.indexOf(category) + 1;
}

/** The modes of a public tool (other ways to run it), in catalog order. */
export function modesOf(slug: string): CatalogTool[] {
  return CATALOG.filter((t) => t.hidden?.parent === slug);
}

export function toolsIn(category: CategoryId): CatalogTool[] {
  return publicTools().filter((t) => t.category === category);
}

/** Where an old URL should go now: a slug, "" for the tools list, or null when it isn't an old id. */
export function redirectFor(id: string): string | null {
  if (id in RETIRED) return RETIRED[id];
  const t = BY_ENGINE.get(id);
  return t && t.slug !== id ? t.slug : null;
}
