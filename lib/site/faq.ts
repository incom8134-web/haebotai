import type { Bilingual } from "@/lib/tools/content";
import { OWN_KEY_ONLY } from "@/lib/site/access";

export type FaqCategory = "start" | "projects" | "credits" | "tools" | "sources" | "api" | "account";

const ALL_CATEGORIES: Record<FaqCategory, Bilingual> = {
  start: { ko: "시작하기", en: "Getting started" },
  projects: { ko: "프로젝트·버전", en: "Projects & versions" },
  credits: { ko: "크레딧·멤버십", en: "Credits & membership" },
  tools: { ko: "도구 사용", en: "Using tools" },
  sources: { ko: "출처·신뢰", en: "Sources & trust" },
  api: { ko: "API 키", en: "API keys" },
  account: { ko: "계정·데이터", en: "Account & data" },
};

type Faq = { category: FaqCategory; q: Bilingual; a: Bilingual };

const ALL_FAQ: Faq[] = [
  { category: "start", q: { ko: "무엇부터 하면 되나요?", en: "Where do I start?" }, a: { ko: "처음 로그인하면 목표를 고르고 프로젝트를 만드는 세 화면짜리 안내가 나와요. 마지막 화면의 '첫 작업'을 누르면 그 프로젝트에서 첫 도구가 열립니다. 건너뛰었다면 스튜디오의 '다음에 해 볼 것'이나 도구 페이지에서 시작하세요.", en: "Your first sign-in shows a three-screen setup: pick a goal and create a project. \"First task\" on the last screen opens your first tool inside that project. If you skipped it, start from \"Try next\" in the Studio or the Tools page." } },
  { category: "start", q: { ko: "도구마다 따로 로그인해야 하나요?", en: "Do I sign in to each tool separately?" }, a: { ko: "아니요. 25개 도구가 모두 하나의 앱이에요. 로그인, 크레딧, 프로젝트, 보관함이 모두 공유돼요.", en: "No. All 25 tools are one app, sharing sign-in, credits, projects and the Library." } },
  { category: "start", q: { ko: "도구끼리 결과를 이어서 쓸 수 있나요?", en: "Can tools use each other's results?" }, a: { ko: "네. 결과 아래 '이어서 만들기'를 누르면 다음 도구가 앞 결과를 이어받아 입력칸이 채워진 채로 열려요. 파일을 내보냈다 다시 올릴 필요가 없어요.", en: "Yes. \"Continue with…\" under a result opens the next tool with that result already filled in — no exporting and re-uploading." } },
  { category: "projects", q: { ko: "프로젝트는 무엇인가요?", en: "What is a project?" }, a: { ko: "사업이나 브랜드 하나를 위한 작업 공간이에요. 그 안에서 만든 결과가 모이고, 회사명·고객·포지셔닝·브랜드 색 같은 정보를 '프로젝트 메모리'로 기억해요.", en: "A workspace for one business or brand. Its results are kept together, and it remembers things like the name, customer, positioning and brand colours as project memory." } },
  { category: "projects", q: { ko: "프로젝트 메모리는 어떻게 채워지나요?", en: "How does project memory fill up?" }, a: { ko: "프로젝트 안에서 도구 실행이 끝나면 결과에서 정해진 내용이 자동으로 저장돼요. 프로젝트 화면에서 직접 고치거나 지울 수도 있어요. 도구를 열면 비어 있는 칸만 채우고, 직접 쓴 내용은 덮어쓰지 않아요.", en: "When a run in the project finishes, what it settled is saved automatically, and you can edit or clear it on the project page. Opening a tool fills only empty fields — it never overwrites what you typed." } },
  { category: "projects", q: { ko: "결과의 한 부분만 고칠 수 있나요?", en: "Can I change just one part of a result?" }, a: { ko: "네. 보관함의 결과에서 '이 부분만 다시 만들기'를 쓰면 고른 부분만 원하는 방향으로 다시 만들어 새 버전으로 저장해요. 원래 결과는 그대로 남고, 버전 사이를 오갈 수 있어요. 비용은 그 도구 크레딧의 25%(최소 5)예요.", en: "Yes. \"Redo one part\" on a saved result rewrites only the section you pick and saves a new version; the original stays and you can move between versions. It costs 25% of the tool's credits (at least 5)." } },
  { category: "projects", q: { ko: "프로젝트를 지우면 결과도 지워지나요?", en: "Does deleting a project delete its results?" }, a: { ko: "아니요. 프로젝트와 그 메모리만 지워지고, 결과는 보관함에 남아요(프로젝트 연결만 풀려요).", en: "No. The project and its memory are deleted; the results stay in your Library, just no longer linked to it." } },
  { category: "credits", q: { ko: "크레딧은 어떻게 차감되나요?", en: "How are credits charged?" }, a: { ko: "실행 전에 예상 크레딧을 예약하고, 끝나면 실제 사용량으로 정산합니다. 실패하거나 취소하면 자동으로 환불됩니다.", en: "We reserve the estimate before a run and settle to actual usage after. Failed or cancelled runs are refunded automatically." } },
  { category: "credits", q: { ko: "학생 멤버십은 무엇이 다른가요?", en: "What does Student membership include?" }, a: { ko: "학교 이메일 또는 재학증명서로 인증하면 모든 도구를 크레딧 제한 없이 쓸 수 있습니다. 본인 API 키를 등록하면 더 빠른 모델 한도를 쓸 수 있습니다.", en: "Verify with a school email or enrollment certificate for unlimited use of every tool. Add your own API key for higher model limits." } },
  { category: "credits", q: { ko: "크레딧은 언제 초기화되나요?", en: "When do credits reset?" }, a: { ko: "초기화되지 않습니다. 프로를 결제하면 2,000 크레딧이 더해지고 30일 동안 프로가 유지됩니다. 자동 결제는 없으니, 기간이 끝나기 전에 다시 결제하면 남은 기간에 30일이 더해집니다.", en: "They don't reset. Each Pro purchase adds 2,000 credits and 30 days of Pro. There's no auto-renewal — buying again before it ends adds 30 days to what's left." } },
  { category: "tools", q: { ko: "결과가 마음에 들지 않으면요?", en: "What if I don't like a result?" }, a: { ko: "보관함의 결과에서 '이 부분만 다시 만들기'로 한 부분만 원하는 방향으로 고칠 수 있어요(새 버전으로 저장되고 원래 결과는 남아요). 전체를 바꾸고 싶다면 '같은 입력으로 다시'에서 입력을 조금 바꿔 실행하세요.", en: "Use \"Redo one part\" on a saved result to rewrite a single section your way — it's saved as a new version and the original stays. To change everything, use \"Run again\" and tweak the inputs." } },
  { category: "tools", q: { ko: "결과물을 상업적으로 써도 되나요?", en: "Can I use outputs commercially?" }, a: { ko: "직접 생성한 결과물은 상업적으로 사용할 수 있습니다. 다만 타사 상표가 들어간 결과는 쓰지 마세요.", en: "Yes, outputs you generate are yours to use commercially — avoid any containing others' trademarks." } },
  { category: "tools", q: { ko: "어떤 형식으로 내보낼 수 있나요?", en: "Which export formats are supported?" }, a: { ko: "모든 결과는 PDF, Word(.docx), PowerPoint(.pptx), Markdown으로 내려받을 수 있고, 표와 차트도 함께 들어가요. 도구에 따라 더 있어요: 사업계획서의 재무표는 Excel(.xlsx), 실행 일정과 회의 마감은 캘린더(.ics), 로고는 PNG(심볼만 따로도), 홈페이지는 HTML과 소스 ZIP으로 내려받아요.", en: "Every result downloads as PDF, Word (.docx), PowerPoint (.pptx) and Markdown, tables and charts included. Some tools add more: Excel (.xlsx) for the business plan's financials, calendar files (.ics) for schedules and meeting deadlines, PNG for logos (symbol-only too) and HTML plus a source ZIP for homepages." } },
  { category: "sources", q: { ko: "'추정' 배지는 무엇인가요?", en: "What's the \"estimate\" badge?" }, a: { ko: "출처로 확인하지 못한 숫자입니다. 다른 서비스처럼 그럴듯한 숫자를 조용히 보여 주지 않고, 확인되지 않았다는 사실을 표시합니다.", en: "A number we couldn't confirm with a source. Rather than quietly showing plausible figures, we tell you it's unverified." } },
  { category: "sources", q: { ko: "출처는 어디서 오나요?", en: "Where do sources come from?" }, a: { ko: "웹 검색이 필요한 도구는 실행 중 실제 검색을 하고, 찾은 페이지의 제목·도메인·링크를 출처 패널에 보여 줍니다.", en: "Tools that need web evidence search live during the run and list each page's title, domain and link in the Sources panel." } },
  { category: "api", q: { ko: "내 API 키를 등록하면 무엇이 좋나요?", en: "Why add my own API key?" }, a: { ko: "본인 Google AI Studio 키로 실행하면 크레딧이 차감되지 않고, 본인 계정의 한도를 사용합니다.", en: "Runs use your Google AI Studio key — no credits are charged and your own quota applies." } },
  { category: "api", q: { ko: "API 키는 안전하게 보관되나요?", en: "Is my API key stored safely?" }, a: { ko: "서버에서 AES-256-GCM으로 암호화해 저장하고, 화면에는 마지막 4자리만 보여 줍니다. 브라우저로는 절대 다시 전송되지 않습니다.", en: "It's encrypted server-side with AES-256-GCM and only the last 4 characters are ever shown. It's never sent back to the browser." } },
  { category: "account", q: { ko: "내 데이터로 AI를 학습하나요?", en: "Is my data used for training?" }, a: { ko: "AI 해바는 입력과 결과를 학습에 쓰지 않고, 결과 제공과 보관함 저장에만 써요. 다만 도구는 회원님의 API 키로 실행되므로 AI 회사가 데이터를 어떻게 쓰는지는 그 키의 약관을 따라요. Google Gemini의 무료 등급 키는 입력이 Google 제품 개선에 쓰일 수 있고, 결제를 켠 유료 등급 키는 쓰이지 않아요. Claude·OpenAI API 키는 기본적으로 학습에 쓰이지 않아요.", en: "AI Haeba doesn't train on your inputs or results; they're used only to produce results and keep your Library. Tools run on your own API key, though, so what the AI company does with the data follows that key's terms: Google Gemini's free tier may use inputs to improve Google's products, while a key with billing turned on (paid tier) does not. Claude and OpenAI API keys aren't used for training by default." } },
  { category: "account", q: { ko: "보관함 결과를 삭제할 수 있나요?", en: "Can I delete Library results?" }, a: { ko: "네, 보관함 목록이나 각 결과에서 삭제할 수 있어요(만드는 중인 결과는 끝난 뒤에). 결과와 함께 만든 이미지 파일도 지워지고, 복구되지 않아요. 계정 → 계정 삭제에서 모든 데이터를 한 번에 지울 수도 있어요.", en: "Yes, from the Library list or each result (once it has finished). The images it made are deleted with it, and nothing can be recovered. Account → Delete account removes all your data at once." } },
];

// While members bring their own API key (lib/site/access.ts) there are no
// credits or plans to explain: those answers give way to the key ones.
const OWN_KEY_FAQ: Faq[] = [
  {
    category: "api",
    q: { ko: "왜 내 API 키가 필요한가요?", en: "Why do I need my own API key?" },
    a: {
      ko: "해바의 모든 도구는 내 Google AI Studio(Gemini) 키로 실행돼요. AI 사용 요금은 Google이 내 Google 계정으로 직접 청구해요. 키 발급은 5분이면 끝나요.",
      en: "Every Haeba tool runs on your own Google AI Studio (Gemini) key. Google bills any AI usage directly to your Google account. Getting a key takes about 5 minutes.",
    },
  },
  {
    category: "api",
    q: { ko: "AI 사용 요금은 얼마나 나오나요?", en: "How much will the AI usage cost?" },
    a: {
      ko: "Google의 요금과 사용 한도를 따라요. 도구마다 쓰는 양이 다르니, Google AI Studio에서 사용량을 확인하고 Google Cloud에 예산 알림을 걸어 두는 걸 권해요.",
      en: "It follows Google's prices and usage limits. Tools use different amounts, so check your usage in Google AI Studio and set a budget alert in Google Cloud.",
    },
  },
  {
    category: "api",
    q: { ko: "Claude나 ChatGPT 키도 쓸 수 있나요?", en: "Can I use a Claude or ChatGPT key?" },
    a: {
      ko: "Claude 키는 일부 도구에서 쓸 수 있어요. 대부분의 도구와 전략·검토 단계는 Gemini 키에서 동작하니 Gemini 키를 먼저 등록하세요. ChatGPT 키는 지금은 저장만 돼요.",
      en: "A Claude key works on some tools. Most tools, and the strategy and review steps, run on a Gemini key, so add a Gemini key first. A ChatGPT key is only stored for now.",
    },
  },
];

export const FAQ: Faq[] = OWN_KEY_ONLY
  ? [...ALL_FAQ.filter((f) => f.category !== "credits" && f.q.en !== "Why add my own API key?"), ...OWN_KEY_FAQ]
  : ALL_FAQ;

export const FAQ_CATEGORIES: Partial<Record<FaqCategory, Bilingual>> = OWN_KEY_ONLY
  ? Object.fromEntries(Object.entries(ALL_CATEGORIES).filter(([k]) => k !== "credits"))
  : ALL_CATEGORIES;
