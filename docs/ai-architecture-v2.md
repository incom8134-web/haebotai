# AI tool architecture v2 — request-driven agents

Status: **proposal, no code changed.** Written 2026-10-01 after auditing
`lib/agents/*`, `lib/agents/specs/*`, `lib/ai/gemini.ts`,
`lib/tools/{generate-prompt,playbooks,directions,chain}.ts`,
`lib/tools/schemas/*`, `lib/tools/report/*` and
`components/results/tool-views.tsx`. It follows
`docs/ai-architecture-proposal.md` (v1), which is built and merged.

---

## 1. Summary

**What v1 built.** v1 has every layer in the requested diagram, as stages
of a background job:

- intent analysis, with clarifying questions;
- a strategist that weighs at least 3 approaches;
- a separate critic;
- bounded revision that keeps the best version;
- a diversity memory.

**Why outputs still repeat.** All of these layers work *inside* a
deliverable whose shape, workflow and procedure are fixed for each tool
before the request is read. The strategist may reorder and reweight the
parts. The strategy prompt itself says:

> 출력 형식(JSON 필드)은 그대로 지키되…
> (Keep the output format, the JSON fields, as it is…)

So a private-jet homepage and a bakery homepage differ in words, not in
kind. Better prompts can't fix this, because the prompt isn't what
repeats; the frame around it is.

**v2 moves five fixed things to the request:**

| Today it is fixed per tool | In v2 it is decided per request, by |
| --- | --- |
| The **workflow**: the same 8 stages for 23 tools | A **planner** that composes **capabilities** into a plan |
| The **deliverable's shape**: the zod schema is the table of contents | A **block document**: a small fixed envelope plus a body of blocks the strategy lays out |
| The **procedure**: the playbook's numbered `method` steps in every draft | **Domain knowledge** only. The plan is the procedure. |
| The **creative options**: 4–5 preset approaches per tool | A **design-strategy space** (dimensions), with ≥3 directions that must differ on it |
| **Critique and revision**: one generalist; a full rewrite into the same schema | A **critic panel** chosen per request; **block-level revisions** that may restructure |

**What stays the same:**

- The runtime: jobs, handoff, credits, events, cancel.
- Safety: grounding, no invented facts, output safety.
- Chaining, project memory, exports.
- Old runs.

Every tool keeps working on v1 until its v2 path wins on the eval set.

---

## 2. What exists today (as built)

### 2.1 Runtime: keep as is

`lib/agents/runner.ts` runs an `AgentSpec`'s stages as a job:

- it saves state after each stage (`generations.output._agent`);
- when time runs short it hands off to a fresh invocation (`handoff.ts`);
- optional stages are skipped on error;
- `finish()` runs grounding and safety checks, settles credits and writes
  project facts.

This is a sound orchestration substrate. v2 changes *what* it executes,
not how.

### 2.2 Agents

| Spec | Tools | Workflow |
| --- | --- | --- |
| `generic.ts` | 21 structured tools | understand → strategize → research? → draft → critique ⇄ revise (≤2) → polish → finalize |
| `homepage.ts` | homepage | understand → strategize → art direction → page → critique → revise → assemble |
| `visual.ts` | logo | plan 4 directions → critic before drawing → re-plan → draw |
| `visual.ts` | image, brand-model | understand → strategize → render |
| `legacy.ts` | non-Gemini keys, grant | one shot (`generateOutput`) |

### 2.3 Layers

- **Intent** (`intent.ts`): a fixed record. It has subject, kind (free
  text), audience, goal, positioning, tone, must-include and avoid lists,
  unknowns, and ≤3 questions.
- **Strategy** (`strategy.ts`): one JSON call.
  - It weighs 3–4 approaches. `approach_id` is an enum from the tool's
    library or `custom`.
  - It returns a chosen approach with a blueprint (3–16 parts), a rubric
    (4–7), and emphasize/omit lists.
- **Library** (`library.ts`): GENERIC has answer-first,
  diagnose-prescribe, options and playbook. Each tool also has its own
  4–5 approaches.
- **Critic** (`critic.ts`): score, typed issues and strengths. It never
  rewrites. `PASS_SCORE` is 82.
- **Revision**: the draft call again with `_revision: {draft, critique}`.
  It uses the same system prompt and the same schema.
- **Diversity** (`diversity.ts`): fingerprints (strategy, direction,
  blueprint parts) and Jaccard similarity. It adds a "sameness" note to
  the critic and breaks ties. It is advisory only.

### 2.4 The writer call

`geminiAdapter.generateStructured` (`lib/ai/gemini.ts`) builds:

- **System prompt.** The playbook's role, the 8 house rules, the
  playbook's numbered `method`, its `bar` and its examples.
- **User prompt.** Form values, profile, brief, intent, strategy
  blueprint, reference, free request and revision.
- **Response schema.** The tool's zod schema.

### 2.5 Downstream consumers of the fixed shape

- `TOOL_VIEWS`: 25 bespoke views, each matched by field names.
- `lib/tools/report/*`: 22 builders that turn a tool's fields into the
  `Report` block model, used for both the screen and the exports.
- `chain.ts` seeds: they read specific fields.
- Partial regeneration: it redoes one named part.
- `writeRunFacts` (project memory).
- The `.xlsx` financials.

---

## 3. Why outputs remain template-driven

These are ranked by how much sameness each causes.

1. **The schema is the table of contents.** Examples:
   - `sangsepage`: always 8–10 sections, exactly 3 USPs and exactly
     5 FAQs.
   - `logo`: exactly 4 concepts with identical fields.
   - `copy`: angles, each with a variant B.
   - `presentation`: slides drawn from 9 layouts.

   The strategist's blueprint can only rename and reorder inside these
   slots: "JSON 필드는 그대로" (keep the JSON fields). The only exception
   is the business plan (chapters in the strategy's order, analysis
   blocks only when needed), and it shows the most variety in eval.
2. **The views render the same slots.** Even when the content differs,
   a result looks like every other result of that tool. Users judge
   "template" by the shape first.
3. **The playbook's `method` is a procedure.** For example, "1. 검색 근거에서
   시장 인사이트… 2. 고객을 2~3개 세그먼트로…" (1. market insight from the
   search findings… 2. split customers into 2–3 segments…).
   - It sits in the system prompt of every draft *and* every revision,
     so it outranks the per-request blueprint in the user prompt.
   - `bar` hard-codes counts: "소제목 4~6개" (4–6 subheadings), "캠페인
     방향 3가지" (3 campaign directions), "13주" (13 weeks).
   - The examples anchor the voice.
4. **The workflow is fixed.** Every structured tool runs
   research → draft → critique → revise, whatever the request.
   - A university site needs information architecture before copy.
   - A logo needs symbol exploration and favicon/monochrome checks.
   - An investor deck needs the narrative and the numbers before the
     slides.
   - Nothing chooses these steps.
5. **The creative options are a short menu.**
   - The "≥3 approaches" are usually the same 3 presets from
     `library.ts`, scored against each other.
   - There is no notion of the *dimensions* a direction can vary on:
     narrative logic, structure archetype, persuasion mode, visual
     language, density.
   - So "different" options often differ in name only.
6. **Draft and critique share a frame.**
   - The strategist that chose the approach also writes the critic's
     rubric, and the critic reads the same playbook bar.
   - Nothing asks "is this the obvious AI structure for this kind of
     request?"
   - A competent template answer scores above 82 and passes.
7. **Revision is a full rewrite into the same schema.** It fixes
   sentences well; it can't add a comparison table, drop the FAQ or
   split a section, so structural issues survive.
8. **Diversity only advises.** Similarity is measured but never changes
   a plan. Fingerprints don't include the deliverable's skeleton.
9. **Intent is a form.** The fixed fields push the model to fill slots.
   It lacks a "what is unusual about this request" signal.
10. **Members' own Claude keys stay one-shot** (`legacy.ts`).

---

## 4. Target architecture

```
request
  │
  ▼
ORCHESTRATOR (lib/agents/runner.ts — unchanged runtime; executes a Plan)
  │
  ├─ 1 INTENT ANALYZER      working memo + a small routing core + questions
  ├─ 2 TASK STRATEGIST      creative budget: ≥3 directions across a strategy
  │                         space, distance-checked, one chosen with reasons
  ├─ 3 PLANNER              composes capabilities into a Plan (DAG) within
  │                         the tool's allowed set, time and credit budget
  ├─ 4 SPECIALIZED EXECUTION  capability calls: research, structure, copy,
  │                         visuals, numbers, slides, logo… (parallel where
  │                         independent) → a Block Document
  ├─ 5 CRITIC PANEL         lenses picked per request (UX, brand, conversion,
  │                         copy, visual, domain, template-detector);
  │                         prioritized issues, never rewrites
  ├─ 6 REVISION LOOP        block-level patches (rewrite, insert, delete,
  │                         reorder, re-render), ≤2 rounds, best kept
  └─ 7 FINAL                validators (tool contract, grounding, safety),
                            envelope for chaining/memory, render + export
```

### 4.1 Intent: a working understanding

The intent becomes two parts.

**`memo`: free text the model writes for itself.** It covers:

- what is being asked;
- for whom;
- what success looks like;
- what is *unusual* about this request;
- what would be the lazy default here, and why it would be wrong.

The planner, strategist and critic read the memo verbatim. It holds the
model's working understanding, not form fields.

**`core`: the minimum the system routes on:**

- `deliverable` (free text, e.g. "investor pitch, 12 slides");
- `domain` (free text);
- `audience`;
- `stakes` (inform / persuade / sell / decide / teach);
- `uses_profile`;
- `critical_unknowns` with assumptions;
- ≤3 questions.

The rest of today's `Intent` fields (tone, must-include, avoid) move into
the memo or stay optional. `intentBlock` keeps its rule against invented
facts (`[입력 필요]`, "input needed").

### 4.2 Strategy: creative budget and a design-strategy space

`library.ts` approaches become **points in a space**, not a menu. Each
domain defines its dimensions and known archetypes.

| Domain | Dimensions (examples) | Archetypes (examples, not a closed list) |
| --- | --- | --- |
| Web / landing | narrative logic (story · proof · catalog · IA-first · single-offer), persuasion mode (aspiration · evidence · urgency · trust), density, visual language (editorial · product-UI · photographic · typographic), primary action | luxury editorial, SaaS conversion, university IA, restaurant/booking, portfolio, campaign microsite, local service |
| Document | argument shape (answer-first · problem→solution · options · chronological · evidence-led), reader (lender · investor · grant jury · partner · internal), numbers depth, length | bank loan plan, VC seed plan, grant application, franchise plan, social venture plan |
| Deck | purpose (raise · sell · teach · report · keynote), arc (problem-solution · story · data-led · demo-led · lesson), slide density, visual ratio | investor, lecture, sales, company intro, conference talk |
| Brand / logo | personality axes, symbol strategy (lettermark · pictorial · abstract · emblem · wordmark), metaphor source, conventions to keep or break | — |
| Campaign / copy | motive, format, channel, voice | — |

The **creative-budget** rule replaces "≥3 approaches":

1. Produce ≥3 directions. Each must place itself on the domain's
   dimensions.
2. **Distance check (code, not prompt).** Every pair must differ on at
   least 2 dimensions. If not, one regeneration, with the clash named.
3. One of the 3 must be the **"obvious AI default"**, named explicitly.
   It may win only if the strategist argues why the request truly calls
   for it. That argument is shown to the member. Naming the default
   stops it from passing in disguise.
4. Directions are scored on fit with the memo and the rubric. The
   diversity penalty comes from the member's recent fingerprints (§4.7).
   Nothing is random.
5. The output is the chosen direction, the **outline** (§4.4: sections
   and the block types each should use), the rubric, and the rejected
   directions (kept for "다른 방향으로 다시", "redo in another
   direction").

### 4.3 Planner and capabilities

A **capability** is one typed, testable unit of work. Each has:

- a zod input and output;
- a time and credit estimate;
- the providers it supports;
- its own focused prompt.

Each capability's prompt carries only the domain knowledge it needs, not
the whole tool's playbook.

| Capability | Does | Built from |
| --- | --- | --- |
| `research_topic` | grounded search with findings and sources | `searchGrounding` |
| `analyze_competitors` | positions, gaps and a positioning map | competitor-lens / strategy parts |
| `generate_brand_direction` | personality, voice, palette, type | brand-dna |
| `generate_page_structure` | IA / section flow for web or a sales page | homepage plan stage |
| `generate_outline` | the document or deck arc, with block types | new (strategist output) |
| `write_section` | one section's blocks from its brief | generic draft, split |
| `generate_copy` | headlines, CTAs, ad variants | copy / hook-lab |
| `compute_numbers` | financial model, KPIs, charts from assumptions | `financial-model.ts` |
| `generate_ui` | HTML/TS page from structure + direction | homepage page stage |
| `generate_image_prompts` / `render_images` | art-directed shots | visual / finishStructured |
| `generate_logo_concept` / `draw_logo` / `check_logo` | concepts, drawings, favicon/mono/negative-space checks | logo spec |
| `create_slides` | slides from the outline, with layouts, charts and notes | presentation |
| `validate_output` | the tool contract, grounding, numbers (code) | `checkGrounding`, guards |
| `critique_output` | one critic lens | `critic.ts` |
| `revise_blocks` | applies patches to named blocks | new |

The **planner** returns a `Plan`: an ordered list of steps (a DAG), each
naming a capability, its inputs (references to earlier outputs) and
whether it is optional.

**Constraints, enforced in code:**

- Steps must come from the tool's `allowed` capability set.
- There is a required terminal step (`compose` + `validate_output`).
- At most N steps.
- The summed estimates must fit `estimatedCredits` × 1.0 and the time
  budget.
- An invalid plan → the tool's **default plan**, which is exactly
  today's workflow. That is the safety net.

The planner is one fast-model call. Most of its intelligence is the
memo and the chosen direction, so it is cheap.

The runner already executes stages by id. A plan becomes a list of stage
instances (`step-3:write_section`). The state keeps per-step outputs in
`work` and records parallel groups. Handoff, retries and cancel work
unchanged.

### 4.4 Deliverable: envelope plus block document

Every result becomes:

```ts
{
  envelope: { … },   // small, fixed per tool: what chaining, memory, partial
                     // regeneration and search rely on (title, summary,
                     // key facts, the tool's contract fields)
  doc: {             // request-shaped
    outline: { id, title, purpose }[],
    sections: { id, kicker?, title, lead?, blocks: Block[] }[]
  },
  assets?: { … }     // html, images, logo files, deck slides, xlsx model
}
```

**`Block` reuses `ReportBlock`** (`lib/tools/report/types.ts`), which
the screen and the PDF/DOCX/PPTX/MD exports already render:

- kpis, chart, table, text, callout, bullets, cards, quad, sources.

It adds a few kinds: `quote`, `steps`/timeline, `comparison`, `faq`,
`cta`, `gallery`, `copy_variants`.

To fit Gemini's schema limits (depth ≤ 2, maxItems ≤ 16), a block is one
flat object with a `type` discriminator and optional fields per type,
the same pattern `presentation.ts` already uses for slide layouts.
Sections are generated one per call (`write_section`), so no single
response needs deep nesting or long arrays.

**Tool contracts replace fixed counts.** A contract is a validator, not
a schema. Examples:

- sangsepage: ≥1 CTA, an image instruction per visual section, and
  shipping/returns covered somewhere.
- logo: 3–5 concepts, each with symbol logic, favicon and monochrome
  checks.
- business plan: the financial blocks agree with `compute_numbers`.

A failed contract becomes a critic issue, not a crash.

**Rendering.**

- A universal `BlockDocView` renders `doc` for every tool, with a
  tool-specific *skin*: palette, hero, and special blocks such as the
  logo board, site preview and deck storyboard.
- `TOOL_VIEWS[x].match` still catches the old shapes, so every saved run
  renders as before.
- Report builders become: legacy shape → builder (as now); v2 shape →
  `doc` directly. Exports therefore work on day one.

### 4.5 Specialized execution

Long deliverables are written **section by section**. Each
`write_section` call gets:

- the memo;
- the chosen direction;
- a short **style sheet** (voice, terms, numbers, banned phrases), which
  the outline step writes once;
- that section's brief: purpose and suggested blocks;
- summaries of the neighbouring sections.

Independent sections run in parallel inside one invocation, which keeps
the time near today's.

A final `compose` step checks continuity: repeated claims, mismatched
numbers, a missing thread. It patches through `revise_blocks`.

Specialized pipelines keep their strengths as **plans**, not separate
specs:

- the homepage's art direction → page → assemble;
- the logo's critique-before-drawing.

### 4.6 Critic panel and revision loop

The planner picks 2–3 **lenses** for the request.

| Lens | Asks |
| --- | --- |
| UX / IA | Can the reader find and do the thing? Hierarchy, flow, scannability |
| Brand | Does this sound and look like *this* brand's position, not the category? |
| Conversion | Is the offer clear, with objections answered and a CTA where intent peaks? |
| Copy | Specificity, rhythm, cliché, claims without proof |
| Visual | Composition, contrast, imagery fit, logo legibility at 16 px |
| Domain | e.g. lender, VC, grant jury, teacher: what this reader rejects |
| **Template detector** | Given the memo and the named "obvious default", is this the default AI structure for this kind of request? Compares the skeleton with the default plan's skeleton and the member's recent fingerprints |

**Output.** Each lens returns prioritized issues (`severity`, `where` = a
block or section id, `problem`, `fix`) and never rewrites. The
aggregator:

- removes duplicates;
- ranks the issues;
- decides `pass` or `revise`.

**Pass rule.** No high-severity issue, and the template-detector score is
under its threshold. This replaces a single score of 82 that a competent
template answer clears.

**Revision.** `revise_blocks` receives only the flagged blocks plus
context. It returns **patches**:

- `replace(blockId, blocks[])`
- `insert(after, blocks[])`
- `delete(blockId)`
- `move(blockId, after)`
- `rerender(assetId)`

Structural fixes are therefore possible, and untouched blocks stay
byte-identical, which is cheaper and avoids drift.

There are ≤2 rounds. The best-scoring version is kept (`pickBest`, as
today).

### 4.7 Diversity: inferred, not random

- **Fingerprints** grow to: the direction's coordinates on the domain
  dimensions, the outline skeleton (section purposes and block-type
  sequence), and the visual direction.
- The **strategist** gets the member's last 5 fingerprints for this
  domain, with an instruction:
  - do not repeat a direction unless the request is a continuation, or
    explicitly asks for the same;
  - the distance check runs against them too.
- The **template detector** uses them (§4.6).
- No randomness anywhere. Variety comes from the request; the memory
  only stops lazy repetition.

### 4.8 Playbooks become knowledge packs

Each tool's playbook is split.

**Kept as knowledge.** The role, plus domain facts and conventions, with
no hard counts. For example:

- Korean channel formats and their length limits;
- what a lender reads first;
- favicon rules.

The writer gets these as reference, not as steps.

**Moved out of the playbook:**

- **Method → planner hints.** E.g. "competitor analysis is usually
  useful when…". The planner may use them; it isn't bound to them.
- **Hard counts → the strategy or the contract.** E.g. "4–6 subheadings"
  becomes a strategy decision; "≥2,000 characters for SEO blog" becomes
  a contract only when the member's goal is search ranking.
- **Examples → the critic's copy lens.** They show the bar without
  anchoring the writer's voice.

`HOUSE_RULES` stay (facts, Korean channels, no Haebot branding, honesty
about estimates). They are about truth, not shape.

---

## 5. The four examples, end to end

**1. Private-jet charter homepage**

- **Memo:** UHNW clients and their assistants; trust and discretion
  outweigh price. The lazy default is hero → features → testimonials →
  pricing → CTA. That is wrong: no public pricing, and "features" read as
  a commodity.
- **Directions:**
  - (a) luxury editorial: story, aspiration, sparse, photographic;
  - (b) concierge-first: single action "speak to a charter advisor",
    trust, minimal;
  - (c) fleet-proof: evidence, catalog, specs. This is named as the
    obvious default variant.
  - Chosen: (a)+(b) blend.
- **Outline:**
  - a cinematic statement;
  - "a day, not a flight" itinerary narrative;
  - fleet as a gallery, not a spec table;
  - safety and discretion credentials;
  - a private-enquiry form; no pricing block.
- **Plan:** `generate_brand_direction` → `generate_page_structure` →
  `generate_copy` → `generate_image_prompts`/`render_images` →
  `generate_ui` → critics (brand, visual, template detector) →
  `revise_blocks` → validate.

**2. Business plans that differ by type**

| Request | Arc | Blocks it adds or drops |
| --- | --- | --- |
| Bank loan | repayment capacity first | DSCR table, collateral, monthly cash flow; no TAM/SAM/SOM theatre |
| VC seed | problem → insight → why now → traction → market → model → team → ask | market sizing chart, cohort/traction KPIs, use of funds |
| Grant (예비창업패키지, a Korean pre-startup grant) | the jury's scoring template: problem / solution / scale-up / team | scoring-criteria mapping, milestones table |
| Franchise | unit economics → replicability | per-store P&L, rollout timeline |

`compute_numbers` drives every number, so the document, charts and .xlsx
agree (as today).

**3. Presentation type inference**

The intent core's `deliverable` and `stakes` infer the type:

- investor;
- lecture (lesson arc, recall checks, low density);
- sales (pain → cost of inaction → proof → offer → next step);
- company intro;
- conference talk (one idea, story, big visuals, few words).

The outline picks slide layouts per beat. The domain lens is "would this
audience act?".

**4. Logo**

- `generate_brand_direction` produces personality axes.
- The strategist produces 3–5 concepts that must differ on
  symbol strategy × metaphor source × convention (keep or break). For
  example: a negative-space mark, a lettermark, an emblem, an abstract
  motion mark.
- `check_logo` runs per concept before drawing: legibility at 16 px,
  monochrome, negative space, and clashes with the category's clichés.
- `draw_logo` runs only for the survivors.
- The visual critic checks the drawings (favicon crop, mono render).

---

## 6. What changes in code (by module)

| Module | Change |
| --- | --- |
| `lib/agents/runner.ts` | Executes `state.plan.steps` when present, else the spec's stages (unchanged). Parallel groups via `Promise.all` inside one stage instance. |
| `lib/agents/capabilities/*` (new) | One file per capability: zod IO, prompt, estimate, `run(ctx, input)`. Wraps the existing calls first (search, generateStructured, logo, photos). |
| `lib/agents/planner.ts` (new) | Plan schema, the planner call, the validator (allowed set, budget, terminal step), default plans per tool |
| `lib/agents/intent.ts` | Adds `memo`; trims `core`; keeps questions |
| `lib/agents/strategy.ts`, `library.ts` | Domain dimensions + archetypes; directions carry coordinates; distance check; named default; outline with block types |
| `lib/agents/critic.ts` | Lenses, an aggregator, the template detector, block-addressed issues |
| `lib/agents/revise.ts` (new) | Patch schema and `applyPatches(doc, patches)` (pure, tested) |
| `lib/agents/diversity.ts` | Skeleton + coordinate fingerprints; input to the strategist |
| `lib/tools/doc/*` (new) | `Block` (extends `ReportBlock`), the envelope per tool, contracts (validators) |
| `lib/tools/playbooks.ts` | Split into `knowledge` / `plannerHints` / `contracts`; the old fields are read until a tool switches |
| `components/results/block-doc-view.tsx` (new) | Universal renderer + per-tool skins; `TOOL_VIEWS` stay for legacy shapes |
| `lib/tools/report/index.ts`, exports | v2 `doc` → `Report` directly |
| `lib/tools/chain.ts`, `writeRunFacts`, partial redo | Read the `envelope` (v2) or the old fields (v1); partial redo targets a section or block id |
| `lib/ai/*` | A provider-neutral `jsonCall` so capabilities run on Claude keys too |

---

## 7. Migration plan (existing functionality preserved at every step)

Every tool gets `architecture: "v1" | "v2"` in its manifest. v1 is the
default until the tool's eval gate passes. Old runs never change.

| Phase | Work | Ships when |
| --- | --- | --- |
| **0. Measure** | Extend `scripts/eval` with a **sameness score**: skeleton similarity between contrasting golden requests of the same tool (e.g. `copy_funeral` vs `copy_truck`), plus blind A/B quality grading. Record the v1 baseline. | Baseline numbers recorded |
| **1. Plan as data** | Capabilities wrap the existing calls; each tool's default plan reproduces today's workflow exactly; the runner executes plans. | Eval identical to v1 (no behaviour change) |
| **2. Intent memo + strategy space + planner** | Creative budget, distance check, named default, constrained planner with fallback | Sameness ↓, quality ≥ v1 on the golden set |
| **3. Block document** | Envelope + `doc` + `BlockDocView` + exports for **presentation, business-plan, sangsepage**; then homepage and logo as plans | Pilot tools' eval gate; exports and chains verified |
| **4. Critic panel + block revision** | Lenses, template detector, patches | Pilot tools: fewer high-severity issues after revision |
| **5. Rest of the tools** | The remaining 20 tools in catalog order; playbooks split; a Claude-key adapter | Per-tool gate |
| **6. Retire** | Delete v1-only code paths once no tool uses them (the legacy views stay for old runs) | All tools on v2 for 2 weeks |

Each phase is one PR, with `npm test`, typecheck, live runs on throwaway
accounts and before/after screenshots, as in earlier phases.

---

## 8. Time, cost and credits

Estimated per run against today's agentic pipeline on Gemini:

| Added | Calls | Time | Tokens |
| --- | --- | --- | --- |
| Intent memo | the same call | +0 | +5% |
| Planner | +1 fast call | +5–10 s | small |
| Creative budget + distance check | the same call; +1 retry at most | +0–20 s | +5–10% |
| Sectioned writing | N smaller calls, parallel | ±0 (parallel) | +15–30% (shared context repeated) |
| Critic panel (2–3 lenses, parallel) | +1–2 calls | +5–15 s | +10–20% |
| Block revision instead of a full rewrite | fewer output tokens | −10–30 s | −20–40% of revise cost |

**Net:** roughly +10–30% tokens and similar wall time. Today's estimates
already rose 20–60% for v1, so they should mostly hold. The eval phase
measures real costs before any price change. The 300 s handoff already
covers longer plans.

---

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Planner makes a bad plan | Allowed sets, budgets and a terminal step enforced in code; an invalid plan → the default plan; the eval gate per tool |
| Sectioned writing loses coherence | Style sheet + neighbour summaries + a `compose` continuity pass; the critic's copy lens checks repetition |
| Gemini schema limits with blocks | Flat discriminated blocks; one section per call; covered by `schema-depth.test.ts` |
| Results stop looking familiar per tool | Per-tool skins and special blocks keep each tool's identity; the envelope keeps the summary consistent |
| Chaining, memory or partial redo break | The envelope holds the fields they read; both shapes are tested during migration |
| Variety becomes arbitrary | No randomness; the distance check is against *fit-scored* directions; the template detector is advisory to the aggregator, not a quota |
| Cost creep | Measured in phase 0/2; capability estimates are summed by the planner against the tool's budget |
| Two architectures at once | The `architecture` flag per tool; phase 6 removes v1 paths |

---

## 10. Decisions needed before coding

1. **Pilot tools.** Proposed: presentation, business plan and sales page
   (sangsepage) first, then homepage and logo. These are the most
   "templated" and the most valuable.
2. **Shape freedom.** Is it acceptable that two results from the same
   tool can have different section lists and blocks? This is the point
   of v2, but it changes what users and exports see.
3. **Cost.** Accept up to +30% tokens per run with no credit change
   until eval shows the real numbers?
4. **The "obvious default" card.** Show the rejected default and the
   reason to members on the strategy card (more transparency, slightly
   more UI)?
5. **Claude keys.** Bring members' own Claude keys onto v2 in phase 5,
   or keep them one-shot?

On approval I start with phase 0 (measurement) and phase 1 (plan as
data, no behaviour change) as the first PR.

---

## Implementation status

Decisions taken (§10), on the owner's "do it":

- **Pilot tools:** presentation, business plan and sales page first.
- **Shape freedom:** accepted.
- **Cost:** up to +30% tokens, with credits unchanged until eval shows the
  real numbers.
- **The "obvious default" card:** shown on the strategy card.
- **Members' own Claude keys:** stay one-shot until phase 5.

| Phase | State | Where |
| --- | --- | --- |
| 0. Measure | done | `lib/agents/skeleton.ts` (shape + similarity); `scripts/eval/run.mjs` reports `shape` per same-tool pair and re-scores saved runs (`--offline`); v1 baseline in `scripts/eval/baseline-v1.json` |
| 1. Plan as data | done | `lib/agents/plan.ts` (plans, flows, default plans with the v1 step ids); `lib/agents/capabilities/*` (the v1 stages as capabilities); `lib/agents/specs/index.ts` builds the runner's stages from the run's plan |
| 2. Intent memo + strategy space + planner | done | `intent.ts` (`memo`); `space.ts` (domains, dimensions, distance check); `strategy.ts` (coordinates, named default, `budgetProblem` → one retry, `rejectedDefault`); `planner.ts` + `plan_workflow` capability (research mix, revision budget, critic focus; invalid → default); new research capabilities `analyze_competitors`, `research_audience`; critic template check + shape memory (`diversity.ts` `shapeNote`); strategy card shows the default and the workflow |
| 3. Block document | next | pilot: presentation, business plan, sales page |
| 4. Critic panel + block revision | — | |
| 5. Rest of the tools | — | |
| 6. Retire v1 paths | — | |

**v1 baseline** (`scripts/eval/baseline-v1.json`). Shape similarity of
contrasting same-tool requests (1.00 = the same template):

| Tool | Pair | Shape similarity |
| --- | --- | --- |
| presentation | client deck vs teaching deck | 0.70 |
| copy | 3 pairs | 0.69–0.89 |
| homepage | 3 pairs | 0.50–0.56 |
| business plan | loan vs VC | 0.34 |
| **Mean** | | **0.62** |

Over the same pairs, the strategies' blueprints overlapped about 0.03.
The plans differed while the results kept the same shape, which is the
diagnosis in §3.

**After phase 2** (live, 2026-10-01, throwaway account, same golden
requests):

| Pair | v1 | v2 |
| --- | --- | --- |
| business plan, loan vs VC | 0.34 | 0.37 |
| copy, funeral vs food truck | 0.79 | 0.67 |
| deck, client vs lesson | 0.70 | 0.58 |
| **Mean** | **0.61** | **0.54** |

**Runs.** All 6 runs finished; none asked a question.

**Planner choices.**
- Loan plan: topic research.
- VC plan: topic research plus competitor analysis.
- Both copy requests: customer-language research.
- Decks: no research.
- Revision budgets were 1–2 as the requests warranted.

**Strategist.** Each request was placed in its own region of the space,
for example loan = evidence-led / lender / heavy numbers versus
VC = problem-solution / investor. Once (the food-truck promo) it chose
the named default, and the card says why.

**Cost and time.** Credits were unchanged. Time was similar, except
where the planner added research and two rewrites (funeral copy:
234 s vs 123 s).

**Remaining sameness.** What's left is the fixed output shapes, which is
phase 3's job.
