# Benchmark: Wrtn, LilysAI and Simplified — what to borrow

Researched 2026-10-01. Sources:

- Each product's public pages, opened in a headless browser (desktop and
  phone) and read as text.
- Their own feature and pricing pages.
- Press coverage and reviews (listed at the end).

Not tried: anything behind a login. Creating accounts on these services
was out of scope. Wrtn's tool list and login buttons also failed to load
from the sandbox, because their API hosts are blocked by its network
policy. Claims about logged-in features come from their own pages and
from coverage, not from use.

---

## 1. What each one is, in one look

**Wrtn (뤼튼)**

- **Positioning:** Korea's mass-market "AI portal". Free, chat-first, for
  students, job seekers and office workers.
- **First screen:**
  - Logo, then one prompt box: "무엇이든 물어보세요" ("Ask anything").
  - Mode chips above the box: 채팅 (chat), AI 탐지방어 (AI-detection
    evasion), 유튜브 요약 (YouTube summary), 실시간 녹음 (live recording).
  - A "역할" (role) picker inside the box.
  - Three shortcut tiles: GPT-5, 블로그 (blog), 자기소개서 (cover letter).
  - A guest can type before signing up.
- **Navigation:** a slim left icon rail with 홈 (home), 도구 (tools),
  혜택 (benefits), 저장됨 (saved). A hamburger menu holds the history.
- **Tools page:** "도구 목록" (tool list) with filter chips by life goal:
  전체 (all), 즐겨찾기 (favorites), 취업 (jobs), 부업 (side income),
  학업 (study), 업무 (work).
- **혜택 (benefits):** a points balance and a "캐시 스토어" (cash store),
  with missions sorted into "많이벌기 / 쉽게벌기" ("earn a lot" /
  "earn easily"). Using the product earns rewards.
- **3.0 update:** one "AI 서포터" (AI supporter) that merges every
  feature, automatic web search when needed, and automatic model choice
  per task. The character chat was spun off as a separate app, 크랙
  (Crack).
- **Login:** a separate login domain with ID/password, plus 아이디 찾기 /
  비밀번호 찾기 (find ID / reset password). Social login buttons didn't
  render here.

**LilysAI (릴리스AI)**

- **Positioning:** "자료 정리 비서" (a research assistant): summarizes
  YouTube, PDFs, books, blogs, audio and video. 1.2M users and YC-backed.
- **Hero:**
  - A pill: "🇰🇷 한국 1위 요약AI 🌍 120만 사용자" (Korea's #1 summary AI,
    1.2M users).
  - Headline: "자료를 저장하고 구독하면, 인사이트를 떠먹여 드려요" (save and
    subscribe to your sources, and we spoon-feed you the insights).
  - One lime "무료로 시작하기" (start free) button.
  - **A live, interactive result right under it**: a real YouTube
    interview with a timestamped transcript, Korean translation line by
    line, and summary tabs. It is not a mockup.
- **Features:**
  - Summaries in short, default, long or easy versions.
  - 30+ report templates.
  - Mind maps, infographics, flashcards and quizzes.
  - **Source tracing:** every answer links to the exact sentence, or the
    exact video moment, it came from.
  - A chat agent that remembers the user, and collections.
  - Export to PDF, DOCX and Notion.
- **Trust signals:**
  - Customer quotes from executives.
  - The YC name.
  - "Encrypted, never used for model training."
  - A FAQ comparing itself directly with ChatGPT and NotebookLM.

**Simplified**

- **Positioning:** "AI agents for repeat marketing". Riley, an agent,
  takes **one brief** and runs it all the way through:

  > plan → create → **approve** → publish → report → repeat

- **Landing page:**
  - Two calls to action: "Start with Riley" and "Connect Claude".
  - 15M users and G2 4.6 from 5,000+ reviews, shown at the top.
  - "We're not a tool. We're the team." with a "tool vs team" comparison.
  - A five-step "One brief in. A campaign moves." with **real UI frames**
    of the agent at each step: chat, configuration, approval, results
    and a schedule picker.
  - Three buyer paths: businesses, agencies (one workspace per client)
    and automations (MCP, CLI and API).
  - A FAQ about control: "can it publish without me?"
- **Product:**
  - A brand kit (colours, fonts, voice, products, approved examples)
    applied to every output.
  - Approval gates, with outside client review on the Business plan.
  - A social calendar and inbox.
  - **Scheduled agent runs** (daily, weekly or monthly, at a set time).
  - Learning from approvals and rejections.
- **Pricing:**
  - The unit is "**campaigns**": one brief-to-approval cycle, which
    produces 6 posts, 3–5 emails or 3 ad variants.
  - Starter $59, Pro $119, Business $239 a month; $10 per extra
    campaign.
  - A free tier with no card required.

---

## 2. Where Haebot already stands

| Area | Haebot today | Gap versus the three |
| --- | --- | --- |
| First action | Landing → `/tools` catalog, or the studio quick start | No single "type what you need" box that picks the tool (Wrtn) |
| Proof on the landing page | Hero *mock* and before/after | Not a real, interactive result (Lilys) and no real UI frames (Simplified); no numbers or reviews yet |
| Inputs | Form fields, free request, "참고 자료" (reference) uploads up to 30 MB | No **link import** (YouTube, a smartstore product page, a competitor's site, a blog) |
| Sources | Grounded sources listed per result | No **inline citation** that jumps to the exact source sentence (Lilys) |
| Brand | Brand DNA tool; project memory fills forms | No explicit **brand kit** (logo, colours, fonts, voice) applied to every visual output (Simplified) |
| Multi-tool work | Hand-offs between tools ("carry into"), one tool at a time | No "one brief → a package of results" run (Simplified's Riley) |
| Review | Results are private to the owner | No share-for-review link with comments or approval (Simplified, agencies) |
| Repeat work | None | No **scheduled runs** ("매주 월요일 인스타 3개", "three Instagram posts every Monday") |
| Result variants | Partial regenerate, "다른 전략으로" (another strategy) | No one-tap **"더 짧게 / 더 쉽게 / 더 격식 있게"** (shorter / simpler / more formal) |
| Login | Google only | No **Kakao** or **Naver**, which Korean users expect |
| Retention | Credits, a 30-day plan | No missions or rewards loop (Wrtn's 혜택) |
| Tool discovery | Categories, goal-based recommendations | No **favorites**, no job-to-be-done filter chips on the catalog |

---

## 3. What to borrow — prioritized

Effort: S ≈ 1–2 days, M ≈ 3–5 days, L ≈ 1–2 weeks.

### Do first (high impact, fits what we have)

1. **Universal composer: "무엇이든 맡겨 보세요" ("hand us anything")**
   (from Wrtn; M)
   - One prompt box at the top of `/studio` and in the landing hero, with
     mode chips: 사업 아이디어 (business idea), 브랜드·로고 (brand and
     logo), 상세페이지 (sales page), 발표자료 (deck), 마케팅 문구
     (marketing copy), 사업계획서 (business plan).
   - The intent layer we already run (`lib/agents/intent.ts`) picks the
     tool, prefills its form from the text and shows "이 도구로 할게요"
     ("I'll use this tool"), with a one-tap switch.
   - A guest's prompt survives sign-up. Store it in `sessionStorage`,
     replay it after `/auth/callback`.
   - **Why:** removes the "which of 25 tools?" decision. That decision is
     the biggest drop-off between the landing page and the first run.
2. **Kakao login (plus Naver)** (from the Korean market norm; S for
   Kakao, M for Naver)
   - Supabase supports Kakao as a provider directly. Naver needs custom
     OIDC.
   - Keep Google. Show 카카오로 시작하기 (start with Kakao) first on
     phones.
   - Consent recording (`app_metadata.consent`) works unchanged.
3. **Link import as reference material** (from Lilys; M)
   - "링크로 가져오기" (import from a link): a YouTube URL, a smartstore or
     Coupang product page, a competitor's homepage, or a blog post. The
     server fetches it (YouTube via its transcript), cleans it and drops
     it into the existing 참고 자료 bundle.
   - Every tool's reference commands then work on it: "경쟁사 상세페이지를
     참고해 우리 것 새로" (redo ours using a competitor's sales page), and
     "이 영상으로 블로그 글" (a blog post from this video).
   - **Why:** small-business owners start from something they found, not
     a blank form.
4. **A real, interactive result in the landing hero** (from Lilys and
   Simplified; M)
   - Replace the hero mock with one saved example, rendered by the real
     result view: tabs for 전략 (strategy), 결과 (result) and 출처
     (sources), plus a strategy card a visitor can open.
   - Under it, a strip of real UI frames for 요청 → 전략 → 검토 → 완성
     (request → strategy → review → done), taken from the agent timeline.
   - **Why:** shows the v2 "it thinks before it writes" difference that
     no screenshot can.
5. **One-tap result variants** (from Lilys; S)
   - Chips under each text result: 더 짧게 (shorter), 더 쉽게 (simpler),
     더 격식 있게 (more formal), 더 친근하게 (friendlier), 영어로 (in
     English).
   - Built on the existing partial regeneration (`lib/projects/regenerate.ts`)
     with a fixed instruction.
   - Priced like "redo one part".

### Next (bigger, most differentiating)

6. **Brand kit, applied everywhere** (from Simplified; M)
   - A project-level kit: logo file, colours, fonts and voice examples.
     It is filled automatically by Brand DNA and Logo Lab, and editable.
   - Decks, sales pages, homepages and photo shoots read it: colours and
     fonts go into renders and exports, and voice goes into copy prompts.
   - This is v2's "envelope" for brand facts.
7. **"한 번에 패키지" (a whole package at once): one brief → several
   results** (from Simplified's Riley; L)
   - Packages such as "창업 패키지" (startup package: idea → brand DNA →
     logo → sales page → launch copy) or "런칭 캠페인" (launch campaign:
     strategy → hooks → copy → calendar).
   - This is a v2 multi-tool **plan**: the planner chains tools through
     the hand-offs we already have, and pauses for approval between
     steps ("이 방향으로 계속할까요?", "keep going this way?").
   - Price it as a bundle, a little under the sum of its parts.
8. **Share for review** (from Simplified's approvals; M)
   - A private link (`/r/[token]`) that shows a result read-only.
     Reviewers can leave comments and press 승인 (approve) or 수정 요청
     (request changes).
   - The owner sees the status on the result.
   - **Why:** agencies and freelancers hand work to clients.
9. **Inline source citations** (from Lilys; M)
   - Grounded claims carry `[n]` markers. Tapping one shows the source
     snippet and the link.
   - Builds trust for 시장 리서치 (market research), 사업계획서
     (business plan) and 트렌드 (trends).

### Later (growth and retention)

10. **Scheduled runs** (from Simplified; L)
    - "매주 월요일 9시, 이번 주 인스타 콘텐츠 3개" ("Mondays at 9, three
      Instagram posts for the week"), as a cron row per project.
    - It reuses the job runner. Results land in the project, with a
      notification.
    - Needs spend caps per schedule (we have `PLATFORM_DAILY_CREDIT_CAP`).
11. **Missions that earn credits** (from Wrtn's 혜택; S–M)
    - Bounded and honest: "프로필 완성 +20" (complete your profile),
      "첫 프로젝트 +30" (first project), "결과 공유 +10" (share a result),
      "친구 초대 +100" (invite a friend; both sides).
    - Use a ledger table with one claim per mission per user, behind
      the spend guard.
12. **Catalog favorites and job chips** (from Wrtn; S)
    - ☆ on tool cards, with a 즐겨찾기 (favorites) filter.
    - Chips by situation, not by category: 창업 준비 (starting a
      business), 첫 매출 (first sales), 마케팅 (marketing), 투자·지원사업
      (funding and grants), 운영 (operations).
13. **Landing proof and FAQ** (from all three; S)
    - A stats pill once real numbers exist.
    - "ChatGPT와 뭐가 다른가요?" ("How is this different from ChatGPT?")
      in the FAQ.
    - "입력한 자료는 모델 학습에 쓰지 않아요" ("what you enter is never used
      to train models"), but only after checking it holds for every
      provider we call; the paid Gemini API terms say yes.
    - Buyer paths: 사장님 (business owners), 예비 창업자 (founders to
      be), 대행사·프리랜서 (agencies and freelancers).
14. **Left icon rail in the app shell** (from Wrtn; S)
    - Rail items: 홈 (home), 도구 (tools), 프로젝트 (projects), 보관함
      (library), 혜택 (benefits).
    - Frees the top bar on desktop. On phones, a bottom tab bar instead.

### Don't copy

- **"AI 탐지방어" (AI-detection evasion):** it helps users pass off AI
  text as human-written (cover letters, school work). That is a trust
  and policy risk, and against our safety direction.
- **ID/password login:** Wrtn's separate login domain with ID/password
  adds account-recovery burden. Social plus email OTP is enough.
- **Unlimited free chat:** Wrtn's model only works because of ad and
  scale economics. We are credit-based, and our quality is in multi-step
  agents.
- **Simplified's dollar pricing and "campaign" unit as-is:** our credits
  already preview their cost. Borrow only the bundle idea (item 7).

---

## 4. Suggested order

| Sprint | Items | Outcome |
| --- | --- | --- |
| 1 | 2 Kakao login, 5 result variants, 12 favorites and job chips, 13 FAQ and proof | Easier sign-up, quick wins |
| 2 | 1 universal composer, 4 live hero result | "Type what you need" from the landing page to the first result |
| 3 | 3 link import, 9 inline citations | Start from what you found, trust what you get |
| 4 | 6 brand kit, then v2 phase 3 (block documents) | Consistent brand across every output |
| 5 | 7 packages, 8 share for review | Multi-tool runs; agency workflow |
| 6 | 10 schedules, 11 missions, 14 icon rail | Retention loop |

---

## Sources

- [wrtn.ai](https://wrtn.ai/), [wrtn.ai/tools](https://wrtn.ai/tools) and
  [wrtn.ai/reward](https://wrtn.ai/reward) (rendered 2026-10-01);
  [login.wrtn.ai](https://login.wrtn.ai/)
- [뤼튼 3.0 update](https://2025-update.wrtn.ai/);
  [ZDNet: 크랙 spin-off](https://zdnet.co.kr/view/?no=20250324140257);
  [뤼튼 AI 검색 무료 무제한](https://wrtn.io/news/%EB%A4%BC%ED%8A%BC-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8-%EB%AC%B4%EB%A3%8C-%EB%AC%B4%EC%A0%9C%ED%95%9C-ai-%EA%B2%80%EC%83%89-%EC%84%9C%EB%B9%84/);
  [AI매터스 profile](https://aimatters.co.kr/ai-tool/ai-tool-db/10782/)
- [lilys.ai/ko](https://lilys.ai/ko) (rendered) and [lilys.ai](https://lilys.ai/);
  [릴리스 블로그 작성 기능](https://lilys.ai/ko/notes/youtube-summary-ai/youtube-link-summary-blog-post-rilis-ai)
- [simplified.com](https://simplified.com/) (rendered) and
  [simplified.com/pricing](https://simplified.com/pricing);
  [GPTZero review](https://gptzero.me/news/simplified-ai-review/);
  [Tooliverse review](https://tooliverse.ai/tools/simplified)
