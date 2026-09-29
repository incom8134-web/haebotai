// Creative directions: why two runs of the same tool no longer look
// alike. Each creative tool has a pool of genuinely different approaches
// (a site's layout archetype, a deck's story framework, an ad framework,
// a blog format, a strategic lens, a logo or photo aesthetic). Every run
// takes one this user hasn't seen in their recent runs of the tool, the
// prompt is told to commit to it, and the result records it — so the
// rotation continues and the user sees which direction they got.

export interface Direction {
  id: string;
  /** Shown on the result: "이번 방향". */
  name: string;
  /** Added to the prompt. */
  brief: string;
}

export const DIRECTIONS: Record<string, Direction[]> = {
  homepage: [
    { id: "editorial", name: "에디토리얼 매거진", brief: "잡지 같은 에디토리얼 레이아웃: 큰 세리프 헤드라인, 비대칭 그리드, 번호와 캡션이 붙은 사진, 절제된 흑백 톤에 포인트 컬러 하나." },
    { id: "immersive", name: "풀스크린 몰입형", brief: "섹션마다 화면을 가득 채우는 사진과 그 위에 얹힌 짧은 문장. 시네마틱한 어두운 오버레이, 스크롤할 때마다 장면이 바뀌는 느낌." },
    { id: "swiss", name: "스위스 미니멀 그리드", brief: "엄격한 12열 그리드, 넉넉한 여백, 굵은 산세리프와 가는 선, 숫자와 표로 정보를 구조화하는 정보 디자인 스타일. 장식 최소화." },
    { id: "bento", name: "벤토 그리드", brief: "크기가 서로 다른 카드 타일(벤토 박스)로 정보를 배치하는 모던 레이아웃. 둥근 모서리, 부드러운 그림자, 카드마다 한 가지 메시지." },
    { id: "colorblock", name: "대담한 컬러 블록", brief: "섹션마다 강한 단색 배경이 교차하는 에너지 있는 구성. 초대형 타이포, 높은 대비, 과감한 크기 대비." },
    { id: "organic", name: "따뜻한 오가닉", brief: "종이·린넨 같은 질감의 따뜻한 배경, 둥근 형태와 곡선 구분선, 자연 톤 팔레트, 손으로 만든 듯한 포인트 요소." },
    { id: "dark-luxe", name: "다크 럭셔리", brief: "깊은 어두운 배경에 금속·보석 톤 포인트, 절제된 세리프와 넓은 자간, 여백이 많은 고급스러운 호흡." },
    { id: "story-scroll", name: "스토리 스크롤", brief: "처음부터 끝까지 하나의 이야기처럼 이어지는 세로 흐름. 단계 번호, 타임라인, 장면 전환이 있는 내러티브 구성." },
    { id: "playful", name: "플레이풀 스티커", brief: "경쾌한 색, 살짝 기울어진 카드, 스티커 같은 배지와 말풍선, 둥근 산세리프. 친근하고 재미있는 동네 브랜드 톤." },
  ],
  presentation: [
    { id: "scqa", name: "SCQA 구조", brief: "상황(Situation) → 문제(Complication) → 질문(Question) → 답(Answer) 순서로 설득하는 컨설팅식 구조. 사진은 차분한 다큐멘터리 톤." },
    { id: "problem-solution", name: "문제 → 해결 → 증거", brief: "청중의 문제를 생생하게 보여 주고, 해결책, 그 해결책이 통한다는 증거, 요청 순서로. 사진은 밝은 자연광." },
    { id: "bab", name: "Before · After · Bridge", brief: "지금의 불편한 현실(Before), 바뀐 뒤의 모습(After), 그 사이를 잇는 방법(Bridge)으로 대비를 극대화. 사진은 대비가 강한 시네마틱 톤." },
    { id: "data-story", name: "숫자 하나씩", brief: "장마다 핵심 숫자 하나를 크게 내세우고 그 숫자의 의미를 설명하는 데이터 스토리텔링. 입력에 없는 수치는 [확인 필요]. 사진은 미니멀하고 그래픽적인 톤." },
    { id: "journey", name: "고객 여정", brief: "한 고객의 하루나 구매 여정을 따라가며 각 장면에서 문제와 기회를 보여 주는 구성. 사진은 사람의 손과 장면이 있는 라이프스타일 톤." },
    { id: "three-act", name: "3막 구조", brief: "설정 → 갈등 → 해결의 이야기 구조. 첫 장에서 긴장을 만들고 마지막에 요청으로 해소. 사진은 영화 스틸 같은 톤." },
    { id: "objections", name: "의심 먼저 풀기", brief: "청중이 품을 의심 3가지를 먼저 꺼내고 하나씩 근거로 해소한 뒤 결론으로 가는 구성. 사진은 신뢰감 있는 깨끗한 톤." },
  ],
  copy: [
    { id: "pas", name: "PAS (문제·자극·해결)", brief: "문제를 짚고(Problem), 그 불편을 한 번 더 느끼게 한 뒤(Agitate), 해결책을 제시(Solution)하는 구조로 각도마다 씁니다." },
    { id: "scene", name: "한 장면 스토리", brief: "각 광고를 고객의 구체적인 한 장면(시간, 장소, 행동)으로 시작해, 그 장면의 끝에서 제품이 등장하게 씁니다." },
    { id: "numbers", name: "숫자·팩트 중심", brief: "헤드라인마다 입력에 있는 구체적인 숫자나 사실(시간, 수량, 가격, 거리)을 앞세웁니다. 없는 숫자는 만들지 않습니다." },
    { id: "talk", name: "친구에게 말하듯", brief: "광고 같지 않은 대화체. 단골에게 문자 보내듯, 말하는 사람이 느껴지는 문장으로 씁니다." },
    { id: "contrast", name: "대비와 반전", brief: "고객이 예상하는 것과 실제를 대비시키거나, 첫 문장에서 반전을 주는 훅으로 시작합니다." },
    { id: "question", name: "질문으로 여는 훅", brief: "고객이 속으로 하고 있는 질문을 헤드라인으로 던지고, 본문에서 바로 답합니다." },
    { id: "4u", name: "4U (유용·긴급·고유·구체)", brief: "모든 헤드라인이 유용하고(Useful), 긴급하고(Urgent), 고유하고(Unique), 구체적인지(Ultra-specific) 스스로 점검하며 씁니다." },
  ],
  blog: [
    { id: "diary", name: "체험 일기형", brief: "직접 가 본 날의 흐름(도착 → 주문 → 맛·경험 → 나올 때)을 따라가는 일기 같은 구성." },
    { id: "listicle", name: "리스트 N선형", brief: "읽는 사람이 바로 쓸 수 있는 번호 목록(이유 N가지, 꿀팁 N개)으로 구성하고, 항목마다 구체적인 근거를 붙입니다." },
    { id: "qa", name: "Q&A 형식", brief: "검색하는 사람이 실제로 묻는 질문들을 소제목으로 삼아 하나씩 답하는 구성." },
    { id: "compare", name: "비교 분석형", brief: "다른 선택지(대안, 경쟁 유형)와 기준별로 비교해 어떤 사람에게 무엇이 맞는지 판단을 돕는 구성. 비교표 형태의 문단 포함." },
    { id: "route", name: "동선 가이드형", brief: "방문 전 준비 → 가는 길 → 현장 → 근처 코스로 이어지는 실용 가이드 구성." },
    { id: "behind", name: "비하인드 스토리형", brief: "만드는 과정, 재료, 만드는 사람의 이야기를 중심으로 브랜드를 소개하는 구성." },
    { id: "season", name: "계절·상황 제안형", brief: "지금 이 계절·상황(퇴근길, 비 오는 날, 기념일)에 왜 이것이 필요한지 제안하는 구성." },
  ],
  strategy: [
    { id: "category", name: "카테고리 재정의", brief: "기존 카테고리에서 경쟁하지 말고, 이 가게가 1등이 될 수 있는 새로운 카테고리 이름과 기준을 만드는 렌즈로 전략을 짭니다." },
    { id: "enemy", name: "공공의 적 설정", brief: "고객이 싫어하는 관행·불편(적)을 하나 정하고, 브랜드가 그 적과 싸우는 이야기로 포지셔닝과 캠페인을 짭니다." },
    { id: "ritual", name: "리추얼 만들기", brief: "고객이 반복하게 되는 작은 의식(시간, 방식, 말)을 설계하고, 그 리추얼을 중심으로 오퍼와 콘텐츠를 짭니다." },
    { id: "community", name: "단골 커뮤니티", brief: "단골을 하나의 클럽처럼 묶는 방법(이름, 혜택, 모임, 참여)을 중심으로 재방문 전략을 짭니다." },
    { id: "local", name: "로컬 정체성", brief: "이 동네·지역의 정체성과 이야기를 브랜드의 핵심 자산으로 삼는 렌즈로 전략을 짭니다." },
    { id: "scarcity", name: "한정의 경제학", brief: "수량·시간·시즌의 한정을 설계해 기다림과 긴급성을 만드는 렌즈로 오퍼와 캠페인을 짭니다." },
    { id: "founder", name: "만드는 사람 브랜드", brief: "대표·장인의 관점과 원칙을 브랜드의 목소리로 내세우는 렌즈로 콘텐츠와 포지셔닝을 짭니다." },
  ],
  sangsepage: [
    { id: "problem", name: "고민 해결형", brief: "고객의 고민에서 시작해 제품이 그 고민을 하나씩 해결하는 흐름으로 섹션을 구성합니다." },
    { id: "making", name: "제작 스토리형", brief: "원재료와 만드는 과정을 따라가며 품질을 보여 주는 흐름으로 섹션을 구성합니다." },
    { id: "scene", name: "사용 장면형", brief: "고객이 제품을 받고, 열고, 쓰는 장면을 순서대로 보여 주는 흐름으로 섹션을 구성합니다." },
    { id: "gift", name: "선물 제안형", brief: "누구에게, 어떤 날 선물하면 좋은지 상황별로 제안하는 흐름으로 섹션을 구성합니다." },
    { id: "compare", name: "비교 우위형", brief: "일반 제품과 무엇이 다른지 기준별로 비교하는 흐름으로 섹션을 구성합니다. 경쟁사를 비방하거나 없는 수치를 만들지 않습니다." },
  ],
  logo: [
    { id: "geometric", name: "미니멀 기하학", brief: "원·사각·선 같은 기본 도형만으로 만든 미니멀한 기하학 마크 계열로 네 콘셉트를 변주합니다." },
    { id: "organic", name: "손그림 오가닉", brief: "손으로 그린 듯한 유기적인 선과 따뜻한 불완전함이 있는 계열로 네 콘셉트를 변주합니다." },
    { id: "retro", name: "레트로 배지", brief: "빈티지 배지·스탬프·엠블럼 계열의 클래식한 인상으로 네 콘셉트를 변주합니다." },
    { id: "negative", name: "네거티브 스페이스", brief: "여백 속에 두 번째 의미가 숨어 있는 위트 있는 네거티브 스페이스 계열로 네 콘셉트를 변주합니다." },
    { id: "monoline", name: "모던 모노라인", brief: "일정한 굵기의 한 줄 선으로 그린 모던한 모노라인 계열로 네 콘셉트를 변주합니다." },
    { id: "bold", name: "대담한 볼드", brief: "두껍고 꽉 찬 형태, 강한 실루엣의 볼드한 계열로 네 콘셉트를 변주합니다." },
    { id: "korean", name: "한국적 모티프", brief: "한글 자음 형태, 전통 문양·기와·보자기 같은 한국적 모티프를 현대적으로 단순화한 계열로 네 콘셉트를 변주합니다." },
  ],
  image: [
    { id: "highkey", name: "밝은 하이키 스튜디오", brief: "밝고 깨끗한 하이키 조명, 흰색·밝은 배경, 부드러운 그림자의 스튜디오 톤으로 네 컷을 촬영합니다." },
    { id: "lowkey", name: "무드 있는 로우키", brief: "어두운 배경과 한 방향 조명으로 질감과 윤곽이 살아나는 로우키 톤으로 네 컷을 촬영합니다." },
    { id: "lifestyle", name: "자연광 라이프스타일", brief: "창가 자연광, 실제 생활 공간과 손이 등장하는 라이프스타일 톤으로 네 컷을 촬영합니다." },
    { id: "colorpop", name: "컬러 백드롭 팝", brief: "제품과 어울리는 강한 단색 배경과 선명한 그림자의 팝한 광고 톤으로 네 컷을 촬영합니다." },
    { id: "flatlay", name: "플랫레이 탑뷰", brief: "위에서 내려다본 플랫레이 구도, 소품을 그래픽적으로 배치한 톤으로 네 컷을 촬영합니다." },
    { id: "cinematic", name: "시네마틱 무드", brief: "영화 스틸 같은 색보정, 얕은 심도, 이야기가 느껴지는 장면 톤으로 네 컷을 촬영합니다." },
  ],
  "brand-model": [
    { id: "street", name: "도시 스트리트", brief: "도시 거리와 자연스러운 움직임이 있는 스트리트 룩북 톤으로 촬영합니다." },
    { id: "studio", name: "미니멀 스튜디오", brief: "단색 배경의 깔끔한 스튜디오 룩북 톤으로 촬영합니다." },
    { id: "natural", name: "자연광 일상", brief: "창가 자연광과 집·카페 같은 일상 공간의 편안한 톤으로 촬영합니다." },
    { id: "editorial", name: "매거진 에디토리얼", brief: "패션 매거진 같은 과감한 포즈와 구도, 강한 색보정의 에디토리얼 톤으로 촬영합니다." },
  ],
  proposal: [
    { id: "roi", name: "투자 대비 효과", brief: "상대가 얻는 효과를 비용 대비로 계산해 보여 주는 전개로 제안서를 구성합니다. 입력에 없는 수치는 [확인 필요]." },
    { id: "risk", name: "위험 제거", brief: "상대가 이 결정을 망설일 이유(위험)를 하나씩 없애 주는 전개로 제안서를 구성합니다." },
    { id: "pilot", name: "작게 먼저 시작", brief: "부담 없는 파일럿으로 시작해 성과를 확인한 뒤 확대하는 단계형 전개로 제안서를 구성합니다." },
    { id: "vision", name: "함께 만들 모습", brief: "협업 후 상대 조직의 달라진 모습을 먼저 그리고, 거기까지 가는 계획으로 제안서를 구성합니다." },
  ],
};

/** A direction this user hasn't had in their recent runs of the tool. */
export function pickDirection(toolId: string, recentIds: string[], random: () => number = Math.random): Direction | null {
  const pool = DIRECTIONS[toolId];
  if (!pool?.length) return null;
  const avoid = new Set(recentIds.slice(0, Math.max(0, Math.min(pool.length - 1, 4))));
  const fresh = pool.filter((d) => !avoid.has(d.id));
  const choices = fresh.length ? fresh : pool;
  return choices[Math.floor(random() * choices.length)];
}

/** The prompt block for the chosen direction. */
export function directionPrompt(d: Direction): string {
  return [
    `[이번 결과의 창작 방향: ${d.name}]`,
    d.brief,
    "이 방향에 확실히 맞춰 이전 결과들과 구조·표현·시각이 뚜렷하게 다르게 만드세요. 다만 사용자가 입력한 조건, 사실 규칙, 참고 자료 작업 지시와 충돌하면 그쪽을 우선하세요.",
  ].join("\n");
}
