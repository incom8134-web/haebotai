import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parsePdf } from "./parse.ts";
import { parseText } from "./parse.ts";
import { renumber, type SourceDoc } from "./source.ts";
import {
  analyzeStage,
  assembleStage,
  contractStage,
  designStage,
  emptyWork,
  illustrateStage,
  outlineStage,
  renderCheckStage,
  researchStage,
  reviewStage,
  reviseStage,
  revisionTargets,
  workReport,
  writeStage,
  type DocAgentCtx,
} from "./doc-agent.ts";
import { blockText, estimatePages, type LongDocument } from "./document.ts";
import { verbatimShare } from "./verify.ts";
import type { JsonCall, ModelPort } from "./port.ts";
import { routeRevision } from "./revise-request.ts";
import { lintDocument } from "./lint.ts";

// The document agent end to end with a scripted model: what each request
// actually makes the agent DO (which calls, in which order, on what),
// and what the checks say about the result.

interface Script {
  calls: JsonCall[];
  searches: string[];
  sectionText?: (prompt: string) => string;
  critic?: (n: number) => unknown;
}

function scriptedPort(sources: SourceDoc[], s: Script, opts: { contract?: Record<string, unknown>; requirements?: boolean } = {}): ModelPort {
  const ids = sources.flatMap((d) => d.sections.map((x) => x.id));
  let critics = 0;
  return {
    async json(call) {
      s.calls.push(call);
      const usage = { inputTokens: 10, outputTokens: 10 };
      switch (call.task) {
        case "analysis":
          return {
            usage,
            data: {
              doc_type: "R&D 과제 계획서",
              purpose: "과제 선정",
              audience: "심사위원",
              summary: "요약",
              sections: ids.map((id) => ({ id, role: "본문", summary: `${id} 요약`, key_points: [] })),
              facts: [{ text: "사업비 30,000천원", section_id: ids[0], kind: "number" }],
              requirements: opts.requirements ? [{ text: "연구비 사용계획을 제시할 것", section_id: ids[ids.length - 1], mandatory: true }] : [],
              entities: [],
              terminology: [],
              gaps: [],
              conflicts: [],
              design_notes: ["표가 많음"],
            },
          };
        case "contract":
          return { usage, data: { mode: "create_from_source", source_role: "primary", preserve_order: false, preserve_structure: false, preserve_wording: false, preserve_meaning: false, preserve_facts: true, preserve_section_titles: false, allow: [], prohibit: [], length_unit: "none", length_target: 0, length_strict: false, detail: "standard", research_need: "none", research_reason: "", research_questions: [], visuals_level: "balanced", visuals_prefer: [], visuals_avoid: [], audience: "심사위원", deliverable: "제안서", explicit: [], rationale: "", ...(opts.contract ?? {}) } };
        case "plan":
          return {
            usage,
            data: {
              title: "새 제안서",
              subtitle: "",
              doc_type: "제안서",
              narrative: "문제 → 해결 → 실행",
              design_tone: "modern",
              design_accent: "#2255AA",
              sections: [
                { title: "제안 배경", level: 1, purpose: "문제 정의", source_refs: [ids[0]], requirements: [], must_cover: [], research: [], weight: 2, visual_kind: "none", visual_purpose: "", visual_spec: "" },
                { title: "해결 방안", level: 1, purpose: "해결책", source_refs: [ids[1] ?? ids[0]], requirements: [], must_cover: [], research: [], weight: 3, visual_kind: "process", visual_purpose: "흐름", visual_spec: "단계" },
                { title: "실행 계획과 예산", level: 1, purpose: "실행", source_refs: [ids[ids.length - 1]], requirements: opts.requirements ? ["r1"] : [], must_cover: [], research: [], weight: 2, visual_kind: "image", visual_purpose: "현장", visual_spec: "" },
              ],
            },
          };
        case "section": {
          const text = s.sectionText?.(call.prompt) ?? "이 섹션은 사업비 30,000천원으로 진행합니다. 매장 3곳에서 실증합니다.";
          return { usage, data: { title: "", blocks: [{ type: "paragraph", text }, { type: "process", steps: [{ title: "수집", text: "데이터" }, { title: "분석", text: "모델" }] }, { type: "image", prompt: "매장 장면", caption: "실증 매장" }], claims: [{ text: "사업비", basis: "source", ref: ids[0] }], summary: "요약" } };
        }
        case "critic":
          critics++;
          return { usage, data: s.critic?.(critics) ?? { score: 90, issues: [], strengths: [] } };
        case "design":
          return { usage, data: { tone: "premium", accent: "#111111", density: "airy", numbering: false, highlights: [{ section_id: ids[0], label: "핵심", sentence: "완전히 지어낸 문장이라 버려져야 합니다" }], kpis: [], rationale: "" } };
        case "synthesis":
          return { usage, data: { facts: [{ claim: "시장 규모는 1조 원이다", question: "Q", sources: [1] }], conflicts: [], unanswered: [] } };
        default:
          throw new Error(`unexpected task ${call.task}`);
      }
    },
    async search(prompt) {
      s.searches.push(prompt);
      return { findings: "시장 규모 1조 원 (통계청 2025)", sources: [{ url: "https://kostat.go.kr/a", title: "통계청" }], usage: {} };
    },
    async render(doc) {
      return Math.round(estimatePages(doc, 1100));
    },
    async images(items) {
      return new Map(items.map((i) => [i.key, { url: `https://img.example/${i.key}.png` }]));
    },
  };
}

function ctxFor(sources: SourceDoc[], requestText: string, port: ModelPort, extra: Partial<DocAgentCtx> = {}): DocAgentCtx {
  return {
    toolId: "proposal",
    toolName: "제안서",
    work: emptyWork(),
    sources,
    port,
    requestText,
    referenceMode: null,
    intentText: "",
    strategyText: () => "",
    mustInclude: [],
    brandColors: [],
    year: 2026,
    secondsLeft: () => 1000,
    emit: () => {},
    addUsage: () => {},
    ...extra,
  };
}

/** Runs the workflow the contract picked, the way the runner would. */
async function run(ctx: DocAgentCtx): Promise<string[]> {
  const trail: string[] = [];
  if (ctx.sources.length) {
    await analyzeStage(ctx);
    trail.push("analyze");
  }
  await contractStage(ctx);
  trail.push("contract");
  const stages = ctx.work.workflow.stages;
  for (let i = stages.indexOf("contract") + 1; i < stages.length; i++) {
    const st = stages[i];
    trail.push(st);
    if (st === "research") await researchStage(ctx);
    else if (st === "strategize") continue;
    else if (st === "outline") await outlineStage(ctx);
    else if (st === "write") await writeStage(ctx);
    else if (st === "design") await designStage(ctx);
    else if (st === "assemble") assembleStage(ctx);
    else if (st === "review") {
      while ((await reviewStage(ctx)) === "revise") {
        trail.push("revise");
        await reviseStage(ctx);
        trail.push("review");
      }
    } else if (st === "revise") continue;
    else if (st === "illustrate") await illustrateStage(ctx);
    else if (st === "render_check") await renderCheckStage(ctx, "제안서");
  }
  return trail;
}

let pdf: SourceDoc | null = null;
async function realSource(): Promise<SourceDoc[]> {
  if (!pdf) {
    const name = readdirSync("docs").filter((n) => n.endsWith(".pdf")).find((n) => readFileSync(`docs/${n}`).length > 1_000_000);
    pdf = name ? await parsePdf("계획서.pdf", readFileSync(`docs/${name}`)) : parseText("계획서.md", "# 개요\n사업비 30,000천원\n# 예산\n인건비 12,000천원");
  }
  return renumber([pdf]);
}

test("beautify: the design is chosen, nothing is written, and every sentence of the 26-page source survives", async () => {
  const sources = await realSource();
  const s: Script = { calls: [], searches: [] };
  const ctx = ctxFor(sources, "Don't change the document. Make the document itself beautiful.", scriptedPort(sources, s));
  const trail = await run(ctx);
  assert.equal(ctx.work.contract!.mode, "beautify");
  assert.ok(!trail.includes("write") && !trail.includes("outline"), trail.join(">"));
  assert.deepEqual([...new Set(s.calls.map((c) => c.task))], ["analysis", "contract", "design"]);
  const doc = ctx.work.doc!;
  // The made-up highlight was dropped; the design was applied.
  assert.equal(doc.design.tone, "premium");
  assert.ok(!doc.sections.some((x) => x.blocks.some((b) => b.type === "callout")));
  // Verbatim: every source sentence is in the result, in order.
  for (const src of sources[0].sections) {
    const out = doc.sections.find((d) => d.sourceRefs[0] === src.id)!;
    assert.ok(out, `section ${src.id} kept`);
    assert.ok(verbatimShare(src.text, out.blocks.map(blockText).join("\n")) >= 0.98, `section ${src.id} verbatim`);
  }
  const v = ctx.work.verification!;
  assert.ok(v.checks.find((c) => c.id === "wording")!.pass);
  assert.ok(v.checks.find((c) => c.id === "order")!.pass);
  assert.ok(v.pass, JSON.stringify(v.checks.filter((c) => !c.pass)));
  assert.ok(ctx.work.renderedPages! > 0);
});

test("polish: one rewrite per source section in source order, no planner, no research, titles kept", async () => {
  const sources = await realSource();
  const s: Script = { calls: [], searches: [], sectionText: (p) => /\[원문 섹션[^\]]*\]\n([\s\S]*?)(\n\n\[|$)/.exec(p)?.[1].replace(/^### .*\n/gm, "") ?? "" };
  const ctx = ctxFor(sources, "Do not change the uploaded proposal. Keep the order and content, but polish it and make it professional.", scriptedPort(sources, s));
  const trail = await run(ctx);
  assert.equal(ctx.work.contract!.mode, "polish");
  assert.ok(!s.calls.some((c) => c.task === "plan"), "no planner for a polish");
  assert.equal(s.searches.length, 0);
  assert.equal(s.calls.filter((c) => c.task === "section").length, sources[0].sections.length);
  assert.ok(ctx.work.plan!.derived);
  const doc = ctx.work.doc!;
  assert.deepEqual(doc.sections.map((x) => x.sourceRefs[0]), sources[0].sections.map((x) => x.id));
  assert.ok(ctx.work.verification!.checks.find((c) => c.id === "order")!.pass);
  assert.ok(trail.indexOf("write") < trail.indexOf("review"));
});

test("create from source with research: questions are searched one by one, facts carry sources, sections retrieve their own source passages", async () => {
  const sources = await realSource();
  const s: Script = { calls: [], searches: [] };
  const port = scriptedPort(sources, s, { contract: { research_need: "required", research_questions: ["2026 국내 소상공인 마케팅 자동화 시장 규모", "부산 소상공인 디지털 전환 지원사업 2026"] } });
  const ctx = ctxFor(sources, "이 계획서를 바탕으로 30페이지 투자 제안서를 만들어 줘. 최신 시장 조사도 반영해서", port);
  await run(ctx);
  assert.equal(ctx.work.contract!.length.target, 30);
  assert.equal(s.searches.length, 2, "one search per question, not the member's sentence");
  assert.ok(s.searches.every((q) => !q.includes("만들어 줘")));
  assert.equal(ctx.work.research!.facts[0].sources[0], 1);
  // The plan's last section rests on the budget part of the source; its writer saw that part.
  const last = s.calls.filter((c) => c.task === "section").find((c) => c.prompt.includes("실행 계획과 예산"))!;
  assert.ok(last.prompt.includes("연구비") || last.prompt.includes("[s"), "the section's own source passages are in its prompt");
  // Per-section length budget from the 30-page target.
  assert.ok(ctx.work.plan!.sections.every((p) => p.targetChars > 1000));
  // Images were made for the image blocks.
  assert.ok(ctx.work.doc!.sections.some((x) => x.blocks.some((b) => b.type === "image" && b.url)));
  const report = workReport({ sources }, ctx.work)!;
  assert.equal(report.mode, "create_from_source");
  assert.ok(report.research!.questions.length === 2);
});

test("a failed check sends only the flagged sections back, and length shortfalls expand the thinnest", async () => {
  const sources = await realSource();
  const s: Script = { calls: [], searches: [], critic: (n) => (n === 1 ? { score: 60, issues: [{ section: "p2", severity: "high", type: "generic", problem: "뻔함", fix: "구체적으로" }], strengths: [] } : { score: 92, issues: [], strengths: [] }) };
  const ctx = ctxFor(sources, "이 계획서로 제안서를 만들어 줘", scriptedPort(sources, s));
  const trail = await run(ctx);
  assert.ok(trail.includes("revise"));
  const sectionCalls = s.calls.filter((c) => c.task === "section");
  // 3 sections first, then only p2 again (plus the length expansion pass, if any, on named sections).
  assert.equal(sectionCalls.slice(0, 3).length, 3);
  assert.ok(sectionCalls[3].prompt.includes("뻔함"), "the revision prompt carries the critic's note");
  const targets = revisionTargets({ ...ctx.work, verification: { checks: [], pass: false, targets: { p1: ["수치"] } }, critiques: [], failed: [] });
  assert.deepEqual(Object.keys(targets), ["p1"]);
});

test("answer requirements: the plan is checked against every mandatory requirement", async () => {
  const sources = await realSource();
  const s: Script = { calls: [], searches: [] };
  const ctx = ctxFor(sources, "이 공고문에 맞춰 제안서를 써 줘", scriptedPort(sources, s, { requirements: true }), { referenceMode: "rfp" });
  await run(ctx);
  assert.equal(ctx.work.contract!.mode, "answer_requirements");
  const req = ctx.work.verification!.checks.find((c) => c.id === "requirements")!;
  assert.ok(req.pass, `${req.actual}`);
});

test("no source: no analysis, the request alone drives the plan", async () => {
  const s: Script = { calls: [], searches: [] };
  const ctx = ctxFor([], "반려동물 호텔 창업 제안서", scriptedPort([], s));
  const trail = await run(ctx);
  assert.ok(!trail.includes("analyze"));
  assert.equal(ctx.work.contract!.mode, "create");
  assert.ok(!s.calls.some((c) => c.task === "analysis"));
});

test("follow-ups route to the smallest change", () => {
  const doc: LongDocument = {
    title: "t",
    subtitle: "",
    docType: "",
    design: { tone: "formal", accent: "#000000", density: "standard", numbering: true },
    sections: [
      { id: "p1", title: "개요", level: 1, blocks: [{ type: "paragraph", text: "a" }], sourceRefs: [], status: "new" },
      { id: "p2", title: "기술 구성", level: 1, blocks: [{ type: "paragraph", text: "b" }], sourceRefs: [], status: "new" },
      { id: "p3", title: "세부", level: 2, blocks: [{ type: "paragraph", text: "c" }], sourceRefs: [], status: "new" },
    ],
  };
  assert.deepEqual(routeRevision("Make section 2 more technical", doc), { kind: "sections", ids: ["p2", "p3"] });
  assert.deepEqual(routeRevision("기술 구성 부분을 더 자세히", doc), { kind: "sections", ids: ["p2"] });
  const design = routeRevision("Keep everything but make the design more premium", doc);
  assert.equal(design.kind, "design");
  assert.equal((design as { patch: { tone?: string } }).patch.tone, "premium");
  assert.equal(routeRevision("Do not change any wording. Only redesign the layout with more whitespace.", doc).kind, "design");
  assert.deepEqual(routeRevision("Use fewer images but add more diagrams", doc), { kind: "visuals", fewerImages: true, moreDiagrams: true });
  assert.equal(routeRevision("좀 더 좋게", doc).kind, "unknown");
});

test("the lint catches template writing", () => {
  const doc: LongDocument = {
    title: "t",
    subtitle: "",
    docType: "",
    design: { tone: "formal", accent: "#000000", density: "standard", numbering: true },
    sections: Array.from({ length: 4 }, (_, i) => ({
      id: `p${i}`,
      title: `섹션 ${i}`,
      level: 1,
      blocks: [
        { type: "paragraph" as const, text: "오늘날 급변하는 시장에서 혁신적인 최고의 솔루션으로 시너지를 극대화합니다. 오늘날 우리는 고객 중심의 가치를 만듭니다." },
        { type: "bullets" as const, items: ["a", "b"] },
        { type: "paragraph" as const, text: "결론적으로 최선을 다하겠습니다." },
      ],
      sourceRefs: [],
      status: "new" as const,
    })),
  };
  const r = lintDocument(doc);
  assert.ok(r.findings.some((f) => f.kind === "stock"));
  assert.ok(r.findings.some((f) => f.kind === "buzzword"));
  assert.ok(r.findings.some((f) => f.kind === "structure"));
  assert.ok(r.score > 35);
});
