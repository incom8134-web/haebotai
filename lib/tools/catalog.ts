import type { LucideIcon } from "lucide-react";
import {
  Activity,
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
  MessagesSquare,
  Network,
  PenTool,
  Pickaxe,
  Presentation,
  Radar,
  Rocket,
  ScanEye,
  Search,
  Telescope,
  UserRound,
  UserSquare,
  CalendarRange,
  FileSearch,
} from "lucide-react";
import type { Bilingual } from "./content";
import type { CategoryId } from "./types";

// The public product: 25 tools in 5 categories (docs/redesign-plan.md §3).
// Each entry is what members see — the tool's slug (its URL), name,
// one-line promise, category and verb. `engine` is the internal generation
// engine that runs it (today's manifests in ./registry, keyed by their
// original ids); a tool without an engine is still being built and shows
// as "곧 공개". Hidden entries are modes of a public tool that still run
// on their own engine until that tool absorbs them.

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

export const CATEGORY_ORDER: CategoryId[] = ["discover", "brand", "campaign", "operate", "research"];

export const CATEGORIES: Record<CategoryId, { name: Bilingual; pitch: Bilingual; verb: Verb }> = {
  discover: {
    name: { ko: "발견·수익 설계", en: "Discover & Monetize" },
    pitch: { ko: "아이디어를 돈이 되는 방향으로", en: "From an idea to a business that pays" },
    verb: "build",
  },
  brand: {
    name: { ko: "브랜드·웹·세일즈", en: "Brand, Web & Sales" },
    pitch: { ko: "사람들 앞에 내놓을 얼굴과 판매 창구", en: "The face and the storefront your customers see" },
    verb: "sell",
  },
  campaign: {
    name: { ko: "캠페인·콘텐츠", en: "Campaigns & Content" },
    pitch: { ko: "한 번의 게시물이 아니라 돌아가는 마케팅", en: "Marketing that keeps running, not one post" },
    verb: "create",
  },
  operate: {
    name: { ko: "문서·운영 시스템", en: "Documents & Operations" },
    pitch: { ko: "바로 보내고 바로 실행하는 업무 결과물", en: "Work you can send and run today" },
    verb: "operate",
  },
  research: {
    name: { ko: "리서치·인텔리전스", en: "Research & Intelligence" },
    pitch: { ko: "만들기 전에 시장과 고객을 먼저 이해", en: "Understand the market before you build" },
    verb: "research",
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
  // 1 · 발견·수익 설계
  {
    slug: "idea-radar",
    category: "discover",
    verb: "build",
    name: b("아이디어 레이더", "Idea Radar"),
    promise: b("내 경험·자원·시간에 맞는 사업 아이디어를 점수와 함께 비교", "Business ideas that fit your skills, budget and time, scored side by side"),
    outputs: [b("아이디어 카드와 적합도 점수", "Idea cards with fit scores"), b("타깃 고객과 풀 문제", "Target customer and problem"), b("MVP 개념과 첫 검증 행동", "MVP concept and first validation step")],
    icon: Radar,
    engine: "idea-radar",
    next: ["revenue-mapper", "mvp-blueprint", "market-gap"],
  },
  {
    slug: "revenue-mapper",
    category: "discover",
    verb: "build",
    name: b("수익 구조 지도", "Revenue Mapper"),
    promise: b("하나의 아이디어에서 나올 수 있는 수익 흐름과 가격 모델을 한 장의 지도로", "Every way an idea can earn, mapped with pricing models"),
    outputs: [b("수익원 흐름도", "Revenue-flow map"), b("가격·구독·패키지 모델", "Pricing, subscription and package models"), b("단위 경제성 틀", "Unit-economics frame")],
    icon: Network,
    engine: "revenue-mapper",
    next: ["offer-architect", "doc-studio"],
  },
  {
    slug: "offer-architect",
    category: "discover",
    verb: "sell",
    name: b("오퍼 설계소", "Offer Architect"),
    promise: b("제품·서비스를 고객이 바로 이해하고 사고 싶어지는 제안으로", "Turn a product into an offer people understand and want"),
    outputs: [b("핵심 오퍼와 가치 제안", "Core offer and value proposition"), b("패키지·보너스·보증 구성", "Packages, bonuses, guarantee"), b("판매 메시지와 CTA", "Sales message and CTA")],
    icon: Blocks,
    engine: "offer-architect",
    next: ["sales-page", "ad-factory"],
  },
  {
    slug: "market-gap",
    category: "discover",
    verb: "research",
    name: b("시장 빈틈 탐지기", "Market Gap Finder"),
    promise: b("고객의 불편과 기존 해결책 사이의 빈자리를 지도로", "Where customer pain and existing solutions don't meet"),
    outputs: [b("니즈 × 기존 해결책 지도", "Needs × solutions map"), b("기회 카드와 차별화 방향", "Opportunity cards and differentiation"), b("검증 질문", "Validation questions")],
    icon: Telescope,
    engine: "market-gap",
    next: ["idea-radar", "mvp-blueprint"],
  },
  {
    slug: "mvp-blueprint",
    category: "discover",
    verb: "build",
    name: b("MVP 설계도", "MVP Blueprint"),
    promise: b("아이디어를 처음 내놓을 최소한의 제품과 출시 순서로", "The smallest real first version and the order to launch it"),
    outputs: [b("핵심 기능과 뺄 기능", "Core vs later features"), b("사용자 여정", "User journey"), b("개발 단계와 출시 체크리스트", "Build stages and launch checklist")],
    icon: Rocket,
    engine: "mvp-blueprint",
    next: ["web-builder", "ops-planner"],
  },

  // 2 · 브랜드·웹·세일즈
  {
    slug: "brand-dna",
    category: "brand",
    verb: "create",
    name: b("브랜드 DNA 스튜디오", "Brand DNA Studio"),
    promise: b("성격·목소리·색·약속까지, 모든 결과물이 따를 브랜드의 기준", "Personality, voice, colour and promise every output will follow"),
    outputs: [b("브랜드 성격과 가치", "Personality and values"), b("포지셔닝과 메시지 원칙", "Positioning and messaging rules"), b("시각 방향 보드", "Visual direction board")],
    icon: Dna,
    engine: "brand-dna",
    next: ["logo-lab", "web-builder", "campaign-planner"],
  },
  {
    slug: "logo-lab",
    category: "brand",
    verb: "create",
    name: b("로고 디렉션 랩", "Logo Direction Lab"),
    promise: b("서로 다른 4가지 로고 방향을 실제로 그려서 비교", "Four genuinely different logo directions, drawn and compared"),
    outputs: [b("로고 시안 4종 (심볼 + 조판)", "4 drawn logo directions"), b("색·서체·도형 언어", "Colour, type and shape language"), b("사용 가이드", "Usage notes")],
    icon: PenTool,
    engine: "logo",
    next: ["web-builder", "sales-page"],
  },
  {
    slug: "sales-page",
    category: "brand",
    verb: "sell",
    name: b("세일즈 페이지 설계소", "Sales Page Architect"),
    promise: b("구매 망설임을 하나씩 푸는 상세페이지를 설계하고 이미지로 완성", "A product page that answers every doubt, designed and rendered"),
    outputs: [b("섹션 구조와 카피", "Section structure and copy"), b("제품 사진", "Product photos"), b("860px 상세페이지 이미지", "Rendered 860px page")],
    icon: LayoutTemplate,
    engine: "sangsepage",
    next: ["ad-factory", "content-transformer"],
  },
  {
    slug: "web-builder",
    category: "brand",
    verb: "sell",
    name: b("웹 익스피리언스 빌더", "Web Experience Builder"),
    promise: b("요청에 맞춘 인터랙티브 사이트를 기획부터 코드까지", "An interactive site built for your request, from plan to code"),
    outputs: [b("완성 사이트 (PC·모바일 미리보기)", "Finished site with PC/mobile preview"), b("HTML과 Vite 프로젝트", "HTML and a Vite project"), b("디자인 콘셉트", "Design concept")],
    icon: Globe,
    engine: "homepage",
    next: ["seo-composer", "campaign-planner"],
  },
  {
    slug: "pitch-director",
    category: "brand",
    verb: "sell",
    name: b("피치 비주얼 디렉터", "Pitch Visual Director"),
    promise: b("청중이 결정하게 만드는 발표 흐름과 사진이 들어간 덱", "A pitch that moves its audience, with photos, as PowerPoint"),
    outputs: [b("슬라이드 스토리보드", "Slide storyboard"), b("사진·차트가 들어간 덱", "Deck with photos and charts"), b("PPTX·PDF", "PPTX and PDF")],
    icon: Presentation,
    engine: "presentation",
    next: ["proposal-forge", "doc-studio"],
  },

  // 3 · 캠페인·콘텐츠
  {
    slug: "campaign-planner",
    category: "campaign",
    verb: "create",
    name: b("캠페인 플래너", "Campaign Planner"),
    promise: b("목표·메시지·채널·일정이 한 흐름으로 이어지는 캠페인", "A campaign where goal, message, channels and schedule connect"),
    outputs: [b("포지셔닝과 핵심 메시지", "Positioning and key message"), b("채널별 실행 단계", "Channel phases"), b("측정 지표", "Measurement framework")],
    icon: CalendarRange,
    engine: "strategy",
    next: ["hook-lab", "ad-factory", "content-transformer"],
  },
  {
    slug: "hook-lab",
    category: "campaign",
    verb: "create",
    name: b("훅 연구소", "Hook Lab"),
    promise: b("짧은 영상·게시물의 첫 3초를 잡는 훅을 유형별로", "Opening hooks for short-form content, by hook family"),
    outputs: [b("유형별 훅 카드", "Hook cards by family"), b("플랫폼별 변형", "Platform variants"), b("이어질 첫 장면", "The first scene that follows")],
    icon: Magnet,
    engine: null,
    next: ["content-transformer", "ad-factory"],
  },
  {
    slug: "seo-composer",
    category: "campaign",
    verb: "create",
    name: b("SEO 원고 컴포저", "SEO Content Composer"),
    promise: b("검색 의도를 읽고 끝까지 답하는 원고를 사진까지", "Search-intent articles that answer fully, with photos"),
    outputs: [b("제목 후보와 구성", "Titles and outline"), b("본문·FAQ·메타 설명", "Article, FAQ, meta description"), b("표지·본문 사진", "Cover and body photos")],
    icon: FileSearch,
    engine: "blog",
    next: ["content-transformer", "hook-lab"],
  },
  {
    slug: "content-transformer",
    category: "campaign",
    verb: "create",
    name: b("콘텐츠 변환기", "Content Transformer"),
    promise: b("글 하나를 인스타·링크드인·쇼츠·뉴스레터용으로 각각 다시", "One piece of content, rewritten for every platform"),
    outputs: [b("플랫폼별 버전", "Platform versions"), b("쇼츠 대본", "Short-video script"), b("뉴스레터", "Newsletter")],
    icon: GitFork,
    engine: null,
    next: ["campaign-planner"],
  },
  {
    slug: "ad-factory",
    category: "campaign",
    verb: "sell",
    name: b("광고 크리에이티브 팩토리", "Ad Creative Factory"),
    promise: b("구매 동기별 광고 각도와 카피, 광고 비주얼까지 한 판에", "Ad angles, copy and visuals per buying motive, on one board"),
    outputs: [b("광고 각도와 헤드라인", "Angles and headlines"), b("채널별 카피와 A/B 변형", "Channel copy and A/B variants"), b("각도별 광고 비주얼", "A visual per angle")],
    icon: Megaphone,
    engine: "copy",
    next: ["campaign-planner", "content-transformer"],
  },

  // 4 · 문서·운영 시스템
  {
    slug: "doc-studio",
    category: "operate",
    verb: "operate",
    name: b("비즈니스 문서 스튜디오", "Business Document Studio"),
    promise: b("읽을 사람에 맞춰 장을 짜는 사업계획서, 계산되는 재무표까지", "Business plans structured for their reader, with computed financials"),
    outputs: [b("심사자에 맞춘 장 구성", "Chapters built for the reviewer"), b("재무 모델 (손익·손익분기)", "Financial model (P&L, breakeven)"), b("Word·PDF·엑셀", "Word, PDF and Excel")],
    icon: FileText,
    engine: "business-plan",
    next: ["pitch-director", "proposal-forge"],
  },
  {
    slug: "proposal-forge",
    category: "operate",
    verb: "sell",
    name: b("제안서 포지", "Proposal Forge"),
    promise: b("받는 사람이 '예'라고 답하게 짜인 제안서", "Proposals built to get a yes"),
    outputs: [b("요약·문제·해결", "Summary, problem, solution"), b("범위·일정·가격 구성", "Scope, schedule, pricing"), b("다음 단계", "Next steps")],
    icon: FileSignature,
    engine: "proposal",
    next: ["pitch-director"],
  },
  {
    slug: "sop-builder",
    category: "operate",
    verb: "operate",
    name: b("업무 매뉴얼 빌더", "SOP Builder"),
    promise: b("반복 업무를 누가 해도 같은 결과가 나오는 절차서로", "Repeated work turned into a procedure anyone can follow"),
    outputs: [b("단계별 절차 흐름도", "Step-by-step process flow"), b("담당 역할과 품질 체크리스트", "Roles and quality checklist"), b("예외 상황 대응", "Exception handling")],
    icon: ListChecks,
    engine: null,
    next: ["ops-planner"],
  },
  {
    slug: "meeting-action",
    category: "operate",
    verb: "operate",
    name: b("회의→실행 보드", "Meeting-to-Action"),
    promise: b("회의 메모를 결정사항·담당자·마감이 있는 실행 보드로", "Meeting notes turned into decisions, owners and deadlines"),
    outputs: [b("결정사항과 요약", "Decisions and summary"), b("담당자별 할 일과 마감", "Actions by owner with due dates"), b("다음 회의 안건", "Follow-up agenda")],
    icon: MessagesSquare,
    engine: null,
    next: ["ops-planner"],
  },
  {
    slug: "ops-planner",
    category: "operate",
    verb: "operate",
    name: b("운영 플래너", "Operations Planner"),
    promise: b("목표에서 거꾸로 짠 주 단위 실행 계획과 완료 기준", "A week-by-week plan worked back from the goal, with done criteria"),
    outputs: [b("주차별 과제와 우선순위", "Weekly tasks and priorities"), b("마일스톤과 의존 관계", "Milestones and dependencies"), b("캘린더 파일", "Calendar file")],
    icon: KanbanSquare,
    engine: "calendar",
    next: ["sop-builder"],
  },

  // 5 · 리서치·인텔리전스
  {
    slug: "market-desk",
    category: "research",
    verb: "research",
    name: b("시장 리서치 데스크", "Market Research Desk"),
    promise: b("확인된 사실과 가설을 구분한 시장 조사 틀", "Market research that separates verified facts from hypotheses"),
    outputs: [b("조사 질문과 가설", "Research questions and assumptions"), b("출처가 붙은 근거 블록", "Evidence blocks with sources"), b("추가로 확인할 것", "What to verify next")],
    icon: ChartColumn,
    engine: null,
    next: ["competitor-lens", "persona-mapper"],
  },
  {
    slug: "competitor-lens",
    category: "research",
    verb: "research",
    name: b("경쟁사 렌즈", "Competitor Lens"),
    promise: b("경쟁사를 나란히 놓고 우리가 설 자리를 찾는 비교", "Competitors side by side, and where you can stand apart"),
    outputs: [b("비교 매트릭스", "Comparison matrix"), b("포지셔닝 맵", "Positioning map"), b("차별화 기회", "Differentiation opportunities")],
    icon: ScanEye,
    engine: null,
    next: ["brand-dna", "offer-architect"],
  },
  {
    slug: "persona-mapper",
    category: "research",
    verb: "research",
    name: b("고객 페르소나 지도", "Customer Persona Mapper"),
    promise: b("고객 한 사람의 목표·망설임·구매 계기와 여정을 한 장에", "One customer's goals, doubts, triggers and journey on a page"),
    outputs: [b("페르소나 카드", "Persona card"), b("구매 여정 지도", "Journey map"), b("메시지 제안", "Messaging recommendations")],
    icon: UserRound,
    engine: null,
    next: ["campaign-planner", "hook-lab"],
  },
  {
    slug: "trend-radar",
    category: "research",
    verb: "research",
    name: b("트렌드 레이더", "Trend Radar"),
    promise: b("검색 근거가 붙은 흐름과 기회, 가설은 가설이라고 표시", "Signals with sources and opportunities — hypotheses labelled as such"),
    outputs: [b("검색 추이와 시장 신호", "Search and market signals"), b("아이디어별 기회 점수", "Opportunity scores"), b("다음에 확인할 질문", "Questions to investigate")],
    icon: Activity,
    engine: "trend",
    next: ["idea-radar", "campaign-planner"],
  },
  {
    slug: "insight-miner",
    category: "research",
    verb: "research",
    name: b("인사이트 마이너", "Insight Miner"),
    promise: b("리뷰·설문·인터뷰에서 반복되는 주제와 고객의 진짜 요구를 캐내기", "Recurring themes and real needs, mined from reviews and interviews"),
    outputs: [b("주제 묶음과 감성", "Theme clusters and sentiment"), b("불만·칭찬·요청", "Complaints, praise and requests"), b("대표 인용과 기회", "Representative quotes and opportunities")],
    icon: Pickaxe,
    engine: null,
    next: ["offer-architect", "persona-mapper"],
  },

  // Modes that still run on their own engine until their tool absorbs them.
  {
    slug: "ad-photo",
    category: "campaign",
    verb: "create",
    name: b("제품 사진 촬영", "Product photo shoot"),
    promise: b("광고 크리에이티브 팩토리의 사진 모드 — 제품 사진 4컷", "Ad Creative Factory photo mode — four product shots"),
    outputs: [b("제품 사진 4컷", "4 product shots")],
    icon: Camera,
    engine: "image",
    hidden: { parent: "ad-factory" },
    next: ["ad-factory", "sales-page"],
  },
  {
    slug: "ad-model",
    category: "campaign",
    verb: "create",
    name: b("모델 룩북 촬영", "Model lookbook"),
    promise: b("광고 크리에이티브 팩토리의 모델 모드 — 같은 모델 4컷", "Ad Creative Factory model mode — four looks, one model"),
    outputs: [b("모델 컷 4장", "4 model shots")],
    icon: UserSquare,
    engine: "brand-model",
    hidden: { parent: "ad-factory" },
    next: ["ad-factory"],
  },
  {
    slug: "seo-keywords",
    category: "campaign",
    verb: "research",
    name: b("키워드 조사", "Keyword research"),
    promise: b("SEO 원고 컴포저의 조사 모드 — 검색량과 경쟁도", "SEO Content Composer research mode — volume and competition"),
    outputs: [b("키워드 후보와 경쟁도", "Keyword candidates and competition")],
    icon: Search,
    engine: "keyword",
    hidden: { parent: "seo-composer" },
    next: ["seo-composer"],
  },
];

/** Old tool ids (and their URLs) → the tool that replaced them. */
export const RETIRED: Record<string, string> = {
  money: "idea-radar",
  place: "seo-composer",
  prompt: "",
  grant: "doc-studio",
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

export function toolHref(slugOrEngine: string, sub = ""): string {
  return `/tools/${toolSlug(slugOrEngine)}${sub}`;
}

/** The 25 public tools, in catalog order. */
export function publicTools(): CatalogTool[] {
  return CATALOG.filter((t) => !t.hidden);
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
