# AI architecture proposal: from tool prompts to request-driven agents

Status: **approved and implemented** (decisions and what was built: see "Implementation" at the end)
Scope: every generation tool (18 tools) in `lib/tools`, `lib/ai`, the run route, renderers and exports.

---

## 1. Summary

Today every tool is **one fixed prompt → one JSON call → one rewrite of the same JSON**. The prompts differ; the *behaviour* doesn't. The shape of each result is decided before the request is read, because each tool's output schema hard-codes its structure. The business plan, for example, always has summary / problem / solution / TAM-SAM-SOM / SWOT / P&L. Better prompts can't fix that. They only make "a better version of the same template".

The proposal keeps all 18 tools, the UI, the renderers, exports, credits and safety rules. It inserts an agent runtime between the run route and the model:

```
request
  → ORCHESTRATOR (budget, time, events, persistence)
  → INTENT      what is really being asked, for whom, why; unknowns; ask or assume
  → STRATEGY    ≥3 materially different approaches → pick one → plan + blueprint + rubric
  → EXECUTION   the tool's agent runs the plan with capabilities (research, positioning,
                copy, structure, visuals, site, deck, images, numbers…)
  → CRITIC      separate pass, expert panel, prioritised critique against the rubric (no rewriting)
  → REVISION    change structure where needed, not just sentences → back to CRITIC (bounded)
  → DELIVER     artifact + flexible document + "why this approach" shown to the user
```

The key enabler already exists: the **report block model** (`lib/tools/report/types.ts`). It is a free-form document of sections made of KPI tiles, charts, tables, cards, text, callouts and bullets, and the web view plus every export (PDF, Word, PowerPoint, Markdown) already render it. If agents compose that model instead of filling fixed schemas, structure can differ per request with no renderer rewrite.

---

## 2. What exists today (as built)

### 2.1 Pipeline

```
POST /api/tools/[toolId]/run  (300 s limit, credits reserved, spend guard)
  └ generateOutput (lib/tools/generate.ts)
      ├ analyzeRequest            ← added this week: subject, tone, profile relevance, direction pick
      ├ image / brand-model / logo → adapter.generateImages  (shot plan → image model ×N)
      ├ homepage (Gemini)          → generateHomepage        (Pro plan → Pro page ×2 race → review → assemble)
      └ everything else            → adapter.generateStructured:
            search grounding (if webSearch)
            ONE call: system = playbook(role, fixed method steps, bar, examples) + house rules
                      output = the tool's fixed zod schema
            ONE editor call rewriting the same schema
      └ tool post-processing (sangsepage render, deck photos, price/number guards)
  → stored in generations.output → rendered by a per-tool renderer / report builder → exports
```

### 2.2 Per tool

| Tool | Model | Research | Output contract | How rigid |
|---|---|---|---|---|
| business-plan | Pro | yes | fixed skeleton (6 prose sections, TAM/SAM/SOM, SWOT, 3-yr P&L, 12-month curve, funding, risks) | **very**: same document for a café and an enterprise SaaS |
| strategy, trend, money, keyword, place, proposal, calendar, grant | Pro / Flash | mostly | fixed fields → per-tool report builder | **high**: fields decide sections |
| blog, copy, sangsepage, prompt | Pro | some | fixed fields (article / ad angles / sections) | medium |
| presentation | Pro (high thinking) | no | slides with 9 layouts | **low**: already flexible |
| homepage | Pro plan + Pro page | no | plan → free HTML/TS | **low**: already agentic |
| image, brand-model, logo | image models | no | shot / concept plan → images | medium (plan is fixed-shape) |

### 2.3 Why outputs repeat

1. **Structure is fixed before the request is read**: the zod schema per tool *is* the table of contents.
2. **Workflow is fixed**: every playbook lists the same method steps in the same order for every request.
3. **The editor can't change structure**: it rewrites into the same schema, so it polishes and never restructures.
4. **No strategy step**: until this week, variety came from a *random* "direction". It's now picked by tone, but it's still one paragraph appended to the same prompt.
5. **Critique and rewrite are fused**: the reviewer finds and fixes in one pass, so it gravitates to safe sentence-level edits.
6. **No memory of sameness**: nothing checks whether this result has the same skeleton as the user's last five.

### 2.4 Constraints the redesign must respect

- **Time**: Vercel function limit is 300 s. The homepage already uses ~110–190 s, and more steps need a different execution model (§6).
- **Model quota**: Gemini Pro hit its quota during testing, so the design must degrade to Flash gracefully.
- **Credits and spend guard**: every extra call costs, and estimates must stay honest.
- **Renderers, exports and chaining** read today's fields (`acceptsChainFrom`, report builders, `.xlsx` for the business plan, deck `.pptx`). They must keep working.
- **Safety rules**: no invented facts or prices, imitation guard, grounding, the deck number guard. They must apply at every step.

---

## 3. Target architecture

### 3.1 Layers

```
                         USER REQUEST (+ profile, reference files, chain input)
                                         │
                                  ┌──────▼───────┐
                                  │ ORCHESTRATOR │  run state machine, budgets, events, persistence, retries
                                  └──────┬───────┘
                                         │
                                  ┌──────▼───────┐
                                  │    INTENT    │  working understanding (JSON, mostly free-form)
                                  └──────┬───────┘
                                         │ unknowns critical? ──yes──► ASK (≤3 quick questions) or ASSUME (listed)
                                  ┌──────▼───────┐
                                  │   STRATEGY   │  3+ approaches → select → plan, blueprint, rubric
                                  └──────┬───────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                      ▼                      ▼
           Homepage Agent        Business Planner        Presentation Agent   … (18 agents)
                  │  uses CAPABILITIES: research · competitors · positioning · copy ·
                  │  structure · visual direction · image prompts · images · site ·
                  │  deck · logo concepts · financial model (deterministic) · validate
                  └──────────────────────┬──────────────────────┘
                                         ▼
                                  ┌──────────────┐
                                  │    CRITIC    │  expert panel → prioritised critique + score vs rubric
                                  └──────┬───────┘
                               good enough? ──no──► REVISION (may restructure) ──► CRITIC  (max N rounds)
                                         │yes
                                  ┌──────▼───────┐
                                  │   DELIVER    │  artifact + document + strategy card + assumptions
                                  └──────────────┘
```

### 3.2 Intent layer

It extends the request analysis added this week (`lib/tools/request-brief.ts`). The output is the model's *working understanding*, not a form. A few typed fields are there because the code needs them; the rest is open:

```jsonc
{
  "task": "homepage",
  "subject": "SkyLine Private Jets",           // who the work is for (never the service's own brand)
  "uses_profile": false,                        // saved profile is a different business → dropped
  "kind": "luxury lead-generation site",        // free text: SaaS landing, university, restaurant…
  "audience": ["executives", "HNW individuals", "corporate travel managers"],
  "goal": "qualified itinerary requests",
  "positioning": "exclusive, reliable, global",
  "tone": { "words": "luxury, confident, discreet", "formality": "formal", "energy": "calm" },
  "must_include": ["fleet", "24/7 concierge"],  // from the user's words
  "avoid": ["playful", "discount language"],
  "unknowns": [{ "item": "fleet size", "critical": false, "assumption": "shown as [입력 필요]" }],
  "ask_user": false
}
```

**Ask or assume.** Today every run is one form submit. Proposal: ask only when a critical unknown would make the result wrong (a deck's audience, a business plan's purpose). The run pauses with ≤3 one-tap questions, each with a sensible default, and a "그냥 진행" button that proceeds with the defaults. Everything else is assumed and listed in the result as "가정한 것", so the user can correct and rerun.

### 3.3 Strategy layer (the missing piece)

This is one model call with a **creative budget**:

> Before producing anything, write at least three materially different approaches to this specific request (different structure, emphasis, narrative and visual/interaction logic). Score each against the intent. Pick the best fit. Do not default to a common AI-generated structure when a more specific one serves the request better.

Its output is a *plan the agent executes*:

```jsonc
{
  "considered": [ { "name": "Luxury editorial", "why": "…", "fit": 9 }, { "name": "Conversion funnel", "fit": 6 }, { "name": "Membership-led", "fit": 7 } ],
  "chosen": "Luxury editorial",
  "rationale": "Buyers are persuaded by atmosphere and discretion, not feature lists",
  "steps": ["positioning", "brand_direction", "information_architecture", "copy", "visual_direction", "image_prompts", "build_site", "critique", "revise"],
  "blueprint": [                                  // the structure, decided for THIS request
    { "id": "hero", "role": "cinematic promise", "content": "…" },
    { "id": "destinations", "role": "global reach" },
    { "id": "fleet", "role": "experience, not specs" },
    { "id": "statement", "role": "'Your time is the luxury'" },
    { "id": "services" }, { "id": "comparison" }, { "id": "concierge" }, { "id": "membership" },
    { "id": "itinerary-request", "role": "primary conversion" }
  ],
  "rubric": ["reads as private aviation, not a template", "one primary CTA repeated 3×", "no discount tone", "…"]
}
```

Each agent has a **strategy library**: named approaches with when-to-use notes. They are options to reason about, never a random draw:

- **Homepage**: editorial, minimalist, luxury, technical, corporate, experimental, product-led, storytelling, conversion-focused, visual-first, data-driven, immersive, brutalist, playful, institutional, commerce, reservation-driven.
- **Presentation**, by type: investor pitch (narrative → traction → market → economics), lecture (learning progression → examples → exercises), sales (pain → solution → proof → offer → CTA), company intro (identity → capabilities → products → cases → contact), conference talk (thesis → evidence → findings → implications), internal report, training.
- **Business plan**, by business logic: local retail/F&B (location, footfall, unit economics per seat, permits), SaaS (ICP, funnel, CAC/LTV, churn, security/compliance), manufacturing (capex, supply chain, capacity), grant-application (PSST form), bank loan (cash flow, collateral, downside).
- **Logo**, by genuinely different directions: abstract symbol, wordmark, geometric monogram, negative space, symbol + wordmark, emblem, Korean motif. It reasons about personality, symbolism, category conventions, culture, memorability, favicon/mono reproduction.
- **Copy**: PAS, scene story, numbers-first, conversational, contrast/reversal, question hook, 4U, testimonial-led (only with real reviews), offer-led.
- **Blog**: diary, listicle, Q&A, comparison, route guide, behind-the-scenes, seasonal, how-to, case study.
- The strategy, trend, keyword, place, proposal, calendar, money and grant tools get their own libraries in the same way.

### 3.4 Execution layer: tools become agents with capabilities

Each tool keeps its page, inputs and credits. Internally it becomes an **agent spec**:

```ts
interface AgentSpec {
  id: ToolId;
  objective: string;              // what "done well" means for this agent (not a persona name)
  strategies: StrategyOption[];   // its library (§3.3)
  capabilities: CapabilityId[];   // what it may call
  artifact: ArtifactKind;         // html | slides | images | calendar | document …
  rubric: string[];               // default quality bar, extended per request by the strategist
  guards: Guard[];                // facts, prices, imitation, grounding, numbers
  budget: { steps: number; seconds: number; revisions: number };
}
```

**Capabilities** are typed functions with their own prompts, schemas and models. Many exist already and just get extracted from today's monolithic calls:

| Capability | Today | Notes |
|---|---|---|
| `research(topic)` | `searchGrounding` | Gemini + Google Search, sources kept |
| `analyzeCompetitors` | inside strategy/place prompts | becomes its own step, used by several agents |
| `definePositioning` | inside strategy | reusable by homepage, copy, business plan |
| `brandDirection` / `visualDirection` | inside homepage plan | palette, type, imagery, motion |
| `informationArchitecture` | homepage plan sections | also used for decks and documents |
| `writeCopy(section, voice)` | inside each tool | per-section, voice from intent |
| `composeDocument(blueprint)` | new | writes the **report block model** section by section |
| `buildSite(plan)` | `writePage` + assemble | existing |
| `designDeck(blueprint)` | presentation call + visuals | existing |
| `imagePrompts` / `generateImages` | `shoot`, `planShots` | existing |
| `logoConcepts` | `generateLogo` plan | directions become genuinely different |
| `financialModel(assumptions)` | model-written numbers | **deterministic code** from stated assumptions, so numbers add up |
| `validate(output)` | schema + guards | extended: facts, CTA hierarchy, sameness, accessibility |

The strategist's `steps` choose which capabilities run and in what order. Two homepage requests can take different paths:

- *Luxury jet charter*: positioning → brand direction → IA → copy → visual direction → images → build → critique → revise.
- *Local SaaS signup page*: research audience → competitors → positioning → conversion funnel → build → validate CTA hierarchy → revise.

**Result format.** Every agent returns:

```ts
{
  artifact?: …,                 // html, slides, images, calendar, svg — tool-specific, as today
  document: Report,             // flexible sections of blocks — renderable and exportable today
  legacy?: …,                   // today's fields where other code still reads them (chaining, .xlsx)
  meta: { intent, strategy: { chosen, considered, rationale }, assumptions, critique_log }
}
```

### 3.5 Critic layer

This is a **separate call from generation**, with no rewriting. It uses a panel chosen by the agent: UX designer, brand strategist, conversion specialist, copywriter, visual designer for a homepage; investor, analyst, lender for a business plan; audience member, speaker coach, designer for a deck.

It returns a prioritised critique against the request-specific rubric:

```jsonc
{
  "score": 6.5,
  "issues": [
    { "severity": "high", "type": "structure", "where": "sections 3–5", "problem": "reads like a generic services template", "fix": "replace with fleet-experience narrative" },
    { "severity": "high", "type": "generic", "where": "hero", "problem": "headline fits any airline" },
    { "severity": "med",  "type": "cta", "problem": "two competing primary actions" },
    { "severity": "low",  "type": "tone", "problem": "exclamation marks clash with 'discreet'" }
  ],
  "sameness": "section order matches the user's last 3 sites"   // from the diversity check (§3.7)
}
```

What it looks for: generic sections, repetition, weak hierarchy, unnecessary or missing sections, predictable layouts, a poor CTA, industry-inappropriate design, contradictions, invented facts, and the "AI-generated feel".

### 3.6 Revision loop

The reviser gets the critique and an explicit licence: *change the structure where the critique demands it, try a different design approach where appropriate, keep what is already strong, never break the facts rules.* It then goes back to the critic.

The loop stops when there are no high-severity issues and the score is at or above the threshold, or when the round or time budget runs out. The best-scoring version is kept, so a revision can never make things worse.

### 3.7 Diversity layer

This is controlled variation, never randomness:

1. **Strategy libraries**, selected by intent (§3.3).
2. **Creative budget**: at least 3 approaches considered before choosing.
3. **Sameness check**: each result stores a small *structural fingerprint* (section roles in order, layout types, direction, scene). The critic compares it with the user's recent results for that tool. If it's too similar *and* another strategy fits equally well, it's flagged. Fit always wins over novelty.
4. **Anti-default rule**: the strategist must justify choosing a "standard" structure (hero → features → about → testimonials → CTA; exec summary → market → …) against a more specific alternative.

---

## 4. The same principle for every tool

- **Homepage**: kind of site, audience, goal and a strategy decide sections, interactions and 3D (including none). The existing plan → build → review pipeline becomes intent → strategy → execute → critique → revise.
- **Business plan**: the planning logic follows the business (F&B vs SaaS vs manufacturing vs grant vs loan). Sections are composed from the blueprint. Money is computed in code from assumptions the model states. The `.xlsx` export keeps working through the legacy fields.
- **Presentation**: the deck type is inferred and slides are composed from the blueprint. It already uses flexible layouts, so this mostly adds intent, strategy and critique.
- **Logo**: 3–5 *genuinely different* directions from the brand's reasoning, plus reproduction checks (favicon, mono).
- **Copy, blog, sangsepage**: format and framework from intent. The critic checks that angles really differ.
- **Strategy, trend, keyword, place, money, calendar, proposal, grant**: analysis lens and report sections come from the question actually asked. The report builders stay as the renderers for legacy fields, and new sections come through the document.
- **Image, brand-model**: the shot plan is driven by intent and strategy (campaign vs catalogue vs editorial), and a critic checks it before images are generated (cheap) rather than after (expensive).

---

## 5. User experience

- **Progress**: the run shows its steps as they happen. The run route already streams events, so this adds step events:
  - "요청 이해 중";
  - "전략 3가지 검토 → '럭셔리 에디토리얼' 선택";
  - "초안 작성";
  - "비평: 3개 개선점";
  - "수정 중".
- **Strategy card** on the result: the chosen approach, why, the alternatives considered, and "다른 전략으로 다시 만들기" (rerun with a chosen alternative).
- **Assumptions**: listed and editable, then "반영해서 다시 만들기".
- **Optional questions**: up to 3, shown only when critical, each with a default and a skip.

---

## 6. Runtime, time and cost

- **Time.** Intent + strategy (Flash, ~5–10 s), execution (as today), critic (Flash/Pro, ~10–20 s), and one or two revisions (~30–90 s) exceed 300 s for the heavy tools. Two options:
  - **A (recommended).** Move execution into a background job: the run returns immediately, steps persist to `generations`, and the page follows progress by polling or SSE, which already exists for runs. Vercel supports longer functions (Fluid compute, up to 800 s on Pro), or a queue like Upstash QStash/Workflow, which already uses the Upstash account. Runs also survive closing the tab.
  - **B.** Keep 300 s: cap revisions per tool and skip rounds when the budget is short (what the homepage review does now).
- **Models.** Intent, strategy and critic run on Flash (cheap, fast, and not dependent on the exhausted Pro quota). Creation runs on Pro, falling back to Flash. The critic can run on Pro for the premium tools.
- **Cost.** Roughly +20–60 % tokens per run, depending on revision rounds. Credit estimates rise accordingly, and the spend guard already caps platform spend. The critic stays cheap by scoring against the rubric instead of regenerating.

---

## 7. Migration plan (existing functionality preserved at every step)

| Phase | What | Risk control |
|---|---|---|
| 0 | **Evaluation harness**: ~40 golden requests with deliberately contrasting intents (jet charter vs dessert café vs university; investor pitch vs lecture; café vs SaaS plan). Automatic metrics: structural diversity across requests, rubric score from an independent judge, fact/guard violations, time, cost. | Measure before and after every phase |
| 1 | **Runtime core** (`lib/agents/`): orchestrator, `AgentSpec`, capability registry, step events, budgets; wraps today's pipeline 1:1 (no behaviour change) | Feature flag per tool; tests |
| 2 | **Intent + strategy** for all tools (extends `request-brief`); strategy card in the UI | Falls back to today's path on failure |
| 3 | **Critic + revision loop** replacing today's editor pass; best-version-kept | Loop bounded; guards on every version |
| 4 | **Flexible document output**: agents compose `Report` blocks; legacy fields kept where chaining/exports need them; business plan → dynamic sections + deterministic financial model | Renderers already support blocks; exports unchanged |
| 5 | **Agent-by-agent upgrade** in value order: homepage, presentation, business plan, logo, copy, strategy, then the rest | One tool at a time behind its flag |
| 6 | **Background execution** (if option A) and optional clarifying questions | Rollout behind flag; old streaming path kept |
| 7 | **Diversity memory** (fingerprints + sameness critique) | Advisory only; fit wins |

Each phase ships on its own and is judged by the harness. A tool moves to the new path only when its scores beat the old one.

---

## 8. Risks

- **Latency and cost**: bounded rounds, Flash for reasoning steps, background jobs.
- **Over-creativity** (a law firm getting an "experimental" site): intent tone and "avoid" are hard constraints for the strategist, and the critic checks industry fit.
- **Structure drift breaking exports and chaining**: legacy fields kept, and the document model is already exportable.
- **Evaluation subjectivity**: a fixed golden set plus an independent judge rubric, plus your own spot checks on real screenshots.
- **Quota**: routing that doesn't depend on Pro for the reasoning steps.

---

## 9. Decisions needed

1. **Runtime**: background jobs (A, recommended) or stay within 300 s (B)?
2. **Clarifying questions**: allowed when critical (with defaults and skip), or always assume and list?
3. **Credit cost**: OK to raise estimates ~20–60 % for the critique/revision loop?
4. **Order**: start with homepage → presentation → business plan → logo (recommended), or a different priority?
5. **Visibility**: show the strategy card, alternatives and step progress to users (recommended), or keep it internal?

---

## Implementation

Decisions taken (§9): background jobs; questions only when critical (≤3, each with a default, "그냥 진행"); estimates raised 20–60 %; homepage → presentation → business plan → logo → the rest; strategy card, alternatives and live steps shown to members.

| Layer | Where |
| --- | --- |
| Runtime: job state on the run row (`generations.output._agent`), stage loop, handoff to a fresh invocation (signed), cancel by row status, settle/refund | `lib/agents/runner.ts`, `store.ts`, `handoff.ts`; `app/api/tools/[toolId]/run` (starts the job with `after()`), `app/api/runs/[runId]/events` (NDJSON, reconnects, stale-run refund), `app/api/runs/[runId]/continue` |
| Intent + questions | `lib/agents/intent.ts`, `app/api/tools/[toolId]/intent`, `components/agent/question-card.tsx` |
| Strategy (≥3 approaches, blueprint, rubric) and per-agent libraries | `lib/agents/strategy.ts`, `lib/agents/library.ts` |
| Critic (separate, never rewrites) and bounded revision keeping the best version | `lib/agents/critic.ts`, `lib/agents/specs/common.ts` |
| Agents | `lib/agents/specs/`: `generic.ts` (every structured tool), `homepage.ts` (plan → build → critique → revise → assemble), `visual.ts` (logo plans critiqued before drawing; photo shoots follow the strategy), `legacy.ts` (other engines, grant) |
| Business plan: chapters in the strategy's order, analysis blocks only when needed, financials computed from assumptions (document, charts and .xlsx agree) | `lib/tools/schemas/business-plan.ts`, `lib/tools/report/business-plan.ts`, `lib/tools/financial-model.ts`, `lib/tools/export/xlsx.ts` |
| Diversity memory (fingerprints, sameness note to the critic, tie-breaks only) | `lib/agents/diversity.ts`, `output.agent.fingerprint` |
| What members see | `components/agent/strategy-card.tsx`, `agent-timeline.tsx`; `output.agent` (`lib/agents/meta.ts`) |
| Eval harness | `scripts/eval/golden.json`, `scripts/eval/run.mjs` |

Agents run on Gemini (the platform engine and members' own Gemini keys). A member's own Claude key keeps the one-shot pipeline as a single background stage until that adapter exposes the same steps.

---

## Appendix: already done this week (foundation for Phase 2)

On branch `claude/intelligent-noether-8nnm0n`, committed, not merged:

- **Request analysis before every run**: subject, profile relevance, tone, formality, energy, avoid, and a direction chosen by tone. It replaced the random direction picker.
- **The saved profile is dropped** when a request is about another business.
- **No service branding in outputs**: prompts, exports, presets and the site kit.
- **Homepage**:
  - tone-driven design choices;
  - 3D can be "none";
  - scene variants, motion tempo and placement;
  - three new scenes;
  - all 24 scene combinations verified in a real browser.
- **Live test on contrasting requests**, all run from a test account whose profile is "해봇 AI": law office → calm, no 3D; kids lab → playful, matte floating; techno night → immersive particles; funeral park copy → calm and respectful; food-truck copy → trendy; client deck → professional SCQA. No "해봇" in any output.
