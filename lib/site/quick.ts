import type { Bilingual } from "@/lib/tools/content";

// 바로 만들기 (/quick): the easy first page for shop owners who don't know
// AI. Pick what to make, write one line about the shop, press one button.
// Each choice is an existing tool, run on its own engine; the line seeds
// the tool's main field and `seed` fills the few choices an owner would
// otherwise have to make (which channels, which platforms). The tool page
// then opens in simple mode (?quick=1): no long form, the run starts.
//
// Pure data + helpers (tested against the tool manifests).

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export type QuickId = "social" | "promo" | "shortform" | "blog" | "photo" | "plan" | "reviews";

export interface QuickTool {
  id: QuickId;
  /** Catalog slug: the tool page this opens (/tools/<slug>/run). */
  slug: string;
  /** Engine id (registry), to check `seed` against its manifest. */
  engine: string;
  title: Bilingual;
  /** What comes back, in one line. */
  gives: Bilingual;
  /** What the box asks for. */
  ask: Bilingual;
  /** Example lines by trade, shown as chips and as the placeholder. */
  examples: Bilingual[];
  /** Choices pre-made for the owner (field id → value). */
  seed: Record<string, string | string[]>;
  /** One-line caution shown under the card, when the tool has one. */
  note?: Bilingual;
}

/** The three to start with: a social post, promo copy and an image. */
export const QUICK_MAIN: QuickTool[] = [
  {
    id: "social",
    slug: "content-transformer",
    engine: "content-transformer",
    title: b("SNS 게시물", "Social media post"),
    gives: b("SNS에 바로 올릴 수 있는 게시물 글과 해시태그", "A ready-to-post social media post, with hashtags"),
    ask: b("무엇을 알리고 싶은지 적어 주세요", "What do you want to tell people?"),
    examples: [
      b("성수동 작은 카페예요. 이번 주부터 딸기 타르트를 팔아요. 평일 오후 3시 이후 아메리카노 1,000원 할인.", "A small café in Seongsu. Strawberry tarts from this week; ₩1,000 off americanos on weekday afternoons after 3."),
      b("동네 꽃집이에요. 어버이날 카네이션 꽃바구니 예약을 받아요. 5월 6일까지 예약하면 메시지 카드를 함께 드려요.", "A neighbourhood florist taking Parents' Day carnation basket orders; a message card included if booked by May 6."),
      b("1인 미용실이에요. 새 학기 맞이 학생 커트 15,000원, 평일 낮 예약제로 운영해요.", "A one-person hair salon. Back-to-school student cuts ₩15,000, weekday daytime by booking."),
    ],
    seed: { source_type: "notes", targets: ["instagram_caption", "kakao", "naver_blog"] },
  },
  {
    id: "promo",
    slug: "ad-factory",
    engine: "copy",
    title: b("홍보 문구 세트", "Promo copy set"),
    gives: b("광고·문자·알림톡에 바로 쓰는 문구를 손님 마음별로", "Ready-to-use lines for ads, texts and KakaoTalk, one per buying reason"),
    ask: b("알리고 싶은 상품이나 행사를 적어 주세요", "What product or offer do you want to promote?"),
    examples: [
      b("수제 반찬 가게예요. 평일 저녁 7시 이후 반찬 3팩 10,000원 마감 할인을 해요.", "A homemade side-dish shop: three packs for ₩10,000 after 7 pm on weekdays."),
      b("필라테스 학원이에요. 첫 달 체험 4회 49,000원, 직장인 저녁반이 있어요.", "A Pilates studio: first-month trial of 4 classes for ₩49,000, evening classes for office workers."),
      b("온라인 쇼핑몰에서 수제 캔들을 팔아요. 집들이 선물 세트 출시, 3만 원 이상 구매하면 리본 포장.", "An online shop selling handmade candles: new housewarming gift set, ribbon wrapping on orders over ₩30,000."),
    ],
    seed: { channels: ["instagram", "paid_social", "sms"] },
  },
  {
    id: "photo",
    slug: "ad-photo",
    engine: "image",
    title: b("이미지 생성기", "Image generator"),
    gives: b("글로 설명하면 SNS·광고에 쓸 이미지 4장", "Describe it and get four images for social posts and ads"),
    ask: b("어떤 이미지를 만들지 적어 주세요", "What image should we make?"),
    examples: [
      b("딸기 타르트가 놓인 카페 창가 테이블, 따뜻한 봄 햇살, 인스타그램 정사각형 사진", "A strawberry tart on a café window table, warm spring sunlight, square Instagram photo"),
      b("유리병에 담긴 수제 유자청, 나무 테이블 위, 밝고 깨끗한 제품 사진", "Homemade yuzu preserve in a glass jar on a wooden table, bright clean product shot"),
      b("어버이날 카네이션 꽃바구니, 분홍빛 배경, 선물하고 싶은 느낌", "A Parents' Day carnation basket on a soft pink background, gift-worthy feel"),
    ],
    seed: { ratio: "1:1" },
    note: b("이미지는 결제를 켠 Google 키가 있어야 만들어져요", "Images need a Google key with billing turned on"),
  },
];

/** More marketing essentials, one tap away from the same box. */
export const QUICK_MORE: QuickTool[] = [
  {
    id: "shortform",
    slug: "hook-lab",
    engine: "hook-lab",
    title: b("릴스·쇼츠 아이디어", "Reels & Shorts ideas"),
    gives: b("짧은 영상의 첫 3초 문장과 첫 장면", "The first three seconds and first scene of a short video"),
    ask: b("영상으로 보여 주고 싶은 것을 적어 주세요", "What do you want to show in a video?"),
    examples: [
      b("빵집이에요. 새벽에 크루아상 반죽을 접는 과정을 보여 주고 싶어요.", "A bakery: I want to show folding croissant dough at dawn."),
      b("네일숍이에요. 손님들이 가장 많이 고르는 봄 네일 디자인 5가지를 소개하고 싶어요.", "A nail salon: the five spring designs customers choose most."),
      b("고깃집이에요. 숙성실에서 고기를 꺼내 굽기까지의 과정을 보여 주고 싶어요.", "A BBQ restaurant: from the ageing room to the grill."),
    ],
    seed: { platforms: ["reels", "shorts"], goal: "awareness" },
  },
  {
    id: "blog",
    slug: "seo-composer",
    engine: "blog",
    title: b("네이버 블로그 글", "Naver blog post"),
    gives: b("검색에 걸리는 블로그 글과 사진", "A blog post written for search, with photos"),
    ask: b("블로그 글의 주제를 적어 주세요", "What should the post be about?"),
    examples: [b("강남역 근처 회식하기 좋은 고깃집, 단체석과 주차 안내", "A BBQ place near Gangnam Station for team dinners: group seating and parking")],
    seed: { platform: "naver", post_type: "info" },
  },
  {
    id: "plan",
    slug: "campaign-planner",
    engine: "strategy",
    title: b("한 달 홍보 계획", "One-month promo plan"),
    gives: b("무엇을, 어디에, 언제 올릴지 한 달 계획", "What to post, where and when, for a month"),
    ask: b("가게와 이번 달 목표를 적어 주세요", "Your shop and this month's goal"),
    examples: [b("대학가 분식집이에요. 개강 시즌에 신입생 손님을 늘리고 싶어요.", "A snack bar near a university; I want more freshmen at the start of term.")],
    seed: {},
  },
  {
    id: "reviews",
    slug: "insight-miner",
    engine: "insight-miner",
    title: b("손님 리뷰 분석", "Customer review analysis"),
    gives: b("리뷰에서 반복되는 칭찬·불만과 다음에 할 일", "Repeated praise and complaints in reviews, and what to do next"),
    ask: b("네이버·배민 등에 달린 리뷰를 붙여 넣어 주세요", "Paste reviews from Naver, Baemin and so on"),
    examples: [b("맛있어요 양도 많고요 / 배달이 너무 늦었어요 / 사장님이 친절하세요 / 국물이 조금 짰어요", "Tasty and generous / delivery was very late / the owner is kind / the soup was a bit salty")],
    seed: {},
  },
];

export const QUICK_TOOLS: QuickTool[] = [...QUICK_MAIN, ...QUICK_MORE];

export function quickTool(id: string | null | undefined): QuickTool | undefined {
  return QUICK_TOOLS.find((t) => t.id === id);
}

/** Seeds for a tool page opened from /quick, keyed by catalog slug. */
export function quickSeed(slug: string): Record<string, string | string[]> {
  return QUICK_TOOLS.find((t) => t.slug === slug)?.seed ?? {};
}

/** The tool page for one quick request: simple mode, the line as the brief. */
export function quickHref(tool: QuickTool, line: string): string {
  const q = new URLSearchParams({ quick: "1", brief: line.trim().slice(0, 2000) });
  return `/tools/${tool.slug}/run?${q.toString()}`;
}
