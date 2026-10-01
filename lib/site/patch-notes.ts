import type { Bilingual } from "@/lib/tools/content";

export type NoteKind = "new" | "improved" | "fixed";

export const PATCH_NOTES: { version: string; date: string; title: Bilingual; items: { kind: NoteKind; text: Bilingual }[] }[] = [
  {
    version: "2.4.0",
    date: "2026-09-30",
    title: { ko: "문서·운영: 업무 매뉴얼 빌더, 회의→실행 보드와 새 결과 화면", en: "Documents & Operations: SOP Builder, Meeting-to-Action and new result screens" },
    items: [
      { kind: "new", text: { ko: "업무 매뉴얼 빌더: 역할별 흐름도, 판단 지점, 체크할 수 있는 품질 체크리스트, 예외 대응", en: "SOP Builder: a flow by role, decision points, a tickable quality checklist and exception handling" } },
      { kind: "new", text: { ko: "회의→실행 보드: 결정·담당자·마감·열린 질문으로 정리, 메모에 없는 담당자와 날짜는 지어내지 않고, 마감은 캘린더 파일로", en: "Meeting-to-Action: decisions, owners, deadlines and open questions — nothing invented — with deadlines as a calendar file" } },
      { kind: "improved", text: { ko: "비즈니스 문서 스튜디오: 목차를 눌러 바로 이동하는 문서 화면", en: "Business Document Studio: a document view with a clickable outline" } },
      { kind: "improved", text: { ko: "제안서 포지: 섹션 순서 바꾸기·빼기 후 한 번에 복사, 부가세까지 계산하는 견적표", en: "Proposal Forge: reorder or hide sections and copy in that order; a pricing table with VAT" } },
      { kind: "improved", text: { ko: "운영 플래너: 칸반·타임라인·체크리스트를 오가며 진행 상태 체크", en: "Operations Planner: switch between kanban, timeline and checklist while tracking progress" } },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-09-30",
    title: { ko: "캠페인·콘텐츠: 훅 연구소, 콘텐츠 변환기와 새 결과 화면", en: "Campaigns & Content: Hook Lab, Content Transformer and new result screens" },
    items: [
      { kind: "new", text: { ko: "훅 연구소: 질문·통념 뒤집기·숫자·전후 비교 등 유형별 훅 카드, 화면 글자와 첫 장면, 플랫폼별 변형", en: "Hook Lab: hook cards by family, with on-screen text, the first scene and a version per platform" } },
      { kind: "new", text: { ko: "콘텐츠 변환기: 글 하나를 카드뉴스·쇼츠 대본·스레드·링크드인·뉴스레터·카카오톡으로 각각 다시, 글자 수 확인까지", en: "Content Transformer: one piece re-made as a carousel, Shorts script, Threads, LinkedIn, newsletter or KakaoTalk, with length checks" } },
      { kind: "improved", text: { ko: "캠페인 플래너: 채널별 13주 타임라인이 추가됐어요 (PDF·PPT에도 들어가요)", en: "Campaign Planner: a 13-week timeline per channel (also in PDF and PowerPoint)" } },
      { kind: "improved", text: { ko: "SEO 원고 컴포저: 원고를 바로 고치면 옆에서 SEO 점검 9가지가 다시 계산돼요", en: "SEO Content Composer: edit the draft and nine SEO checks re-run beside it" } },
      { kind: "improved", text: { ko: "광고 크리에이티브 팩토리: 구매 동기별 광고 보드와 각도마다 A/B 두 안", en: "Ad Creative Factory: a board by buying motive with an A and B version of each ad" } },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-09-30",
    title: { ko: "브랜드·웹·세일즈: 브랜드 DNA 스튜디오와 도구별 새 결과 화면", en: "Brand, Web & Sales: Brand DNA Studio and new result screens" },
    items: [
      { kind: "new", text: { ko: "브랜드 DNA 스튜디오: 성격 비율, 대비를 계산한 팔레트, 실제 한글 서체 견본, 상황별 말투 예시, 태그라인을 한 장의 브랜드 보드로", en: "Brand DNA Studio: personality mix, a contrast-checked palette, real Korean font specimens, voice samples and taglines on one brand board" } },
      { kind: "new", text: { ko: "브랜드 보드에서 로고·웹사이트·세일즈 페이지·광고로 이어가면 이름, 무드, 색, 서체, 포지셔닝이 채워져요", en: "Continue from the brand board to logo, website, sales page or ads with the name, mood, colours, fonts and positioning filled in" } },
      { kind: "improved", text: { ko: "로고 디렉션 랩: 4가지 방향을 한눈에 비교하고, 16px 파비콘까지 크기 테스트와 즐겨찾기", en: "Logo Direction Lab: compare all four directions, size-test down to a 16px favicon, and star favourites" } },
      { kind: "improved", text: { ko: "세일즈 페이지 설계소: 와이어프레임과 섹션별 카피·촬영 지시를 나란히, 완성 이미지는 따로 보기", en: "Sales Page Architect: a wireframe beside each section's copy and shot list, with the rendered page on its own tab" } },
      { kind: "improved", text: { ko: "웹 익스피리언스 빌더: 섹션별 목적과 레이아웃이 보이는 사이트맵", en: "Web Experience Builder: a sitemap with each section's goal and layout" } },
      { kind: "improved", text: { ko: "피치 비주얼 디렉터: 슬라이드별 레이아웃과 예상 발표 시간이 보이는 스토리보드", en: "Pitch Visual Director: a storyboard with each slide's layout and estimated speaking time" } },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-30",
    title: { ko: "발견·수익 설계 5개 도구 공개", en: "Five Discover & Monetize tools are live" },
    items: [
      { kind: "new", text: { ko: "아이디어 레이더: 내 경력·자금·시간에 맞는 아이디어 4~6개를 다섯 축 점수로 비교하고, 즐겨찾기·비교·다음 도구로 이어가기", en: "Idea Radar: 4–6 ideas scored on five axes, with favourites, side-by-side compare and one-click hand-off to the next tool" } },
      { kind: "new", text: { ko: "수익 구조 지도: 고객과 수익원을 잇는 흐름도, 가치 사다리, 숫자를 바꿔 보는 단위 경제성 계산", en: "Revenue Mapper: a segment-to-stream flow map, value ladder and an editable unit-economics calculator" } },
      { kind: "new", text: { ko: "오퍼 설계소: 약속·패키지 3단·보증·망설임별 답변을 블록으로 고치고 복사", en: "Offer Architect: promise, three tiers, guarantee and objection answers as blocks you can edit and copy" } },
      { kind: "new", text: { ko: "시장 빈틈 탐지기: 니즈 × 기존 해결책 지도, 검색 근거·입력·가설을 구분해 표시", en: "Market Gap Finder: a needs × solutions map with search evidence, your input and hypotheses labelled apart" } },
      { kind: "new", text: { ko: "MVP 설계도: Must·Should·Later 보드, 사용자 여정, 기간에 맞춘 단계, 체크할 수 있는 출시 목록", en: "MVP Blueprint: a Must/Should/Later board, user journey, stages that fit your timeline and a tickable launch checklist" } },
      { kind: "improved", text: { ko: "예전 '수익화 방향' 결과는 보관함에 그대로 남고, 새 실행은 아이디어 레이더로 연결", en: "Past monetization results stay in your library; new runs go to Idea Radar" } },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-09-30",
    title: { ko: "새 도구 체계: 5개 분야, 25개 도구", en: "New tool lineup: 5 areas, 25 tools" },
    items: [
      { kind: "new", text: { ko: "도구를 발견·수익 설계, 브랜드·웹·세일즈, 캠페인·콘텐츠, 문서·운영 시스템, 리서치·인텔리전스 5개 분야로 새로 정리", en: "Tools are reorganised into five areas: Discover & Monetize, Brand/Web/Sales, Campaigns & Content, Documents & Operations, Research & Intelligence" } },
      { kind: "new", text: { ko: "도구 이름과 주소가 바뀌었어요. 예전 주소와 보관함의 결과는 그대로 새 도구로 연결됩니다", en: "Tools have new names and URLs. Old links and your saved results lead to the new tools" } },
      { kind: "new", text: { ko: "새 리서치·인텔리전스 분야와 훅 연구소, 콘텐츠 변환기, 업무 매뉴얼 빌더 등 13개 도구를 순서대로 공개합니다 (도구 목록에 '곧 공개'로 표시)", en: "A new Research & Intelligence area plus 13 more tools (Hook Lab, Content Transformer, SOP Builder and others) launch in stages — marked \"coming soon\"" } },
      { kind: "improved", text: { ko: "도구 찾기: 하고 싶은 일로 검색, 설계·판매·만들기·운영·조사 필터, 즐겨찾기와 최근 사용, 도구마다 받게 될 결과를 미리 표시", en: "Finding tools: search by task, Build/Sell/Create/Operate/Research filters, pinned and recent tools, and each tool's deliverables shown up front" } },
      { kind: "improved", text: { ko: "밝고 따뜻한 새 디자인 (다크 모드는 그대로 선택 가능)", en: "A brighter, warmer design (dark mode still available)" } },
      { kind: "improved", text: { ko: "네이버 플레이스·프롬프트 빌더·지원사업 매칭은 종료하고 가까운 도구로 연결", en: "Place optimisation, Prompt builder and Grant matching are retired; their links lead to the closest tool" } },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-09-22",
    title: { ko: "15개 도구에서 Claude 선택, 키 상태 한눈에", en: "Choose Claude on 15 tools, key status at a glance" },
    items: [
      { kind: "new", text: { ko: "블로그·기획서·발표자료·캘린더 등 15개 도구에서 Gemini 대신 내 Claude 키로 실행 가능", en: "Blog, proposal, presentation, calendar and 11 more tools can now run on your own Claude key instead of Gemini" } },
      { kind: "new", text: { ko: "도구 실행 화면에 엔진 선택 탭과 실시간 예상 크레딧 표시", en: "Run pages show an engine picker with a live estimated-credits line" } },
      { kind: "new", text: { ko: "API 키 화면: 인증 실패한 키에 경고 표시, 각 엔진이 어떤 도구에 쓰이는지 실시간 안내", en: "API key screen flags keys that failed auth, and lists which tools each provider currently powers" } },
      { kind: "improved", text: { ko: "결과·라이브러리에 어떤 엔진으로 생성했는지 배지로 표시", en: "Results and Library now show a badge for which engine generated them" } },
    ],
  },
  {
    version: "1.6.1",
    date: "2026-09-21",
    title: { ko: "새 첫 화면과 로그인, 화면 깨짐 수정", en: "New landing and sign-in, layout fixes" },
    items: [
      { kind: "new", text: { ko: "첫 화면: 실제로 움직이는 스튜디오 미리보기, 도구·흐름·요금·질문을 한 번에", en: "Landing: a live studio demo, tools, flows, pricing and FAQ in one story" } },
      { kind: "new", text: { ko: "로그인: 보던 화면으로 바로 돌아오기, 가입 혜택 안내", en: "Sign-in returns you to where you were, with clear sign-up terms" } },
      { kind: "fixed", text: { ko: "오른쪽 메뉴가 화면 가운데로 밀려 내용을 덮던 문제", en: "The right-side dock dropped into the page and covered content" } },
      { kind: "fixed", text: { ko: "상단 로고·검색이 스크롤한 내용과 겹쳐 보이던 문제", en: "Top brand and search chips overlapped scrolled content" } },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-09-21",
    title: { ko: "도구마다 다른 작업 화면", en: "A different workspace for every tool" },
    items: [
      { kind: "new", text: { ko: "18개 도구 모두 고유한 이야기, 단계, 입력 방식, 실시간 미리보기", en: "All 18 tools get their own story, steps, controls and live preview" } },
      { kind: "new", text: { ko: "발표자료: 슬라이드 수를 움직이면 장수가 바로 바뀌는 미리보기, 디자인 톤, 꼭 넣을 자료", en: "Presentation: slide slider with live thumbnails, design tone, must-include material" } },
      { kind: "new", text: { ko: "프롬프트 빌더: 대화형·이미지·코딩·영상 AI별 구조, 톤, 마음에 들었던 프롬프트 참고", en: "Prompt Builder: structures for chat, image, coding and video AIs, tone, style reference" } },
      { kind: "new", text: { ko: "사업계획서: 단가와 비용을 넣는 즉시 손익분기 계산 / 홈페이지: 고른 섹션이 미리보기에 쌓임", en: "Business Plan: live break-even / Homepage: chosen sections stack in the preview" } },
      { kind: "improved", text: { ko: "한국어 줄바꿈이 단어 중간에서 끊기지 않도록 전체 텍스트 배치 개선", en: "Korean text no longer breaks mid-word anywhere" } },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-09-21",
    title: { ko: "서비스별 전용 페이지", en: "A page for every service" },
    items: [
      { kind: "new", text: { ko: "도움말 홈, 자주 묻는 질문, 고객센터, API 키 설명서, 새로운 점을 각각의 페이지로", en: "Help home, FAQ, customer service, API key manual and What's new are now separate pages" } },
      { kind: "new", text: { ko: "크레딧·한도 페이지: 남은 크레딧, 이번 달 도구별 사용량, 도구별 비용, 실행 한도", en: "Credits & limits page: balance, this month's usage by tool, cost per tool, run limits" } },
      { kind: "new", text: { ko: "바로가기 페이지: 고정한 도구, 최근 결과, 외부 서비스, 단축키", en: "Quick links page: pinned tools, latest results, outside services, shortcuts" } },
      { kind: "new", text: { ko: "모든 도구 실행 화면 옆에 예시·팁·결과 미리보기 가이드", en: "Every tool's run screen now has a guide rail with examples, tips and a result preview" } },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-09-21",
    title: { ko: "리퀴드 글래스 디자인과 더 단순한 구조", en: "Liquid-glass design, simpler structure" },
    items: [
      { kind: "improved", text: { ko: "오른쪽 플로팅 독(휴대폰은 하단 탭바)으로 메뉴 이동", en: "Navigation moved to a floating dock on the right (bottom tab bar on phones)" } },
      { kind: "improved", text: { ko: "고객센터·FAQ·새로운 점을 '도움말' 한 곳으로", en: "Support, FAQ and What's new merged into one Help page" } },
      { kind: "improved", text: { ko: "멤버십·API 키·마이페이지를 '계정' 한 곳으로", en: "Membership, API key and My page merged into Account" } },
      { kind: "new", text: { ko: "도구 페이지 새 레이아웃, 흐름(워크플로)은 도구 화면 맨 위로", en: "New tool page layout; flows now lead the Tools page" } },
      { kind: "new", text: { ko: "부드러운 화면 전환과 반응형 애니메이션", en: "Smooth page transitions and responsive motion" } },
      { kind: "new", text: { ko: "새 도구 3종: 브랜드 전략, 캠페인 카피, 발표자료", en: "Three new tools: Brand Strategy, Campaign Copy, Presentation Builder" } },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-21",
    title: { ko: "도구별 홈, 프롬프트 라이브러리, 고객센터", en: "Tool homes, prompt library, support center" },
    items: [
      { kind: "new", text: { ko: "15개 도구마다 소개·예시 프리셋·사용법·FAQ가 있는 전용 페이지", en: "A dedicated page for each of the 15 tools with presets, how-to and FAQ" } },
      { kind: "new", text: { ko: "프롬프트 라이브러리 — 검증된 예시를 복사하거나 바로 도구로 보내기", en: "Prompt Library — copy tested examples or send them straight to a tool" } },
      { kind: "new", text: { ko: "고객센터 문의, 원격 지원 신청, 문의 내역", en: "Support tickets, remote-help requests and ticket history" } },
      { kind: "new", text: { ko: "내 API 키 등록 (암호화 저장, 크레딧 미차감)", en: "Bring your own API key (encrypted, no credits charged)" } },
      { kind: "improved", text: { ko: "도구를 별표로 고정하면 스튜디오 맨 앞에 표시", en: "Star a tool to pin it to the front of the Studio" } },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-18",
    title: { ko: "스튜디오", en: "The Studio" },
    items: [
      { kind: "new", text: { ko: "브리프 하나로 도구를 고르고 바로 시작하는 스튜디오", en: "The Studio: one brief, pick a tool, start" } },
      { kind: "improved", text: { ko: "헤더 재디자인과 크레딧 표시", en: "Redesigned header with credit balance" } },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-16",
    title: { ko: "내보내기와 이어서 만들기", en: "Exports and chaining" },
    items: [
      { kind: "new", text: { ko: "Word·Excel·캘린더 내보내기", en: "Word, Excel and calendar exports" } },
      { kind: "new", text: { ko: "결과를 다음 도구로 넘기는 '이어서 만들기'", en: "\"Continue with…\" to chain results between tools" } },
      { kind: "fixed", text: { ko: "긴 실행이 중간에 끊기면 크레딧이 환불되지 않던 문제", en: "Credits weren't refunded when long runs dropped mid-stream" } },
    ],
  },
];
