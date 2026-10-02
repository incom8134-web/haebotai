import { test } from "node:test";
import assert from "node:assert/strict";
import { clashes, differences, domainFor, normalizeCoords } from "./space.ts";
import { budgetProblem, parseStrategy, rejectedDefault, strategyBlock, strategySchema } from "./strategy.ts";
import { buildPlan, parsePlanChoice, planLabel, plannable, plannerSchema, validatePlan } from "./planner.ts";
import { defaultPlan, flowFor } from "./plan.ts";
import { criticPrompt } from "./critic.ts";
import { fingerprintOf, shapeNote } from "./diversity.ts";
import { intentBlock, parseIntent, INTENT_SCHEMA } from "./intent.ts";
import { signatureSimilarity } from "./skeleton.ts";
import type { AgentGuide } from "./library.ts";

const guide: AgentGuide = { objective: "o", decide: [], approaches: [{ id: "a1", name: "A", when: "", structure: "" }] };
const web = domainFor("homepage");

const raw = (coords: string[][], defaults: boolean[], chosen = 0, defaultReason = "") => ({
  considered: coords.map((c, i) => ({ approach_id: "custom", name: `후보${i}`, summary: `s${i}`, fit: 8 - i, why: "w", coords: c, obvious_default: defaults[i] })),
  chosen_index: chosen,
  rationale: "r",
  direction_id: "",
  direction_brief: "",
  blueprint: [{ part: "p", purpose: "q", notes: "" }],
  rubric: ["x"],
  emphasize: [],
  omit: [],
  default_reason: defaultReason,
});

test("every tool has a strategy space; unknown tools fall back to analysis", () => {
  assert.equal(domainFor("homepage").id, "web");
  assert.equal(domainFor("presentation").id, "deck");
  assert.equal(domainFor("business-plan").id, "document");
  assert.equal(domainFor("logo").id, "brand");
  assert.equal(domainFor("copy").id, "campaign");
  assert.equal(domainFor("market-desk").id, "analysis");
  for (const d of [web, domainFor("presentation")]) assert.ok(d.dimensions.length >= 3);
});

test("coordinates normalize and distances count differing dimensions", () => {
  assert.deepEqual(normalizeCoords([" Story ", "TRUST"], web), ["story", "trust", "", ""]);
  assert.equal(differences(["a", "b", "c"], ["a", "x", "c"]), 1);
  assert.deepEqual(clashes([["a", "b", "c", "d"], ["a", "b", "c", "x"], ["z", "y", "c", "d"]]), [[0, 1]]);
});

test("the schema asks for coordinates and an honest default only when a space is given", () => {
  const plain = JSON.stringify(strategySchema(["a1"], []));
  assert.ok(!plain.includes("obvious_default"));
  const spaced = strategySchema(["a1"], [], web) as unknown as { properties: { considered: { items: { required: string[]; properties: { coords: { minItems: number } } } } } };
  assert.ok(spaced.properties.considered.items.required.includes("obvious_default"));
  assert.equal(spaced.properties.considered.items.properties.coords.minItems, web.dimensions.length);
});

test("the creative budget: too-close candidates and an unnamed default are problems", () => {
  const close = parseStrategy(raw([["story", "trust", "sparse", "editorial"], ["story", "trust", "sparse", "data"], ["catalog", "evidence", "dense", "product-ui"]], [false, false, true]), guide, [], web)!;
  assert.match(budgetProblem(close.strategy)!, /후보0.*후보1/);
  const noDefault = parseStrategy(raw([["story", "trust", "sparse", "editorial"], ["catalog", "evidence", "dense", "data"], ["ia-first", "utility", "balanced", "typographic"]], [false, false, false]), guide, [], web)!;
  assert.match(budgetProblem(noDefault.strategy)!, /기본안이 표시되지/);
  const fine = parseStrategy(raw([["story", "trust", "sparse", "editorial"], ["catalog", "evidence", "dense", "data"], ["ia-first", "utility", "balanced", "typographic"]], [false, true, false]), guide, [], web)!;
  assert.equal(budgetProblem(fine.strategy), null);
  assert.deepEqual(rejectedDefault(fine.strategy), { name: "후보1", summary: "s1" });
  assert.match(strategyBlock(fine.strategy), /피할 뻔한 기본안: 후보1/);
  assert.equal(fine.strategy.domain, "web");
});

test("the default may win only with a reason", () => {
  const coords = [["story", "trust", "sparse", "editorial"], ["catalog", "evidence", "dense", "data"], ["ia-first", "utility", "balanced", "typographic"]];
  const noReason = parseStrategy(raw(coords, [true, false, false], 0), guide, [], web)!;
  assert.match(budgetProblem(noReason.strategy)!, /이유/);
  const withReason = parseStrategy(raw(coords, [true, false, false], 0, "대학 입학처는 정보구조가 정답"), guide, [], web)!;
  assert.equal(budgetProblem(withReason.strategy), null);
  assert.equal(rejectedDefault(withReason.strategy), null);
});

test("strategies from before v2 (no space) pass the budget check unchanged", () => {
  const old = parseStrategy(raw([["x"], ["y"], ["z"]], [false, false, false]), guide, [])!;
  assert.equal(old.strategy.considered[0].coords, undefined);
  assert.equal(budgetProblem(old.strategy), null);
});

test("intent keeps the model's working memo and shows it to every later step", () => {
  assert.ok((INTENT_SCHEMA.required as readonly string[]).includes("memo"));
  const parsed = parseIntent({ tone_words: "차분한", memo: "뻔한 기본안은 가격표 중심 랜딩인데, 전세기 고객은 가격을 공개하지 않는 걸 신뢰로 봅니다." })!;
  assert.match(intentBlock(parsed.intent), /작업 메모.*가격을 공개하지/);
  const old = parseIntent({ tone_words: "차분한" })!;
  assert.equal(old.intent.memo, undefined);
});

test("the planner reshapes research and the critic's budget, and keeps the rest", () => {
  assert.equal(plannable("copy", "google"), true);
  assert.equal(plannable("homepage", "google"), false);
  assert.equal(plannable("copy", "anthropic"), false);
  const base = defaultPlan("copy", "google");
  const choice = parsePlanChoice({ research: ["analyze_competitors", "research_audience", "bogus", "analyze_competitors"], revisions: 5, critic_focus: ["대학생이 3초 안에 혜택을 이해하는가"], reason: "차별화가 핵심" }, true)!;
  assert.deepEqual(choice.research, ["analyze_competitors", "research_audience"]);
  assert.equal(choice.revisions, 2);
  const plan = buildPlan(base, choice);
  assert.deepEqual(plan.steps.map((s) => s.id), ["understand", "analyze", "contract", "strategize", "planning", "competitors", "audience", "draft", "critique", "revise", "polish"]);
  assert.equal(plan.source, "planner");
  assert.deepEqual(plan.steps.find((s) => s.id === "critique")!.args, { maxRevisions: 2, focus: ["대학생이 3초 안에 혜택을 이해하는가"] });
  assert.equal(flowFor(plan, "planning")!.next, "competitors");
  assert.match(planLabel(plan), /경쟁·대안 분석 → 고객 언어·행동 조사 → 초안 → 검토\(최대 2회 고침\)/);
  const known = new Set(plan.steps.map((s) => s.capability));
  assert.deepEqual(validatePlan(plan, known), []);
});

test("no research when the planner says none, or the tool can't search", () => {
  const base = defaultPlan("sop-builder", "google");
  const none = buildPlan(base, parsePlanChoice({ research: [], revisions: 1, critic_focus: [], reason: "" }, true)!);
  assert.ok(!none.steps.some((s) => s.id === "research"));
  assert.equal(flowFor(none, "planning")!.next, "draft");
  assert.deepEqual(parsePlanChoice({ research: ["research_topic"], revisions: 1, critic_focus: [], reason: "" }, false)!.research, []);
  assert.ok(!("research" in (plannerSchema(false) as { properties: object }).properties));
});

test("invalid plans are caught", () => {
  const base = defaultPlan("copy", "google");
  const known = new Set(base.steps.map((s) => s.capability));
  assert.deepEqual(validatePlan(base, known), []);
  assert.ok(validatePlan({ ...base, steps: [...base.steps, { id: "draft", capability: "write_draft" }] }, known).some((e) => e.includes("duplicate")));
  assert.ok(validatePlan({ ...base, steps: base.steps.slice(0, -1) }, known).some((e) => e.includes("finishing")));
  assert.ok(validatePlan({ ...base, steps: base.steps.filter((s) => s.id !== "critique") }, known).some((e) => e.includes("without critique")));
  assert.ok(validatePlan({ ...base, steps: [{ id: "x", capability: "nope" }, ...base.steps] }, known).some((e) => e.includes("unknown")));
});

test("the critic gets the planner's focus and the template check", () => {
  const p = criticPrompt({ toolName: "t", intentText: "", strategy: null, draft: "{}", focus: ["심사위원 기준"], avoidDefault: { name: "표준 랜딩", summary: "히어로→기능→후기→가격" } });
  assert.match(p, /특히 볼 것\]\n- 심사위원 기준/);
  assert.match(p, /템플릿 점검.*표준 랜딩/);
  assert.doesNotMatch(criticPrompt({ toolName: "t", intentText: "", strategy: null, draft: "{}" }), /템플릿 점검/);
});

test("fingerprints carry position and shape; a repeated shape is flagged to the critic", () => {
  const s = parseStrategy(raw([["story", "trust", "sparse", "editorial"], ["catalog", "evidence", "dense", "data"], ["ia-first", "utility", "balanced", "typographic"]], [false, true, false]), guide, [], web)!.strategy;
  const fp = fingerprintOf(s, null, ["slides:layout=points×6"])!;
  assert.deepEqual(fp.coords, ["story", "trust", "sparse", "editorial"]);
  assert.deepEqual(fp.shape, ["slides:layout=points×6"]);
  assert.equal(signatureSimilarity(["a×3", "b"], ["a", "a", "a", "b"]), 1);
  assert.ok(shapeNote(["slides:layout=points×6"], [fp]));
  assert.equal(shapeNote(["slides:layout=chart", "slides:layout=quote×2"], [fp]), null);
  assert.equal(shapeNote(undefined, [fp]), null);
});
