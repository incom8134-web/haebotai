# 해봇 AI — TOOL SUITE SPEC
### Addendum to BUILD_SPEC.md — paste both into Claude Code

---

## PART 1 — WHAT 혁신AI ACTUALLY IS (verified, not assumed)

Pulled live from their public catalog API on 2026-09-14.

**39 tools across 6 categories:**

| Category | Count |
|---|---|
| 💡 아이디어·수익화 | 5 |
| 📣 홍보·콘텐츠 | 13 |
| 🎨 디자인·브랜딩 | 7 |
| 🛒 판매·웹 제작 | 2 |
| 📄 문서·사업 운영 | 7 |
| ⚖️ 세무·노무 | 4 |

Your 5 chosen categories map exactly onto their first five. You correctly skipped 세무·노무 — that's regulated advice and a liability surface we should not touch in v1.

### Two corrections to your tool list

1. **`/tools/brand-model/`** — their catalog has a stale link: that worker URL is attached to an entry titled "30초 만에 투자자의 마음을 훔치는 엘리베이터 피치" (a prompt template). The real tool in the 디자인·브랜딩 category is **혁신 브랜드 모델 AI** — "브랜드의 가치를 높이는 맞춤형 모델을 생성합니다" — i.e. AI-generated human models for product photography. Spec'd below as that.

2. **`/tools/grant/`** — **혁신 지원사업 매칭 AI**: "내 사업 정보를 입력하면 지원 가능한 정부지원사업 후보와 준비 서류 체크리스트를 찾아 드립니다." It has **no external link** — it's one of only four platform-native tools (`platformPaidToolIds: ["2","trend","calendar","grant"]`). Everything else is an external app.

### What I could NOT see, and why

Every tool app sits behind SSO — hitting the worker URLs unauthenticated 302-redirects back to the login route. So I have their **stated function**, not their internal prompts or form fields. That's the correct boundary anyway: we are building functionally equivalent tools with our own prompts and our own interface. We do not copy their prompt text, their UI, or their output templates.

---

## PART 2 — THE THREE STRUCTURAL WEAKNESSES WE EXPLOIT

This is where "better UI/UX" actually comes from. Not prettier buttons — a better system.

### ① Their 39 tools are 39 separate applications

Verified from the catalog: tools are deployed across `*.fragrant-flower-7056.workers.dev` (Cloudflare Workers), `*.vercel.app`, and `lab-droid.github.io`, stitched to the hub only by an SSO handoff and a shared credit ledger.

Consequences, all confirmed by your own team's hands-on research:
- **Inconsistent UX** — every tool has its own layout, its own conventions, its own quality bar
- **Reliability failures** — your researchers hit the same generic timeout in three unrelated tools (at 1%, 8%, 16% progress). That's not three bugs, it's every tool inheriting the same edge-runtime execution ceiling on long multimodal calls
- **No shared state** — nothing one tool learns is available to another

> **해봇 AI answer:** ONE application. A declarative **tool registry** — each tool is a manifest, not a deployment. One runner engine, one UI shell, one streaming/retry implementation, one error surface. Adding a tool means adding a config file, not shipping an app.

### ② Their tools don't chain

Your own research documented it: 캘린더 AI cannot run unless the user manually exports `.md` files from 수익화 발굴 AI and 트렌드 분석 AI and re-uploads them. Every tool also re-asks for the same business context.

> **해봇 AI answer:** A **Business Profile** every tool reads automatically, plus typed **output→input chaining**. Run 수익화 발굴, and 캘린더 offers "이 결과로 이어서 만들기" with the data already loaded. The user never re-types their industry, never exports a file to feed the next step.

### ③ Their numbers are unsourced

Your research flagged this precisely: 트렌드 분석 AI presents very specific-looking figures that come from pretrained inference, not live data. A confident number with no source is worse than no number.

> **해봇 AI answer:** Extend the **grounding guard** from BUILD_SPEC §6.3 across every tool. Any factual claim, statistic, market size, or price carries a source URL, or is rendered with a visible `추정` badge. No exceptions, no silent confidence.

---

## PART 3 — TOOL ARCHITECTURE

### 3.1 Tool manifest

Every tool is a TypeScript object in `lib/tools/registry/`. The UI, validation, credit cost, and runner behavior are all derived from it. No per-tool bespoke code except the renderer for unusual output types.

```ts
export interface ToolManifest {
  id: string;                       // 'blog', 'logo'
  category: CategoryId;             // 'ideas' | 'content' | 'design' | 'sales' | 'docs'
  name_ko: string;
  name_en: string;
  summary: string;                  // one line, shown on card
  icon: LucideIcon;

  inputs: ToolField[];              // renders the form
  usesProfile: (keyof BusinessProfile)[];  // auto-filled, shown as removable chips
  acceptsChainFrom?: string[];      // tool ids whose output can seed this

  outputSchema: z.ZodSchema;        // validated model output
  outputRenderer: 'document' | 'cards' | 'images' | 'calendar' | 'table' | 'code';

  grounding: {
    requireSources: boolean;        // every factual claim needs a source URL
    webSearch: boolean;             // tool may search before generating
    estimateBadge: boolean;         // unsourced numbers render with 추정 badge
  };

  model: 'gemini-2.5-flash' | 'gemini-2.5-flash-image';
  estimatedCredits: number;
  estimatedSeconds: number;
}

type ToolField =
  | { kind: 'text'; id: string; label: string; placeholder?: string; max?: number; required?: boolean }
  | { kind: 'textarea'; id: string; label: string; rows?: number; max?: number }
  | { kind: 'select'; id: string; label: string; options: {value: string; label: string; hint?: string}[] }
  | { kind: 'multiselect'; id: string; label: string; options: {...}[]; max?: number }
  | { kind: 'number'; id: string; label: string; min?: number; max?: number; unit?: string }
  | { kind: 'image'; id: string; label: string; maxFiles?: number; maxMB?: number }
  | { kind: 'url'; id: string; label: string }
  | { kind: 'chips'; id: string; label: string; max?: number };
```

### 3.2 The runner — `lib/tools/runner.ts`

One code path for every tool:

```
validate input (zod, from manifest)
  → check credit balance, reserve
  → merge Business Profile fields
  → [if grounding.webSearch] search, collect sources
  → build prompt from tool template + inputs + profile + sources
  → call model with responseSchema, STREAMING
  → validate output against outputSchema
  → run grounding guard (BUILD_SPEC §6.3, extended)
  → persist run + outputs + sources + token cost
  → settle credits against ACTUAL tokens used
```

**Non-negotiables:**
- **Stream everything.** Their failure mode is a silent stall at 8%. Ours shows tokens arriving. A user watching text appear will wait; a user watching a frozen bar will leave.
- **Resumable.** Persist the run row before calling the model. If the connection drops, the result is still there in history.
- **Cancellable.** A visible cancel after 5s that refunds the reservation.
- **Honest failure.** Never a generic "오류가 발생했습니다". Say what failed and what the user can do.

### 3.3 Business Profile — the shared context

Set once, read by every tool. This single object is why 해봇 AI feels like a product and theirs feels like a folder of links.

```ts
interface BusinessProfile {
  brand_name: string;
  industry: string;              // 업종
  business_stage: 'idea'|'pre_launch'|'under_1y'|'1_3y'|'over_3y';
  target_customer: string;
  tone: string[];                // max 3
  voice_examples: string[];      // 2-3 real lines the user wrote
  brand_colors: string[];
  logo_asset_id?: string;
  region?: string;               // optional, for place/grant tools
  weekly_hours?: number;         // for calendar/money tools
  budget_band?: string;
}
```

Every tool form shows which profile fields it's using, as removable chips. The user can override per-run without editing their profile. **No tool ever re-asks for something the profile already knows.**

### 3.4 Credits — visible, honest

혁신AI shows API cost on exactly one tool (블로그, ~166.5원/건) and hides the credit markup everywhere else. We show real cost on every run.

- Pre-run: `예상 12 크레딧 · 약 25초`
- Post-run: `실제 9 크레딧 사용 · ₩38` in mono, in the result header
- Settlement is against **actual** tokens, not the estimate. If it costs less, the user is charged less.

---

## PART 4 — THE 15 TOOLS

Notation: **IN** = inputs · **OUT** = output schema · **GUARD** = grounding rule · **CHAIN** = data flow.

---

### 💡 카테고리 1 — 아이디어·수익화

#### 1.1 `money` — 해봇 수익화 발굴
Finds monetization directions that fit the user's actual situation, not a generic list.

- **IN** 보유 기술·경력 (textarea) · 주당 가용시간 (number, hrs) · 초기 자본 (select: 0 / ~100만 / ~500만 / 500만+) · 리스크 성향 (select) · 관심 분야 (chips, max 5) · 피하고 싶은 일 (text)
- **OUT** `{ models: [{ rank, name, fit_reason, fit_cites: string[], first_30_days: Step[], startup_cost_krw, breakeven_months, difficulty: 1-5, skill_gaps: string[] }] }` — exactly 3
- **GUARD** every `fit_reason` must cite input field ids in `fit_cites`. A model that can't cite why it fits *this user* is rejected and regenerated. No generic "누구나 할 수 있습니다".
- **CHAIN** → `trend`, `calendar`
- ~15 credits

#### 1.2 `trend` — 해봇 트렌드 분석
Scores candidate ideas against live evidence. **This is the tool where we most visibly beat them.**

- **IN** 후보 아이디어 (chips, 1-3) · 타겟 시장 (text) · 예산 범위 (select) · 진입 시점 (select)
- **OUT** `{ ideas: [{ name, scores: { market_size, growth, entry_barrier, competition, margin, execution_difficulty, capital_need, personal_fit }, composite, price_gap: { band, evidence }, differentiation_angles: string[3], sources: Source[] }] }`
- **GUARD** `webSearch: true`, `requireSources: true`. **Every numeric claim carries a source URL or renders with a 추정 badge.** The result page has a 출처 panel listing every source used. This is the single clearest quality gap against their version.
- **CHAIN** ← `money` · → `calendar`, `business-plan`
- ~40 credits (search + reasoning)

#### 1.3 `calendar` — 해봇 90일 실행 캘린더
- **IN** 실행할 모델 (chained, or text) · 시작일 (date) · 주당 가용시간 (profile) · 주요 마일스톤 (chips, optional)
- **OUT** `{ weeks: [{ week_no, milestone, tasks: [{ day, title, est_minutes, done_criteria, depends_on }] }] }` — 13 weeks
- **GUARD** total weekly minutes must not exceed the user's stated capacity. Overcommitted plans are rejected and rebalanced — a 90-day plan that assumes 40 hrs/week from someone with 10 is worthless.
- **CHAIN** ← `money`, `trend` **automatically. No file upload.** This is their documented failure; ours must be one click.
- **EXPORT** `.ics` · `.csv` · Notion-ready markdown
- ~25 credits

#### 1.4 `prompt` — 해봇 프롬프트 빌더
- **IN** 반복 업무 설명 (textarea) · 대상 모델 (select) · 출력 형식 (select) · 제약조건 (chips) · 예시 입력 (textarea, optional)
- **OUT** `{ system_prompt, user_template, variables: [{name, description, example}], sample_runs: [{input, expected_output}] (×3), failure_modes: [{mode, mitigation}] }`
- **DIFFERENTIATOR** a **"테스트 실행"** button that runs the generated prompt in-app against a sample input. Their version can only hand you text to paste elsewhere — your research flagged this as workflow fragmentation. Fix it.
- ~10 credits

---

### 📣 카테고리 2 — 홍보·콘텐츠

#### 2.1 `blog` — 해봇 블로그 원고
- **IN** 주제/키워드 (text) · 타겟 독자 (text) · 플랫폼 (select: 네이버 / 티스토리 / 브런치 / 워드프레스) · 글자수 (select: 1000/1500/2500/4000) · 톤 (profile) · 포함할 사실 (textarea, optional)
- **OUT** `{ titles: string[5], meta_description, body_markdown, h2_outline: string[], image_slots: [{ after_section, purpose, prompt }], hashtags: string[], char_count, sources: Source[] }`
- **GUARD** every statistic, date, price, or named fact in the body carries a source or a 추정 badge. Platform-specific formatting rules per target (네이버 favors shorter paragraphs and 인용구 blocks).
- **CHAIN** ← `keyword` · → `image` (image_slots feed straight in)
- ~20 credits

#### 2.2 `keyword` — 해봇 키워드 전략
- **IN** 주력 키워드 (text) · 업종 (profile) · 지역 (text, optional) · 플랫폼 (multiselect: 네이버 / 구글 / 유튜브 / 인스타)
- **OUT** `{ tiers: { mega: Keyword[], mid: Keyword[], micro: Keyword[] }, combinations: string[20+], content_gaps: [{ gap, suggested_topic }] }` where `Keyword = { term, volume_band, competition, best_use, data_source: 'measured'|'estimated' }`
- **GUARD** **v1 model estimates MUST render with a 추정 badge and `data_source: 'estimated'`.** Do not present inferred search volumes as measured data.
- **v1.1** integrate 네이버 검색광고 API for real volumes; flip `data_source` to `'measured'` where available. Build the field now so the upgrade is a data swap, not a refactor.
- **CHAIN** → `blog`, `place`, `sangsepage`
- ~12 credits

#### 2.3 `place` — 해봇 플레이스 최적화
- **IN** 상호 (text) · 업종 (profile) · 지역 (text) · 현재 플레이스 정보 (textarea or URL) · 경쟁업체 (chips, 2-3)
- **OUT** `{ business_name_suggestions: string[3], description_optimized, primary_keywords: string[], menu_recommendations: [], photo_checklist: [{ shot, why, priority }], review_response_templates: [], weekly_ops_checklist: [] }`
- **⚠️ HARD GUARD — implement as a refusal rule in the system prompt:** this tool **must not** generate fake reviews, write reviews in a customer's voice, or advise on review manipulation. Their platform has a 리뷰 AI that generates "자연스러운 고품질 리뷰" — under 표시·광고의 공정화에 관한 법률 that is a real liability, and their own tool carries warning text about it. **We do not build that tool and we do not let this one drift into it.** Review *response* templates (replying as the business) are fine and included.
- ~15 credits

---

### 🎨 카테고리 3 — 디자인·브랜딩

#### 3.1 `image` — 해봇 이미지 생성
- **IN** 설명 (text, 1 line) · 용도 프리셋 (select: 제품 스튜디오컷 / 패키징 / 3D 렌더 / 랜딩 UI / 광고 배너 / 배경) · 비율 (select: 1:1 / 4:5 / 16:9 / 9:16) · 브랜드 컬러 (profile) · 참조 이미지 (image, optional)
- **OUT** `{ images: [{ asset_id, url, seed }] ×4, refined_prompt, negative_prompt }`
- Model: Gemini image (~$0.039/img). Show the refined prompt — users learn from it and it builds trust.
- ~35 credits (4 images)

#### 3.2 `logo` — 해봇 로고
- **IN** 브랜드명 (text) · 업종 (profile) · 연상 키워드 (chips, 3) · 스타일 (select: 워드마크 / 심볼+워드마크 / 이니셜 / 엠블럼) · 컬러 성향 (select)
- **OUT** `{ concepts: [{ svg, concept_rationale, color_spec: {hex[]}, type_spec: {family, weight, tracking}, usage_notes }] ×6, mockups: [asset_id] }`
- **DIFFERENTIATOR — output real SVG.** Generate as code (not a raster model): the model returns SVG markup, validated and sanitized server-side. A raster logo is nearly useless for actual brand work — this is a concrete, defensible advantage.
- **GUARD** reject any output resembling an existing well-known trademark; no real brand names, wordmarks, or mascots.
- ~30 credits

#### 3.3 `brand-model` — 해봇 브랜드 모델
Generates a consistent human model to present the user's product.

- **IN** 제품 사진 (image, required) · 모델 성별·연령대 (select) · 분위기 (select) · 배경/상황 (select) · 비율 (select)
- **OUT** `{ shots: [{ asset_id, url }] ×4, model_seed (for consistency across runs), disclosure: "AI 생성 이미지" }`
- **⚠️ HARD GUARDS:**
  - Refuse to generate a likeness of any real, identifiable person — named or uploaded
  - Refuse uploads that are primarily a real person's face
  - Every export carries an **AI 생성 이미지** disclosure in metadata and an optional visible badge
  - `model_seed` enables a consistent "brand face" across shoots, which is the actual product value
- ~45 credits

---

### 🛒 카테고리 4 — 판매·웹 제작

#### 4.1 `sangsepage` — 해봇 상세페이지
- **IN** 제품명 (text) · 핵심 특징 (chips, 3-5) · 가격 (number) · 타겟 고객 (text) · 제품 사진 (image, 1-5) · 경쟁 제품 (text, optional)
- **OUT** `{ pain_points: string[], usps: string[3], sections: [{ order, type, headline, body, image_instruction }] ×8-10, rendered_images: [asset_id], faq: [{q,a}] ×5, shipping_template }`
- Rendered at **860px 네이버 스마트스토어 규격** through the same satori pipeline as BUILD_SPEC §9. Fonts embedded, Korean line-breaking correct.
- **GUARD** no efficacy, medical, or superlative claims not present in the user's input. This is 표시광고법 territory — the guard matters commercially, not just ethically.
- **CHAIN** ← `keyword`, `image`
- ~50 credits

#### 4.2 `homepage` — 해봇 홈페이지
**Their version only outputs a prompt to paste into Google AI Studio. Ours outputs a working site.** This is the biggest capability gap in the whole catalog — take it.

- **IN** 업종 (profile) · 사이트 목적 (select: 소개 / 예약 / 판매 / 포트폴리오 / 랜딩) · 필요 섹션 (multiselect) · 브랜드 프로필 (auto) · 참고 사이트 (url, optional)
- **OUT** `{ html (single-file, responsive, inlined CSS/JS), sections: string[], preview_url, zip_asset_id }`
- **DELIVERY** live preview in an iframe → ZIP download → (v1.1) one-click publish to `{slug}.haebot.app`
- **GUARD** no fabricated business facts — every phone number, address, price, or testimonial slot renders as a visibly bracketed `[입력 필요]` placeholder, never invented.
- ~40 credits

---

### 📄 카테고리 5 — 문서·사업 운영

#### 5.1 `proposal` — 해봇 제안서
- **IN** 제안 대상 (text) · 제안 내용 (textarea) · 예산 범위 (text) · 기간 (text) · 차별점 (chips) · 첨부 자료 (image/pdf, optional)
- **OUT** `{ cover, executive_summary, problem, solution, execution_plan: [], timeline: [{phase, weeks, deliverable}], pricing_table: [], company_intro }`
- **EXPORT** `.docx` + `.pdf` (use the docx skill pattern — real styles, TOC, page numbers, not HTML-to-PDF)
- ~30 credits

#### 5.2 `business-plan` — 해봇 사업계획서
- **IN** 아이템 (textarea) · 목적 (select: 투자유치 / 정부지원 / 내부검토 / 대출) · 시장 (text) · 팀 구성 (textarea) · 재무 가정 (structured: 단가, 월 판매량 목표, 고정비, 변동비율)
- **OUT** `{ sections: {...}, market_analysis: { size, growth, sources: Source[] }, competitor_matrix: [][], financials: { pl_3yr: [][], assumptions: [], breakeven_month } }`
- **EXPORT** `.docx` (본문) + `.xlsx` (재무 시트with live formulas, via the xlsx skill pattern)
- **GUARD** `requireSources: true` on every market figure. A 사업계획서 submitted to an investor or a government reviewer with invented market data is actively harmful — this guard is the tool's core value.
- **CHAIN** ← `trend` (market analysis + sources carry over)
- ~60 credits

#### 5.3 `grant` — 해봇 지원사업 매칭
- **IN** 업종 (profile) · 업력 (select) · 지역 (select) · 연매출 규모 (select) · 종업원수 (number) · 기술분야 (chips) · 희망 지원 유형 (multiselect: R&D / 창업 / 수출 / 고용 / 시설)
- **OUT** `{ matches: [{ program_name, agency, deadline, funding_scale, eligibility: [{ requirement, user_meets: boolean, note }], document_checklist: [], difficulty: 1-5, source_url }], unmatched_reasons: [] }`
- **⚠️ THIS TOOL IS ONLY HONEST WITH REAL DATA.** A hallucinated 공고 name and deadline causes genuine damage — missed real deadlines, wasted preparation.
  - **Required:** integrate live listings from **K-Startup** and **기업마당(bizinfo)** open APIs. Every match carries a real `source_url`.
  - **If the data source is unavailable:** the tool returns an explicit "현재 공고 데이터를 불러올 수 없습니다" state. **It must never fall back to model-generated program names.** Write this as an integration test.
- **v1 scope note:** if API access isn't secured before launch, ship this tool as "준비 중" rather than shipping it ungrounded.
- ~35 credits

---

## PART 5 — UX SHELL

Design tokens, motion, and the ban list all come from BUILD_SPEC §4 (dark, precise, Linear/Vercel-grade). What's specific to the tool suite:

### 5.1 Navigation

```
┌─ Sidebar (240px) ────────┬─ Main ─────────────────────────────┐
│ 해봇 AI                    │                                    │
│ [Business Profile chip]  │   Tool form (from manifest)        │
│                          │   ─────────────────────            │
│ 💡 아이디어·수익화   4     │   Result (streaming)               │
│ 📣 홍보·콘텐츠      3     │   ─────────────────────            │
│ 🎨 디자인·브랜딩    3     │   출처 panel · 크레딧 · 내보내기      │
│ 🛒 판매·웹 제작     2     │                                    │
│ 📄 문서·사업 운영   3     │                                    │
│                          │                                    │
│ 최근 실행                 │                                    │
│ 보관함                    │                                    │
└──────────────────────────┴────────────────────────────────────┘
```

- **⌘K** jumps to any tool by name or by what it does ("로고" and "브랜드 심볼" both find `logo`)
- Category counts are live from the registry
- The Business Profile chip is always visible and one click from editable — because it's the context every tool uses, the user should always know it's there

### 5.2 Tool page anatomy

1. **Header** — tool name, one-line summary, `예상 12 크레딧 · 약 25초` in mono
2. **Profile chips** — "업종: 카페 · 톤: 담백한" as removable chips, so the user sees exactly what context is being applied
3. **Form** — rendered from the manifest. Never more than 6 visible fields; the rest behind "세부 설정".
4. **Run** — primary button with `⌘↵`
5. **Result** — streams in. Skeleton only for the first 800ms, then real tokens.
6. **Result footer** — `실제 9 크레딧 · ₩38` · 출처 (n) · 내보내기 · 다시 생성 · **이어서 만들기 →** (chain targets from the manifest)

### 5.3 The 출처 panel — the trust surface

Collapsible panel under every result with `requireSources`. Lists each source with title, domain, and the claim it supports. Any unsourced number in the body renders with a small `추정` badge that links here.

This panel is the visible form of the whole positioning. Build it first, not last.

### 5.4 Empty, loading, error

- **Empty:** what this tool produces + one example output, never a grey box
- **Loading:** streaming text, elapsed counter in mono, cancel after 5s
- **Error:** what failed, what to try, credits auto-refunded and said so. Never "오류가 발생했습니다".

---

## PART 6 — BUILD ORDER

Insert after BUILD_SPEC Phase P5 (generation + guard), which the runner depends on.

| Phase | Work | Accept when |
|---|---|---|
| **T0** | Tool registry types, manifest loader, dynamic form renderer, runner skeleton | A dummy manifest renders a working form and returns a mock result |
| **T1** | Business Profile CRUD + auto-fill + chips | Profile set once appears in every tool form; per-run overrides don't mutate the profile |
| **T2** | Runner: streaming, cancel, resume, credit reserve/settle, run history | Kill the network mid-run — the result is still in history; credits settle on actual tokens |
| **T3** | Grounding guard extended: source collection, 추정 badges, 출처 panel | A tool with `requireSources` cannot emit an unsourced statistic — verify with an adversarial test |
| **T4** | Category 1 (4 tools) + chaining engine | `money` → `calendar` carries data with zero file handling |
| **T5** | Category 2 (3 tools) | `place` refuses a fake-review request — write that test |
| **T6** | Category 3 (3 tools) — image pipeline, SVG logo validation, model guards | `logo` returns valid, sanitized, renderable SVG; `brand-model` refuses a real-person likeness |
| **T7** | Category 4 (2 tools) — satori 860px renderer, homepage generator + preview + ZIP | Generated homepage passes Lighthouse ≥85 and contains zero invented business facts |
| **T8** | Category 5 (3 tools) — docx/xlsx export, grant API integration | `grant` returns real 공고 with live source URLs, **or** an explicit unavailable state — never invented listings |
| **T9** | ⌘K palette, library, polish pass across all 15 | Every tool: streaming works, cost shown, sources shown, export works, chain works |

---

## PART 7 — BOUNDARIES

Keep these in the repo. They are product decisions, not legal boilerplate.

1. **Functional equivalence, original implementation.** Feature ideas aren't protected; their prompts, UI, and output templates are theirs. We write our own. No screenshots into the design process, no copied prompt text.
2. **No fake-review generation.** They ship it; we don't. `place` writes review *responses*, never reviews.
3. **No 세무·노무 in v1.** Their category ⚖️ gives tax and labor-law advice. That's regulated professional advice and an outsized liability for a small team. Excluded deliberately.
4. **No invented regulatory or funding data.** `grant` ships with a real data source or ships as 준비 중.
5. **AI disclosure on generated people.** `brand-model` output always carries it.
6. **Sources or badges, everywhere.** The rule that makes the product trustworthy only works if it has no exceptions.

---

## PART 8 — WHY THIS WINS

Stated plainly, because it should be defensible in a room:

| | 혁신AI | 해봇 AI |
|---|---|---|
| Architecture | 39 separate apps, SSO-stitched | 1 app, declarative tool registry |
| Consistency | Each tool its own UX | One shell, one interaction model |
| Reliability | Documented stalls at 1% / 8% / 16% | Streaming, resumable, cancellable, refunded |
| Context | Re-enter business info per tool | Business Profile read by all |
| Chaining | Manual `.md` export/upload | Typed, one-click |
| Sourcing | Confident unsourced figures | Source URL or 추정 badge, always |
| Cost | API cost shown on 1 of 39 tools | Real cost on every run |
| Logo output | Raster | SVG |
| Homepage output | A prompt to paste elsewhere | A deployable site |

Nine rows. Eight of them are engineering decisions, not design decisions — which is the point. The interface is better because the system underneath is better.
