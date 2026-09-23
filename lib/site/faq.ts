import type { Bilingual } from "@/lib/tools/content";

export type FaqCategory = "start" | "credits" | "tools" | "sources" | "api" | "account";

export const FAQ_CATEGORIES: Record<FaqCategory, Bilingual> = {
  start: { ko: "시작하기", en: "Getting started" },
  credits: { ko: "크레딧·멤버십", en: "Credits & membership" },
  tools: { ko: "도구 사용", en: "Using tools" },
  sources: { ko: "출처·신뢰", en: "Sources & trust" },
  api: { ko: "API 키", en: "API keys" },
  account: { ko: "계정·데이터", en: "Account & data" },
};

export const FAQ: { category: FaqCategory; q: Bilingual; a: Bilingual }[] = [
  { category: "start", q: { ko: "무엇부터 하면 되나요?", en: "Where do I start?" }, a: { ko: "브랜드 탭에서 비즈니스 프로필을 먼저 채우세요. 모든 도구가 이 정보를 자동으로 읽어서, 같은 내용을 다시 입력할 일이 없습니다. 그다음 홈의 '이번 달 목표'에서 하고 싶은 일을 고르면 맞는 도구로 안내합니다.", en: "Fill in your Business Profile in the Brand tab first — every tool reads it, so you never retype it. Then pick a goal on Home and we'll point you to the right tools." } },
  { category: "start", q: { ko: "도구마다 따로 로그인해야 하나요?", en: "Do I sign in to each tool separately?" }, a: { ko: "아니요. 해봇 AI는 18개 도구가 하나의 앱입니다. 로그인, 크레딧, 보관함, 프로필이 모두 공유됩니다.", en: "No. All 18 tools live in one app, sharing sign-in, credits, library and profile." } },
  { category: "start", q: { ko: "도구끼리 결과를 이어서 쓸 수 있나요?", en: "Can tools use each other's results?" }, a: { ko: "네. 결과 아래 '이어서 만들기'를 누르면 다음 도구가 앞 결과를 이어받아 시작합니다. 파일을 내보냈다 다시 올릴 필요가 없습니다.", en: "Yes. \"Continue with…\" under a result starts the next tool with that result loaded — no exporting and re-uploading." } },
  { category: "credits", q: { ko: "크레딧은 어떻게 차감되나요?", en: "How are credits charged?" }, a: { ko: "실행 전에 예상 크레딧을 예약하고, 끝나면 실제 사용량으로 정산합니다. 실패하거나 취소하면 자동으로 환불됩니다.", en: "We reserve the estimate before a run and settle to actual usage after. Failed or cancelled runs are refunded automatically." } },
  { category: "credits", q: { ko: "학생 멤버십은 무엇이 다른가요?", en: "What does Student membership include?" }, a: { ko: "학교 이메일 또는 재학증명서로 인증하면 모든 도구를 크레딧 제한 없이 쓸 수 있습니다. 본인 API 키를 등록하면 더 빠른 모델 한도를 쓸 수 있습니다.", en: "Verify with a school email or enrollment certificate for unlimited use of every tool. Add your own API key for higher model limits." } },
  { category: "credits", q: { ko: "크레딧은 언제 초기화되나요?", en: "When do credits reset?" }, a: { ko: "초기화되지 않습니다. 프로를 결제하면 2,000 크레딧이 더해지고 30일 동안 프로가 유지됩니다. 자동 결제는 없으니, 기간이 끝나기 전에 다시 결제하면 남은 기간에 30일이 더해집니다.", en: "They don't reset. Each Pro purchase adds 2,000 credits and 30 days of Pro. There's no auto-renewal — buying again before it ends adds 30 days to what's left." } },
  { category: "tools", q: { ko: "결과가 마음에 들지 않으면요?", en: "What if I don't like a result?" }, a: { ko: "입력을 조금 바꿔 다시 실행하세요. 이전 결과는 보관함에 모두 남습니다. 도구 페이지의 예시 프리셋에서 시작하면 좋은 입력의 감을 잡기 쉽습니다.", en: "Tweak the input and rerun — earlier results stay in the Library. Starting from a tool's presets shows what good input looks like." } },
  { category: "tools", q: { ko: "결과물을 상업적으로 써도 되나요?", en: "Can I use outputs commercially?" }, a: { ko: "직접 생성한 결과물은 상업적으로 사용할 수 있습니다. 다만 타사 상표가 들어간 결과는 쓰지 마세요.", en: "Yes, outputs you generate are yours to use commercially — avoid any containing others' trademarks." } },
  { category: "tools", q: { ko: "어떤 형식으로 내보낼 수 있나요?", en: "Which export formats are supported?" }, a: { ko: "문서는 Word(.docx), 재무·표는 Excel(.xlsx), 일정은 캘린더(.ics)·CSV, 로고는 SVG, 홈페이지는 ZIP으로 내보냅니다.", en: "Documents as .docx, tables as .xlsx, schedules as .ics/.csv, logos as SVG and homepages as ZIP." } },
  { category: "sources", q: { ko: "'추정' 배지는 무엇인가요?", en: "What's the \"estimate\" badge?" }, a: { ko: "출처로 확인하지 못한 숫자입니다. 다른 서비스처럼 그럴듯한 숫자를 조용히 보여 주지 않고, 확인되지 않았다는 사실을 표시합니다.", en: "A number we couldn't confirm with a source. Rather than quietly showing plausible figures, we tell you it's unverified." } },
  { category: "sources", q: { ko: "출처는 어디서 오나요?", en: "Where do sources come from?" }, a: { ko: "웹 검색이 필요한 도구는 실행 중 실제 검색을 하고, 찾은 페이지의 제목·도메인·링크를 출처 패널에 보여 줍니다.", en: "Tools that need web evidence search live during the run and list each page's title, domain and link in the Sources panel." } },
  { category: "api", q: { ko: "내 API 키를 등록하면 무엇이 좋나요?", en: "Why add my own API key?" }, a: { ko: "본인 Google AI Studio 키로 실행하면 크레딧이 차감되지 않고, 본인 계정의 한도를 사용합니다.", en: "Runs use your Google AI Studio key — no credits are charged and your own quota applies." } },
  { category: "api", q: { ko: "API 키는 안전하게 보관되나요?", en: "Is my API key stored safely?" }, a: { ko: "서버에서 AES-256-GCM으로 암호화해 저장하고, 화면에는 마지막 4자리만 보여 줍니다. 브라우저로는 절대 다시 전송되지 않습니다.", en: "It's encrypted server-side with AES-256-GCM and only the last 4 characters are ever shown. It's never sent back to the browser." } },
  { category: "account", q: { ko: "내 데이터로 AI를 학습하나요?", en: "Is my data used for training?" }, a: { ko: "아니요. 입력과 결과는 결과 제공과 보관함 저장에만 사용됩니다.", en: "No. Inputs and outputs are used only to produce results and keep your Library." } },
  { category: "account", q: { ko: "보관함 결과를 삭제할 수 있나요?", en: "Can I delete Library results?" }, a: { ko: "네, 보관함의 각 결과에서 삭제할 수 있습니다. 삭제한 결과는 복구되지 않습니다.", en: "Yes, from each result in the Library. Deleted results can't be recovered." } },
];
