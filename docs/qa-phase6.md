# Phase 6 QA — 2026-10-01

Release QA for the redesign (docs/redesign-plan.md §6): every page on
desktop and phone, failure states, a cross-tool journey, accessibility and
performance. All runs used throwaway `@example.com` accounts, deleted
afterwards, against the production Supabase project and live Gemini.

## 1. Page sweep

283 page visits: every public and app route, all 25 tool pages and their
run pages, the 3 hidden modes, 21 pre-redesign URLs, and 3 not-found URLs.
Each was loaded on desktop (1280 px) and phone (390 px), and desktop again
in English. A signed-out pass was added on top.

| Check | Result |
| --- | --- |
| Page errors / console errors | 0 |
| Pages wider than the screen | 0 (after the fixes below) |
| Old URLs (`/tools/blog`, `/tools/money`, …, `/run` variants) | all redirect to their successor; `/tools/prompt` → `/tools` |
| Signed out on `/studio`, `/projects`, `/library`, `/onboarding`, `/account`, a run page | → `/auth` |
| Unknown tool / run / project | not-found page, `noindex` (200 status is Next's streamed not-found) |
| Korean left in English mode | only the legal documents (Korean is binding) and the company's registered name/address |

**Bugs found and fixed:**
- **Prefetch loop.** The pages of 캠페인 플래너, 운영 플래너 and 트렌드 레이더
  never finished loading. Their "이어받는 결과" (takes results from) list
  linked to the retired `money` engine, which redirects, and the router
  re-prefetched that link about 940 times in 6 seconds. Tool pages now link
  only to tools in the public catalog.
- **Phone overflow.** The pages were 1.3–2.7× the screen width in four places:
  - the example cards on tool pages;
  - the API key guide;
  - the 사업계획서 (business plan) document view;
  - the three tool pages above.

  All four had the same cause: a grid with only responsive columns, whose
  implicit column grew to the widest unbreakable child. Fixed in place, and
  a base-layer rule in `globals.css` now gives every such grid one shrinkable
  column below its breakpoint (Tailwind's `grid-cols-*` utilities still win).

## 2. Failure states (live API)

21 checks, all passing:

- **Input validation**
  - A required field that is missing or blank → 400 with a message naming
    the field. Blank strings used to pass; the message used to be zod's
    English text.
  - An unknown tool → 404.
- **Not enough credits**
  - A run → 402 "크레딧이 부족합니다", and the balance is untouched.
  - Redo one part → also 402. It costs 9 credits for a 35-credit tool, so
    it was tested with a balance of 3.
- **Cancel mid-run** → status `cancelled`, and the held credits are fully
  refunded.
- **Delete while running** → 409 "진행 중인 작업은 먼저 취소해 주세요".
- **A second account** gets 404 when it tries any of these on account A's
  data. A's data was unchanged afterwards.
  - read events;
  - rename, delete or redo a run;
  - read, edit, rename or delete a project;
  - run a tool into A's project.
- **Signed-out API calls** → 401.
- **Cross-site POST** → 403.
- **How the states look:**
  - A failed result shows its message and "같은 입력으로 다시" (run again).
  - The dashboard marks runs as 실패 · 환불됨 (failed, refunded) or 취소됨
    (cancelled).

## 3. Cross-tool journey: "AI 클래스랩" (an AI education startup)

One project, eight tools, each seeded the way the app does it: first the
previous result (`seedFromChain`), then project memory filling empty fields.

| Step | From | Status | Time |
| --- | --- | --- | --- |
| 아이디어 레이더 | brief | done | 136 s |
| 시장 리서치 데스크 | idea | done | 103 s |
| 수익 구조 지도 | idea | done | 80 s |
| 오퍼 설계소 | idea | done | 71 s |
| 브랜드 DNA 스튜디오 | offer + memory (brand name) | done | 105 s |
| 비즈니스 문서 스튜디오 | revenue map | done | 301 s |
| 캠페인 플래너 | brand board | done | 232 s |
| 훅 연구소 | brand board | done after fix | 90 s |

- Project memory ended with:
  - company name;
  - product;
  - customer;
  - region;
  - the full price ladder.
- All 8 results render on desktop and phone with no errors.
- All 32 exports are valid files (PDF, DOCX, PPTX, MD), each generated in
  under 5 s.

**Hand-off gaps found and fixed**, by checking every hand-off the product
offers against real results:
- 브랜드 DNA → 훅 연구소 left the required "topic" empty. It now comes from
  the brand's promise and first key message.
- 사업계획서 → 피치 비주얼 디렉터 and → 제안서 포지, and 시장 리서치 →
  경쟁사 렌즈 and → 페르소나 지도, had no seed at all. All four now carry
  the result in.
- 트렌드 레이더 → 사업계획서 now seeds the item.
- **Dashboard "carry this result into"** used the catalog's `next` list, 15
  of whose pairs carry nothing. It now offers the same hand-offs as result
  pages (`chainTargets`); 46 of 46 are seeded.

## 4. Accessibility (axe-core, WCAG 2.1 A/AA + best practices)

- **Coverage:** 16 signed-in pages in light and dark mode, plus 4 pages
  signed out.
- **Before:** colour contrast, missing chart text alternatives, and heading
  order.
- **After:** 0 violations.

Fixes:
- Accent text in dark mode uses #fb923c (≈8:1). The deep accent stays for
  fills behind white text.
- The flow tab's faded white text, the student badge in dark mode, and the
  API guide's warning heading.
- Every chart SVG has a `<title>`, from `describeChart`: its kind and what
  it compares.
- Result pages have a visually hidden "결과" h2, so tool sections (h3) sit
  under it.

## 5. Performance (local production build, unthrottled)

| Page | TTFB | LCP | JS transferred | All transferred |
| --- | --- | --- | --- | --- |
| `/` | 30 ms | 0.68 s | 426 KB | 973 KB |
| `/pricing` | 18 ms | 0.32 s | 379 KB | 846 KB |
| `/auth` | 11 ms | 0.21 s | 474 KB | 937 KB |
| `/tools` | 23 ms | 0.40 s | 377 KB | 1,000 KB |
| `/studio` (signed in) | 0.8–1.0 s | 1.1–1.4 s | 376 KB | 853 KB |
| a result page | 0.68 s | 1.5 s | 468 KB | 1,060 KB |
| a tool run page | 0.70 s | 1.07 s | 755 KB | 1,270 KB |

- Signed-in TTFB is dominated by Supabase round trips from this sandbox.
- The dashboard's project-count query now runs in parallel with the others
  instead of after them.

**Follow-ups (not done here):**
1. **Per-tool content split.** The run page ships every tool's content,
   form experience and English presets (~84 k Korean characters, ~570 KB
   of one chunk, uncompressed). Loading only the open tool's content would
   bring the run page's JS closer to the other pages (~380–470 KB).
2. **Unused assets.** `public/videos/demo.mp4` and its poster are no longer
   referenced and can be deleted.
