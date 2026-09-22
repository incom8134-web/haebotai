---
target: 해봇 AI landing page + app shell/tool-run/library UI
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Users\\incom\\Documents\\Khurshid\\Hyeaokshin AI clone\\groundwork\\app\\page.tsx"
target_fingerprint: "sha256:1cbf0f5a202a734108c251be6e17bd2fe744b986a2b08c0c2e1a5c6b3deccce1"
target_path: "C:\\Users\\incom\\Documents\\Khurshid\\Hyeaokshin AI clone\\groundwork\\app\\page.tsx"
timestamp: 2026-09-16T02-52-21Z
slug: app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Streaming shows raw text in a `<pre>`, not progress; balance and cost estimate live in different components, never shown together |
| 2 | Match System / Real World | 2 | Marketing copy is SMB-native; the result screen hands the same audience raw JSON |
| 3 | User Control and Freedom | 2 | Cancel is hidden for 5s with no stated reason; excluding a profile chip has no undo |
| 4 | Consistency and Standards | 1 | Two visual languages by design — warm/rounded landing vs. flat "instrument" app shell, explicitly acknowledged in code comments |
| 5 | Error Prevention | 1 | No required-field validation before a paid generation fires; no affordability check |
| 6 | Recognition Rather Than Recall | 3 | Business-profile chips auto-populate every tool via `manifest.usesProfile` — a real strength |
| 7 | Flexibility and Efficiency | 2 | ⌘K palette is real; `⌘↵` shortcut hardcoded Mac-only, shown to every OS |
| 8 | Aesthetic and Minimalist Design | 2 | Landing is strong; app/library/tool-run is bland, undercut further by an unconditional raw-JSON dump |
| 9 | Error Recovery | 1 | Failure state is one red sentence with no statement of whether credits were charged or refunded |
| 10 | Help and Documentation | 1 | 출처/추정 (source/estimate) trust mechanic explained on the landing page, never explained where it actually appears |
| **Total** | | **17/40** | **Poor — significant improvements needed** |

## Design Specificity Verdict

**Split verdict, and the split is the finding.** The landing page is genuinely authored for this product — `hero-artifact.tsx` and `benefit-fragment.tsx` render miniature *real* UI (profile chips, category counts, 출처/추정 badges, the exact "예상 40 크레딧 · 약 45초" cost line) as the hero image, not stock icons or generic copy.

But the actual product surface — where money and trust are actually at stake — is generic. `run-result.tsx` renders a finished, paid-for generation as one static badge plus an unconditional `<pre>{JSON.stringify(output, null, 2)}</pre>`. The per-claim sourced/estimated treatment the hero mock sells never ships to the real result screen. The code openly documents this: `app/page.tsx` — *"Scoped to this page only — the app shell and tool pages keep the tighter 'instrument' look for now."* The redesign effort went to the page that costs nothing to view, not the page where the transaction happens.

**Deterministic scan**: The static CLI detector found **zero** anti-patterns across all 18 scanned source files (`app/page.tsx`, `globals.css`, every touched component) — clean at the source-pattern level. But live-DOM inspection of the same rendered landing page found **14 real issues** the static scan structurally cannot see: 4 contrast failures (down to 2.4:1 against a 4.5:1 minimum), 5 instances of card-inside-card nesting in the hero mockup, 3 oversized icon tiles above headings (a recognized generic-SaaS pattern), one skipped heading level (h1 → h3, no h2), and a radial spotlight-glow pattern. Zero static findings vs. 14 live-rendered findings on the identical page is itself a signal: this codebase's tokens read clean in isolation, but composition and computed contrast don't hold up once actually painted.

**Browser evidence**: Navigation and screenshot succeeded at desktop width; the page rendered as intended with no broken layout. Script injection and the live detector overlay both confirmed working. Mobile-width (390px) verification failed in both assessments — a tool/environment limitation (window resize didn't reflow), not a confirmed app defect; mobile behavior here is inferred from Tailwind breakpoint classes in source, not observed.

## Overall Impression

The landing page is real, specific craft — genuinely one of the better AI-SaaS landing pages in terms of "show the product, don't illustrate it." The rest of the shipped product doesn't carry that forward: the same session that built a beautiful hero mock of a sourced, trustworthy result left the *actual* result screen as an unconditional JSON dump. The single biggest opportunity is closing that gap — not because the app screens need more decoration, but because the product's only real differentiator (grounded, sourced content) currently only exists in the marketing screenshot.

## What's Working

1. **`hero-artifact.tsx` / `benefit-fragment.tsx` treat the marketing surface as a product screenshot, not an illustration.** Real component patterns (badges, chips, category counts) staggered in with causal timing so it reads as "this is what happens when you run a tool."
2. **The business-profile-chip reuse pattern is a genuine SaaS insight, not just a marketing claim.** `manifest.usesProfile` means each of the 15 tools pulls only the profile fields it needs, shown as removable chips that override just that run without mutating the saved profile.
3. **The grounding guard is enforced server-side, not just claimed.** `checkGrounding` makes it structurally impossible for a `requireSources: true` tool to return zero sources — the trust mechanic is architecturally real. The gap is that the UI doesn't make that real guarantee visible.

## Priority Issues

**[P0] The grounding/trust mechanic is decorative in the actual result screen**
- Why it matters: this is the entire brand promise. Users pay real credits expecting a sourced, trustworthy answer and get a developer console (`run-result.tsx`'s unconditional `<pre>{JSON.stringify(...)}</pre>`).
- Fix: build real per-field renderers that surface inline source/estimate markers matching the hero mock; move raw JSON behind a collapsed "원본 데이터 보기" disclosure, never shown by default.
- Suggested command: `/impeccable distill` (cut the shipped result to the essential grounded view), then `/impeccable harden`.

**[P0] Two incompatible visual languages across the same product, by design**
- Why it matters: users experience the redesign's confidence-building only until the moment they'd spend money, then land on what looks like an earlier, unfinished product — actively undermines the trust the landing page just built.
- Fix: port the new tokens (radius scale, accent, warm surfaces) from `globals.css` into `app-header.tsx`, `tool-runner.tsx`, `library-list.tsx`, `library-run-detail.tsx`.
- Suggested command: `/impeccable adapt`.

**[P1] The redesigned light-mode text tokens fail WCAG AA contrast in multiple places**
- Why it matters: live-DOM measurement (not a static guess) found `text-fg-muted` at 4.2:1 and `text-fg-subtle` at 2.6:1 and 2.4:1 — all below the 4.5:1 minimum for body text. These are design tokens reused across the entire redesigned surface, so the failure isn't local to one page.
- Fix: darken `--color-fg-muted` / `--color-fg-subtle` in `globals.css` until both clear 4.5:1 on both `--color-bg` and `--color-surface`.
- Suggested command: `/impeccable polish`.

**[P1] Confirmed hydration mismatch on the theme toggle**
- Why it matters: cross-validated independently by both assessments (one read the code, one saw it live in the browser console) — the server renders `aria-label="라이트 모드로 전환"` with a sun icon, the client immediately flips it to `"다크 모드로 전환"` with a moon icon. A real, reproducible production console error, not a design nitpick — it also means the accessible label is wrong on first paint.
- Fix: align the SSR default with `next-themes`' actual resolved theme before first paint (a known, well-documented pattern for this exact mismatch).
- Suggested command: `/impeccable harden`.

**[P1] The hero headline states "39" tools; the real product has 15**
- Why it matters: `lib/i18n/dictionaries.ts`'s "39개의 도구 대신..." headline is contradicted by the benefit card directly beneath it, which sums to 15 (4+3+3+2+3) — matching the real spec. This is a literal factual error on the one page whose entire selling point is "근거 없는 숫자에는 항상 추정 배지가 붙습니다" (unsourced numbers always get flagged). Any visitor who scrolls from hero to benefit cards can catch the product contradicting its own headline within one screen.
- Fix: correct "39" to "15" in both `ko`/`en` dictionary entries, or clarify what 39 refers to if intentional (e.g. competitor tool count).
- Suggested command: `/impeccable clarify`.

*(Also flagged by Assessment A, not in the top 5 above but worth fixing soon: **[P1]** no pre-run cost confirmation shown next to the user's actual balance before a paid generation fires; **[P2]** no client-side required-field validation before `handleRun` posts, so incomplete input only fails after a full round trip.)*

## Persona Red Flags

**Jordan (confused first-timer)**: Lands on a real tool page having only maybe skimmed the 출처/추정 explanation on the marketing page. No tooltip or inline explanation anywhere in `tool-runner.tsx`/`run-result.tsx`. Fills a form with generic placeholders (a `select` field's placeholder is literally "선택" with no example), watches raw streaming text that reads as debug output, and the finished result is a JSON dump. Everything about the moment of truth reads as "something broke," not "here is your sourced answer."

**Sam (accessibility-dependent)**: No `aria-live` anywhere in the streaming/result region — a screen-reader user gets zero announcement when a run starts, progresses, completes, or fails. The `<iframe srcDoc={o.html}>` homepage preview has no `title` attribute (no accessible name). The required-field asterisk carries no `aria-required` or visually-hidden text — its meaning is color/glyph-only.

**Riley (deliberate stress-tester)**: Removes every profile chip, hits Run with required fields empty — nothing stops the request client-side, so failure only surfaces after a full round trip. Double-clicking Run is actually handled correctly (disabled while loading — a genuine save). Forces an error mid-run and lands on a bare red sentence with no information about whether reserved credits were released.

## Minor Observations

- Live-DOM overlay found 5 instances of card-inside-card nesting in the hero mockup, 3 oversized (44×44px) icon tiles above feature-card headings, and a skipped heading level (h1 → h3, no h2 anywhere on the page) — all recognized generic-AI-SaaS patterns, reinforcing the design-specificity split above.
- The social-proof strip renders the literal text "[PLACEHOLDER — 로고]" plus four dashed pills labeled "A/B/C/D" — visible in production-rendered HTML, not just a code comment. On a page about never showing unverified claims, a visibly fake trust-logo strip is a strange thing to ship live.
- `⌘↵` shortcut glyph is hardcoded and shown unconditionally regardless of the visitor's OS.
- Library pages (`library-list.tsx`, `library-run-detail.tsx`) are functionally solid but visually still the pre-redesign "instrument" era — no connection to the redesign's warmth.
- `app/auth/page.tsx` is a single Google OAuth button with zero trust copy, a missed opportunity given the product's whole value proposition is trust.
- A "2 Issues" badge visible in screenshots is a pre-existing, unrelated browser extension indicator — not an Impeccable finding, noted so it isn't mistaken for one.

## Questions to Consider

1. If `hero-artifact.tsx` is the promise, what would it take to make the real `run-result.tsx` literally indistinguishable from that mock?
2. The redesign was scoped to the page that costs nothing to view, leaving the page where money changes hands untouched — was that intentional sequencing, or did "polish" quietly get defined as "what a visitor sees" rather than "what a paying user sees"?
3. All 15 tools currently render through one generic form and one generic JSON-dump result. Is a single universal renderer actually saving effort, or is it the exact mechanism by which the product's only differentiator gets lost on every run?
