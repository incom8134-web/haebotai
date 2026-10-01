# Agent architecture v2: from template filling to request-driven work

Status: implemented on `claude/brave-johnson-3v8pq4`.
Builds on [ai-architecture-proposal.md](./ai-architecture-proposal.md) (intent → strategy → critic, already shipped).
Code: `lib/agents/core/` (pure, tested), `lib/agents/specs/` (runtime wiring).

---

## 1. Summary

The tools already understood requests (intent) and picked strategies, but **every request still ran the same workflow**. Uploaded sources were cut short, research ran as a single query, and nothing measured the result against the request.

This change adds a shared core:

```
request
 → understand (intent)
 → analyze sources (whole document → outline, facts, requirements)
 → TASK CONTRACT (mode, preserve / allow / prohibit, length, research, visuals)
 → workflow chosen from the contract
     ├ beautify:  design → verbatim rebuild → verify → render
     ├ polish / rewrite:  source outline 1:1 → section rewrites → verify → revise → render
     └ create / from-source / transform / requirements / inspire:
          research questions → strategy → plan (sections, page budgets, source refs, visuals)
          → write section by section → review (critic + lint + verifier) ⇄ revise flagged sections
          → illustrate → render PDF, check pages
 → result + work report (checks, sources, research, conflicts, assumptions, changes)
 → follow-ups routed to the smallest change (design only / visuals only / named sections)
```

---

## 2. Audit of the architecture before this change

| Area | Before | Problem |
|---|---|---|
| Uploads | `reference-server.ts` turned files into one string, **cut at 80,000 chars** (`…(이후 생략)`). The run row stored 20,000. | A long source loses its end: budget, schedule and team sections usually come last. |
| Context per stage | Intent, strategy and critic read `requestText()`, **clipped to 24,000 chars** (12k head + 12k tail). | The planner and the critic never saw the middle of the document. |
| PDFs | Attached as raw parts to the **draft call only**. | Intent, strategy and critic never saw the PDF at all, so the critic could not check fidelity to the source. |
| Structure | PDF/DOCX headings, tables and pages were flattened (`docxText` dropped styles and tables). | There was no document map and nothing to retrieve from. |
| Research | `searchGrounding(manifest, wholeContext)`: one search for the entire request. | The request was not split into research questions, sources were not graded, and nothing detected conflicts with the member's files. |
| Instructions | Free text passed through `freeRequestPrompt` ("follow this first"). | "Don't change it", "keep the order" and "30 pages" were adjectives in a prompt, not requirements. |
| Workflow | The same stages for every request to a tool. | "Beautify my document" and "write me something new" took the same path. |
| Output shape | Proposal: a **fixed 11-field schema** (cover, problem, solution, …). Business plan: chapters plus analysis blocks. | Every proposal came out with the same table of contents. |
| Long form | One structured call per result (32k–65k output tokens). | A 30-page request came back far shorter than asked. |
| Verification | Critic score only (an LLM opinion). | Nothing measured pages, order, kept numbers, coverage or must-haves. |
| Exports | PDF/DOCX/PPTX were built from the report model, with no check after rendering. | Thin slides, overflowing badges, the "title" was the conclusion, and stream details were dropped. |
| Follow-ups | `regenerate` rewrote one schema key. | "Make it more premium" or "fewer images" had no route. |

---

## 3. What was built (by module)

| Layer | Module | What it does |
|---|---|---|
| Task contract | `core/contract.ts` | Picks one of 8 modes and records what to preserve, allow and prohibit, plus length, research, visuals and the member's explicit instructions. `detectExplicit()` reads the instructions with rules, and those rules **override** the model. Example: "Don't change the document, make it beautiful" → `beautify`, with wording frozen. |
| Source engine | `core/parse.ts`, `core/source.ts` | Reads PDF (unpdf: lines, font sizes, pages), Word (heading styles, bold, tables), PowerPoint (slide titles, tables), HTML and Markdown into sections with an outline. Nothing is truncated. |
| Retrieval | `core/retrieve.ts` | BM25 over word tokens plus Hangul bigrams, in document order within a budget. Pinned source sections come first. |
| Source analysis | `core/analysis.ts` | One Flash pass over the whole source (map-reduce above 240k chars). It records each section's role, facts and numbers by section, requirements, entities, terminology, gaps and conflicts. |
| Research | `core/research.ts` | Research questions come first, then one grounded search each. A synthesis step keeps only sourced facts, grades confidence and reports conflicts with the member's files, which always win. |
| Planner | `core/plan.ts` | Lays out sections with purpose, source refs, requirement ids, must-cover items, research questions, a weight-based page budget and one purposeful visual. Preserving modes use the source outline, derived in code. |
| Writer | `core/write.ts` | One call per section with the contract, the outline, summaries of earlier sections, retrieved passages, that section's facts and research, its visual and its length. The instruction differs by mode (new, rewrite, polish). Provenance claims are attached. |
| Beautifier | `core/beautify.ts` | Rebuilds the document **verbatim**: paragraphs are re-flowed, lists, key–value tables and numeric charts are recovered. The model only picks the design, plus highlights and figures that must already appear word for word. |
| Lint | `core/lint.ts` | Counts stock openings and closings, buzzwords, repeated sentence openers, identical section structures and filler. |
| Verifier | `core/verify.ts`, `core/verify-structured.ts` | Checks length (from the rendered PDF), order, wording, numbers kept, source coverage, requirements answered, research used, visuals, unsupported numbers, must-haves, new structure (for inspire) and template-like writing. Failures name the sections to fix. |
| Policies | `core/policies.ts` | Per-agent priorities and "never" rules (proposal, business plan, deck, homepage, logo, research, beautify). |
| Orchestration | `core/doc-agent.ts` | Chooses the workflow and runs the stages, the targeted revisions and the render check. Builds the work report. Model access goes through a `ModelPort`, so tests run it end to end. |
| Runtime | `specs/document.ts`, `specs/port.ts`, `specs/common.ts`, `specs/generic.ts` | Proposals and business plans go through the document agent. All other text tools gain the contract, the whole-source view, question-based research and measured checks in their critique. |
| Follow-ups | `core/revise-request.ts`, `specs/doc-revise.ts`, `regenerate` route | Design-only edits (no words changed, free), visual-strategy edits, or edits to the named sections only. Each saves as a new version. |
| Member's view | `components/agent/work-report.tsx` | The work report described below. |

The work report shows:

- the task type and its workflow
- each check's target against the actual value
- the sources analyzed and the research questions with their conflicts
- the assumptions made
- what happened to each section (kept, polished, rewritten or new)

---

## 4. The same tool, different work

The tests (`lib/agents/core/contract.test.ts`, `doc-agent.test.ts`) run with a scripted model on a real 26-page Korean R&D plan (`docs/`).

| Request | Mode | Workflow (stages that run) | Model calls |
|---|---|---|---|
| "Don't change the document. Make it beautiful." | beautify | analyze → contract → design → assemble → review → render_check | analysis, contract, design. **Zero writing calls**; every sentence is verified verbatim. |
| "Keep the order and content, polish it, make it professional." | polish | analyze → contract → outline (derived) → write → … | One rewrite per source section, in source order. No planner, no research. |
| "Turn this into a 30-page investor proposal with current market research." | create_from_source | analyze → contract → research → strategize → outline → write → review ⇄ revise → illustrate → render_check | Two searches (one per question, never the member's sentence). Page budgets add up to 30 pages, and each section retrieves its own source passages. |
| "Answer this call for proposals." | answer_requirements | … outline maps every mandatory requirement → verifier checks it | — |
| "Use this only as inspiration." | inspire | the plan must not copy the source outline (checked) | — |
| No upload. | create | contract → … (no analyze) | — |

---

## 5. Exports (reported issue: "PDF/PPTX are generic and bad")

These were rendered and inspected (PDF via PyMuPDF; PPTX and DOCX via LibreOffice).

**What was found:**

- the cover title was the conclusion ("먼저: 매장 판매 + 구독") instead of the document's name
- the PDF had no cover and no contents
- long card badges overflowed in PPTX
- section intros became near-empty slides
- the summary was printed twice
- bullets were orphaned at the end of a page
- Revenue Mapper dropped what each stream sells, its price model and its margin

**What was fixed:**

- documents carry their own name; for analysis tools the conclusion goes in the subtitle
- the PDF has a cover in the tool's color, KPI tiles and contents, plus a color rule on every page
- card facts appear as compact fact boxes
- section intros become statement slides
- long badges move into the card body
- Revenue Mapper has a per-stream detail section
- the lead is no longer printed twice, and bullets stay with their text

Document-agent results are rendered to PDF at the end of the run, so the page count in the work report is the real one.

---

## 6. Limits and decisions needed

- **Credits.** A 30-page document makes about 15–25 model calls (most on Pro, falling back to Flash), but the price is still the tool's flat estimate. Decision for the business: should long documents cost more, for example by scaling with the requested pages?
- **Live model quality.** The workflows, contracts, parsing, retrieval, verification and exports are tested. Generation quality with the real Gemini models was **not** measured here: the sandbox has no API key. Run `scripts/eval` with real keys on the eight proposal scenarios before release.
- **Scanned PDFs** have no text layer. The analyzer then attaches the PDF itself so Gemini can read it, but beautify mode needs a text layer.
- **PPTX images** in documents are skipped in the slide export. They appear in the PDF and Word files.
- **Other tools** (homepage, logo, images) keep their own agents. They gain the contract and research only where they use the generic stages.
