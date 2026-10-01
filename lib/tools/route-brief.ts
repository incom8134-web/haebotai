// One-line brief → the tools that fit it best (Studio's quick start).
// Plain keyword scoring, no model call: instant, free, and it only
// suggests — the member still picks. Korean and English cues per tool;
// a longer, more specific cue weighs more.

const CUES: Record<string, string[]> = {
  "idea-radar": ["아이디어", "창업", "뭘 팔", "부업", "사업 아이템", "아이템", "business idea", "side hustle", "what to sell", "startup idea"],
  "revenue-mapper": ["수익 구조", "수익원", "수익 모델", "가격 모델", "구독 모델", "돈 버는", "revenue", "monetiz", "pricing model", "subscription"],
  "offer-architect": ["오퍼", "패키지", "가치 제안", "가격 책정", "보너스", "offer", "package", "value proposition", "bundle"],
  "market-gap": ["빈틈", "틈새", "시장 기회", "블루오션", "market gap", "niche", "underserved"],
  "mvp-blueprint": ["mvp", "최소 기능", "앱 기획", "서비스 기획", "기능 정의", "출시 계획", "prototype", "feature list", "app idea"],
  "brand-dna": ["브랜드", "브랜딩", "네이밍", "톤앤매너", "정체성", "brand identity", "branding", "tone of voice", "brand"],
  "logo-lab": ["로고", "심볼", "엠블럼", "logo", "symbol", "emblem"],
  "sales-page": ["상세페이지", "상세 페이지", "상품 페이지", "스마트스토어", "쿠팡", "판매 페이지", "product page", "sales page", "product detail"],
  "web-builder": ["홈페이지", "웹사이트", "랜딩", "사이트", "website", "landing page", "homepage", "web page"],
  "pitch-director": ["발표", "피치", "ir", "프레젠테이션", "슬라이드", "투자 유치", "pitch", "presentation", "slides", "deck"],
  "campaign-planner": ["캠페인", "마케팅 전략", "마케팅 계획", "홍보 전략", "알리고", "알리기", "런칭", "출시 홍보", "campaign", "marketing plan", "go-to-market", "launch"],
  "hook-lab": ["후킹", "카피", "문구", "광고 문구", "헤드라인", "슬로건", "캐치프레이즈", "hook", "headline", "copy", "slogan", "tagline"],
  "seo-composer": ["블로그", "seo", "검색 노출", "네이버 블로그", "포스팅", "blog", "article", "search ranking"],
  "content-transformer": ["인스타", "릴스", "쇼츠", "sns", "스레드", "콘텐츠 변환", "재가공", "instagram", "reels", "shorts", "repurpose", "social post"],
  "ad-factory": ["광고 이미지", "광고 소재", "배너", "광고 사진", "메타 광고", "ad creative", "banner", "ad image", "facebook ad"],
  "doc-studio": ["사업계획서", "지원사업", "정부지원", "보고서", "문서", "business plan", "grant", "report"],
  "proposal-forge": ["제안서", "견적", "입찰", "proposal", "quote", "bid", "rfp"],
  "sop-builder": ["매뉴얼", "업무 절차", "sop", "체크리스트", "인수인계", "manual", "procedure", "onboarding guide"],
  "meeting-action": ["회의록", "회의", "미팅", "할 일 정리", "meeting", "minutes", "action items"],
  "ops-planner": ["일정", "캘린더", "운영 계획", "주간 계획", "콘텐츠 캘린더", "schedule", "calendar", "weekly plan"],
  "market-desk": ["시장 조사", "시장 규모", "통계", "리서치", "market research", "market size", "statistics"],
  "competitor-lens": ["경쟁사", "경쟁 업체", "벤치마킹", "비교 분석", "competitor", "benchmark", "rival"],
  "persona-mapper": ["페르소나", "타깃 고객", "고객 분석", "고객층", "persona", "target audience", "customer profile"],
  "trend-radar": ["트렌드", "유행", "요즘 뜨는", "trend", "trending"],
  "insight-miner": ["리뷰 분석", "후기 분석", "설문", "고객 의견", "인사이트", "review analysis", "survey", "feedback", "insight"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ");
}

// Short Latin cues ("ir", "seo", "copy") must stand alone, not sit inside
// another word; Korean cues match inside words (조사 attach to them).
function hits(text: string, cue: string) {
  if (/^[a-z][a-z -]*$/.test(cue)) return new RegExp(`(^|[^a-z])${cue.replace(/-/g, "\\-")}`).test(text);
  return text.includes(cue);
}

/** Up to `max` tool slugs for the brief, best first; [] when nothing fits. */
export function routeBrief(brief: string, allowed?: readonly string[], max = 3): string[] {
  const text = norm(brief);
  if (text.trim().length < 2) return [];
  const scored: { slug: string; score: number }[] = [];
  for (const [slug, cues] of Object.entries(CUES)) {
    if (allowed && !allowed.includes(slug)) continue;
    let score = 0;
    for (const cue of cues) if (hits(text, norm(cue))) score += 1 + cue.length / 10;
    if (score > 0) scored.push({ slug, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max).map((x) => x.slug);
}
