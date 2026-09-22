import type { Bilingual } from "@/lib/tools/content";

export type NoteKind = "new" | "improved" | "fixed";

export const PATCH_NOTES: { version: string; date: string; title: Bilingual; items: { kind: NoteKind; text: Bilingual }[] }[] = [
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
