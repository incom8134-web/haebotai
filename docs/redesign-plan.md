# Haebot AI — product redesign plan (25 tools, 5 categories)

Status: **Phase 1 (audit + plan) — for review.** Nothing in the product changes with this document.

Decisions already taken with the product owner:

1. The working engines of today's 18 tools are **folded into** the new 25 (nothing that works is thrown away); tools with no place in the new set are retired.
2. Tool names are **Korean first with an English sub-name** (e.g. 아이디어 레이더 · Idea Radar).
3. Delivery in **phased PRs**, each one merged and usable on its own.
4. **New tool IDs and URLs**; every old URL redirects to its successor and existing history keeps working.

---

## 1. Why this redesign — what is actually copied today

The product idea (a set of specialised AI tools for real business work) was taken from Hyeoksin AI on purpose. The implementation went much further than the idea. Checked against Hyeoksin AI's public app bundle:

| Area | Hyeoksin AI | Haebot AI today |
| --- | --- | --- |
| Tool IDs / URLs | `/tools/blog`, `/tools/sangsepage`, `/tools/brand-model`, `/tools/business-plan`, `/tools/calendar`, `/tools/grant`, `/tools/homepage`, `/tools/image`, `/tools/keyword`, `/tools/logo`, `/tools/money`, `/tools/place`, `/tools/prompt`, `/tools/proposal`, `/tools/trend` | the **same 15 IDs** (+ strategy, copy, presentation) |
| Category names | 아이디어·수익화 · 홍보·콘텐츠 · 디자인·브랜딩 · 판매·웹 제작 · 문서·사업 운영 | **identical, word for word** |
| Tool naming | "혁신 ___ AI" for every tool | "해봇 ___" for every tool |
| Tool set | blog, detail page, image, logo, brand model, trend, 90-day calendar, prompt, monetization finder, place, keyword, proposal, business plan, grant matching… | the same set |
| Page pattern | title → description → form → generate → answer | the same pattern, with 3 layout variants |

Everything in that table changes in this redesign: IDs, category names, tool names, the tool set, and the per-tool interaction.

### What Hyeoksin AI does well (the principles we keep, in our own way)

- Every tool promises **one concrete deliverable** in one line ("판매용 상세페이지 기획·카피를 10분 내 초안으로").
- **Personas** as entry points (1인 창업가, 마케터, 소상공인, 대표…), each pointed at a few tools.
- **Low-friction start**: Google sign-up, credits explained before running ("실행 전에 예상 사용량을 확인").
- Lots of **tool-specific examples** and "who this is for" blocks per tool.

Haebot's answer is different in kind, not a reskin: **a connected business studio** — projects that remember the business, results that flow from one tool into the next, and tool pages whose interaction matches the job (boards, maps, canvases, timelines), not 25 forms.

---

## 2. Audit of the current app (what we keep)

**Strong foundations — kept and reused:**

| Piece | Where | Reused for |
| --- | --- | --- |
| Agent runtime: background jobs, intent → strategy → draft → critique → revise, live steps, handoff past 300 s, cancel/refund | `lib/agents/` | every text tool |
| Report block model (kpis, chart, table, text, callout, bullets, cards, quad, sources) + web renderer + PDF/Word/PPTX/MD exports | `lib/tools/report/`, `lib/tools/export/` | every document-like result and all exports |
| Real website generator (Three.js/GSAP kit, photos, review, Vite export) | `lib/ai/gemini-studio.ts`, `lib/site-kit/` | Web Experience Builder |
| Deck generator with photos + PPTX | presentation pipeline | Pitch Visual Director |
| Logo planning → drawing → typesetting | `lib/ai/gemini.ts` (planLogo/drawLogo) | Logo Direction Lab |
| Product photo / model shoots, ad visuals | `generateImages`, `addToolVisuals` | Ad Creative Factory |
| 860px product-page renderer | `lib/tools/render/sangsepage` | Sales Page Architect |
| Financial model + live-formula xlsx | `lib/tools/financial-model.ts`, `export/xlsx.ts` | Business Document Studio, Revenue Mapper |
| Web research with sources + grounding guard | `searchGrounding`, `lib/tools/grounding.ts` | research tools, SEO, trends |
| Credits, spend guard, consent, rate limits, BYO keys | `lib/credits`, `lib/spend-guard*`, `lib/consent*` | unchanged |

**Problems to fix:**

1. Tool pages share one form-then-answer flow (3 layout variants), so tools feel interchangeable.
2. No **project** concept: every run is isolated; the business profile is one global record.
3. Tool-to-tool chaining exists only for a few hard-coded pairs (`lib/tools/chain.ts`).
4. No partial regeneration (only "run again").
5. Results can't be renamed, duplicated, versioned or moved.
6. Marketing content is thin outside the landing page; login is a single button with little context.
7. Examples reuse the same bakery across tools.

---

## 3. New information architecture

### Categories (new names — none match the reference)

| # | Korean | English | Verb filter |
| --- | --- | --- | --- |
| 1 | 발견·수익 설계 | Discover & Monetize | Build |
| 2 | 브랜드·웹·세일즈 | Brand, Web & Sales | Sell |
| 3 | 캠페인·콘텐츠 | Campaigns & Content | Create |
| 4 | 문서·운영 시스템 | Documents & Operations | Operate |
| 5 | 리서치·인텔리전스 | Research & Intelligence | Research |

### The 25 tools

Legend — *Engine*: **new** = new schema/prompts; **← x** = reuses today's working engine of tool *x*. *UX* = the tool's own interaction model.

**1 · 발견·수익 설계 (Discover & Monetize)**

| ID | Name | UX | Engine |
| --- | --- | --- | --- |
| `idea-radar` | 아이디어 레이더 · Idea Radar | idea cards with fit scores, compare 2–3, favorite, "develop this idea" | new (absorbs `money` diagnosis) |
| `revenue-mapper` | 수익 구조 지도 · Revenue Mapper | revenue-flow diagram (customer → offer → streams), unit-economics panel | new (+ financial model) |
| `offer-architect` | 오퍼 설계소 · Offer Architect | editable offer blocks (core, packages, bonuses, guarantee, CTA) | new |
| `market-gap` | 시장 빈틈 탐지기 · Market Gap Finder | gap map: needs × existing solutions grid, opportunity cards | new (web research) |
| `mvp-blueprint` | MVP 설계도 · MVP Blueprint | step board: core → journey → build stages → launch checklist | new |

**2 · 브랜드·웹·세일즈 (Brand, Web & Sales)**

| ID | Name | UX | Engine |
| --- | --- | --- | --- |
| `brand-dna` | 브랜드 DNA 스튜디오 · Brand DNA Studio | wizard with visual style picks → brand board (palette, type, voice cards) | new (absorbs `strategy` positioning) |
| `logo-lab` | 로고 디렉션 랩 · Logo Direction Lab | concept board: 4 directions, drawn marks, palettes, prompts | ← `logo` |
| `sales-page` | 세일즈 페이지 설계소 · Sales Page Architect | wireframe + copy per section, rendered long image | ← `sangsepage` |
| `web-builder` | 웹 익스피리언스 빌더 · Web Experience Builder | sitemap canvas → live site preview (PC/mobile) → code/Vite export | ← `homepage` |
| `pitch-director` | 피치 비주얼 디렉터 · Pitch Visual Director | slide storyboard/timeline → deck with photos → PPTX | ← `presentation` |

**3 · 캠페인·콘텐츠 (Campaigns & Content)**

| ID | Name | UX | Engine |
| --- | --- | --- | --- |
| `campaign-planner` | 캠페인 플래너 · Campaign Planner | campaign timeline/calendar with phases and channel lanes | ← `strategy` + `calendar` |
| `hook-lab` | 훅 연구소 · Hook Lab | hook cards grouped by family; expand/regenerate a single hook | new |
| `seo-composer` | SEO 원고 컴포저 · SEO Content Composer | editor-first article with SEO checklist sidebar | ← `blog` + `keyword` |
| `content-transformer` | 콘텐츠 변환기 · Content Transformer | source asset in the centre, platform versions branching out | new |
| `ad-factory` | 광고 크리에이티브 팩토리 · Ad Creative Factory | creative board: angle × headline × visual; A/B variants; real images | ← `copy` + `image` + `brand-model` |

**4 · 문서·운영 시스템 (Documents & Operations)**

| ID | Name | UX | Engine |
| --- | --- | --- | --- |
| `doc-studio` | 비즈니스 문서 스튜디오 · Business Document Studio | document canvas with section outline; doc type picker (사업계획서 incl. financial model/xlsx, 사업 소개서, 프로젝트 브리프…) | ← `business-plan` + new doc types |
| `proposal-forge` | 제안서 포지 · Proposal Forge | section builder with reorder; pricing table; export | ← `proposal` |
| `sop-builder` | 업무 매뉴얼 빌더 · SOP Builder | process-flow diagram + quality checklist | new |
| `meeting-action` | 회의→실행 보드 · Meeting-to-Action | action board: decisions, owners, due dates, open questions | new (accepts file/text) |
| `ops-planner` | 운영 플래너 · Operations Planner | kanban + timeline + checklist hybrid | ← `calendar` (planning engine) |

**5 · 리서치·인텔리전스 (Research & Intelligence)** — new category

| ID | Name | UX | Engine |
| --- | --- | --- | --- |
| `market-desk` | 시장 리서치 데스크 · Market Research Desk | research framework: questions, assumptions, evidence blocks labelled by source | new (web research) |
| `competitor-lens` | 경쟁사 렌즈 · Competitor Lens | comparison matrix + positioning map + opportunity cards | new (web research) |
| `persona-mapper` | 고객 페르소나 지도 · Customer Persona Mapper | persona card + customer journey map | new |
| `trend-radar` | 트렌드 레이더 · Trend Radar | radar/quadrant of signals, each labelled live / user-provided / hypothesis | ← `trend` |
| `insight-miner` | 인사이트 마이너 · Insight Miner | theme clusters, sentiment bars, tagged quotes (from pasted text or CSV/document) | new |

**Retired** (no slot in the 25): `place` (네이버 플레이스), `prompt` (프롬프트 생성), `grant` (currently a stub with no data source). Their URLs redirect to the closest new tool (`place` → `seo-composer`, `prompt` → `/tools`, `grant` → `doc-studio`).

**Redirects:** `money`→`idea-radar`, `trend`→`trend-radar`, `strategy`→`campaign-planner`, `calendar`→`ops-planner`, `blog`→`seo-composer`, `keyword`→`seo-composer`, `copy`→`ad-factory`, `image`→`ad-factory`, `brand-model`→`ad-factory`, `logo`→`logo-lab`, `sangsepage`→`sales-page`, `homepage`→`web-builder`, `presentation`→`pitch-director`, `proposal`→`proposal-forge`, `business-plan`→`doc-studio`. Past runs keep their stored `tool_id`; the library renders them with the successor's result view (their data shapes are kept).

---

## 4. Architecture

### 4.1 Tool configuration (extends today's `ToolManifest`)

```ts
{
  id, category, name: { ko, en }, promise: { ko, en },     // one-line deliverable
  icon, accent,                                             // per-tool visual identity
  inputs: ToolField[],                                      // + new kinds: radio, slider, date, currency, file, csv, tone, platform
  steps?: InputStep[],                                      // optional wizard grouping
  outputSchema,                                             // zod, structured JSON only
  view: "idea-cards" | "flow" | "blocks" | "gap-map" | "step-board" | "brand-board" | "concept-board" | "wireframe"
      | "site" | "storyboard" | "timeline" | "hook-cards" | "editor" | "branches" | "creative-board" | "doc-canvas"
      | "process" | "action-board" | "kanban" | "research" | "matrix" | "persona" | "radar" | "themes",
  sections: SectionSpec[],        // which output parts can be regenerated/edited on their own
  examples: Example[],            // realistic input + partial result preview, different industries
  guide: { when, better_input, tips, mistakes },
  next: NextAction[],             // "Continue with…" + field mapping into the next tool
  contextReads / contextWrites,   // project memory keys this tool uses / fills
  playbook, strategyLibrary,      // per-tool AI behaviour (lib/tools/playbooks.ts, lib/agents/library.ts)
  engine: "agent-text" | "site" | "deck" | "logo" | "images" | "sales-page",
}
```

### 4.2 Shared UI infrastructure, per-tool composition

`ToolShell` (header, guide drawer, examples, history, project bar) + `ToolInputPanel` (renders fields/steps) + one **result view per `view` type** + `OutputActions` (copy, edit, regenerate section, export, save to project, continue to…). Tools choose their own composition; the shell never forces one layout.

### 4.3 Projects and project memory (new)

- Migration: `projects` (id, user_id, name, industry, stage, created_at), `project_facts` (project_id, key, value jsonb, source_run_id, updated_at), and `generations.project_id`, `generations.title`, `generations.parent_run_id` (versions).
- Facts are structured keys (company_name, product, target_customer, value_proposition, brand_voice, palette, pricing, positioning, website_url, key_message…). A tool reads the keys it needs as pre-filled, editable inputs and writes the keys it produces after a run.
- The global business profile stays as the default project.

### 4.4 Continue-to-tool and partial regeneration

- `next` actions carry a typed field mapping (replacing the hard-coded pairs in `chain.ts`); the target tool opens pre-filled, with the source result linked.
- `POST /api/runs/[runId]/regenerate` with `{ section, instruction }` (shorter, more premium, 5 more options, translate…). The agent rewrites only that part of the JSON against the same schema; the result is stored as a new version (old one kept, so versions can be compared).

### 4.5 Honesty rules (unchanged, extended)

- Research tools label every claim **live (with source) / user-provided / hypothesis**; no invented statistics.
- No fake analytics, credits, integrations or exports: UI only for what is connected.
- Analytics-ready: a small `track(event, props)` client helper with no provider attached (events listed in the spec §37), so a provider can be connected later without code changes in tools.

---

## 5. Experience outside the tools

- **Homepage**: hero with a real product mock (live UI, not decoration) → the IDEA→BUILD→BRAND→SELL→OPERATE→GROW flow → five categories shown as five different visuals → how it works (5 steps) → before/after transformation example → personas → pricing → FAQ → final CTA.
- **Tools page**: search, category and verb filters (Build / Sell / Create / Operate / Research), favourites, recently used, recommended for your goal, each card states its deliverable.
- **Onboarding**: "What are you building?" (goal) → project basics → recommended tools → first task. At most 3 short screens.
- **Dashboard (Studio)**: greeting, continue working, projects, recent results, recommended, quick create, usage (real credits only).
- **Library**: rename, delete, duplicate, move to project, versions, continue in another tool, export.
- **Login**: value context next to the Google button (what you can build, recent project for returning users, security note). Sign-in stays **Google-only** — email sign-up was closed on purpose to stop credit farming; password/reset screens are not added unless another sign-in method is enabled.

Visual direction: a new Haebot identity — light-first with a dark mode, a warm neutral base with one signature colour, fewer gradients and less glass, per-tool accent and visual metaphor, real UI shown instead of blobs.

---

## 6. Phases (each one a PR, merged and usable)

| Phase | Scope | Ships |
| --- | --- | --- |
| 1 | This audit + plan | this document |
| 2 | Design tokens + component refresh; new categories; 25-tool registry with new IDs, names, redirects; tool discovery page | new names/URLs live, old URLs redirect, all engines still run |
| 3a–3e | Tools, one category per PR (5 tools each): inputs, schemas, playbooks, unique result views, examples, guides | category by category |
| 4 | Projects, project memory, continue-to-tool, library actions, partial regeneration, versions | connected workflow |
| 5 | Homepage, onboarding, dashboard, login, pricing, FAQ/help, marketing copy and visuals | the marketing layer |
| 6 | QA: desktop/mobile, every tool, failure states, cross-tool journey ("AI 교육 스타트업" test from spec §43), performance and accessibility pass | release |

Suggested order inside phase 3: category 1 (discover) → 2 (brand/web/sales, mostly existing engines) → 3 (campaigns) → 4 (docs/ops) → 5 (research).

---

## 7. Open points for the owner

1. **Pricing**: credit cost per new tool (estimates come with each phase-3 PR, same method as today).
2. **Retired tools**: confirm retiring `place`, `prompt`, `grant` (the grant matcher has no live data source today).
3. **Sign-in**: stay Google-only (recommended), or add Kakao/Naver later as a separate item.
