import { test } from "node:test";
import assert from "node:assert/strict";
import { intentBlock, intentToBrief, parseIntent, resolveAnswers, MAX_QUESTIONS } from "./intent.ts";
import { parseStrategy, strategyBlock, strategySchema, MIN_CONSIDERED } from "./strategy.ts";
import { parseCritique, pickBest, revisionBlock, PASS_SCORE, clip } from "./critic.ts";
import { fingerprintOf, samenessNote, similarity } from "./diversity.ts";
import { AGENT_GUIDES, guideFor } from "./library.ts";
import { parseAgentRequest } from "./request.ts";
import { runMeta } from "./meta.ts";
import type { AgentRunState, Strategy } from "./types.ts";

const RAW_INTENT = {
  subject: "한결 법률사무소",
  uses_profile: false,
  kind: "이혼 전문 법률사무소의 상담 예약 사이트",
  audience: ["이혼을 고민하는 30~50대"],
  goal: "상담 예약",
  positioning: "비밀 보장과 차분한 동행",
  tone_words: "차분하고 신뢰감 있는",
  formality: "formal",
  energy: "calm",
  must_include: ["첫 상담 30분 무료"],
  avoid: ["장난스러운 스타일"],
  unknowns: [
    { item: "상담 방식", critical: false, assumption: "방문·전화 상담" },
    { item: "사이트 언어", critical: true, assumption: "한국어" },
  ],
  questions: [
    { question: "영문 페이지도 필요한가요?", options: ["한국어만", "한국어+영어"], default_index: 0 },
    { question: "q2", options: ["a", "b"], default_index: 9 },
    { question: "q3", options: ["a", "b"], default_index: 1 },
    { question: "q4", options: ["a", "b"], default_index: 1 },
    { question: "no options", options: ["only"], default_index: 0 },
  ],
  summary: "강남 이혼 전문 법률사무소의 신뢰 중심 상담 예약 사이트",
};

test("intent: parsed, bounded, and questions capped with valid defaults", () => {
  const r = parseIntent(RAW_INTENT)!;
  assert.equal(r.intent.subject, "한결 법률사무소");
  assert.equal(r.intent.usesProfile, false);
  assert.equal(r.intent.tone.formality, "formal");
  assert.ok(r.questions.length <= MAX_QUESTIONS);
  assert.equal(r.questions[1].defaultIndex, 0, "an out-of-range default falls back to the first option");
  assert.ok(r.questions.every((q) => q.options.length >= 2));
});

test("intent: no critical unknown → no questions, whatever the model asked", () => {
  const r = parseIntent({ ...RAW_INTENT, unknowns: [{ item: "x", critical: false, assumption: "y" }] })!;
  assert.equal(r.questions.length, 0);
});

test("intent: skipped questions resolve to their defaults; typed answers win", () => {
  const { questions } = parseIntent(RAW_INTENT)!;
  const a = resolveAnswers(questions, { q1: "" , q3: "직접 쓴 답" });
  assert.equal(a[0].answer, "한국어만");
  assert.equal(a[2].answer, "직접 쓴 답");
});

test("intent → the brief every prompt reads, and the understanding block", () => {
  const { intent } = parseIntent(RAW_INTENT)!;
  const b = intentToBrief(intent);
  assert.equal(b.tone, "차분하고 신뢰감 있는");
  assert.equal(b.usesProfile, false);
  const block = intentBlock(intent, [{ question: "영문 페이지도 필요한가요?", answer: "한국어만" }]);
  assert.match(block, /첫 상담 30분 무료/);
  assert.match(block, /한국어만/);
  assert.match(block, /방문·전화 상담/, "non-critical assumptions stay");
  assert.doesNotMatch(block, /사이트 언어 → 한국어/, "an answered critical unknown is not repeated as an assumption");
});

test("every agent guide offers at least three materially different approaches", () => {
  for (const [id, g] of Object.entries(AGENT_GUIDES)) {
    assert.ok(g.approaches.length >= MIN_CONSIDERED, id);
    assert.equal(new Set(g.approaches.map((a) => a.id)).size, g.approaches.length, `${id}: duplicate ids`);
    assert.equal(new Set(g.approaches.map((a) => a.structure)).size, g.approaches.length, `${id}: two approaches share a structure`);
  }
  assert.ok(guideFor("unknown-tool").approaches.length >= MIN_CONSIDERED);
});

test("strategy schema requires at least three alternatives", () => {
  const s = strategySchema(["a"], ["d"]);
  assert.equal(s.properties.considered.minItems, MIN_CONSIDERED);
});

const RAW_STRATEGY = {
  considered: [
    { approach_id: "desire-first", name: "욕망 먼저", summary: "감각적 장면", fit: 3, why: "법률 상담에 안 맞음" },
    { approach_id: "trust-first", name: "신뢰 먼저", summary: "전문성 → 절차 → 예약", fit: 9, why: "불안한 방문자" },
    { approach_id: "custom", name: "질문으로 시작", summary: "자가진단 → 상담", fit: 7, why: "참여 유도" },
  ],
  chosen_index: 1,
  rationale: "방문자가 불안하고 신중해 신뢰를 먼저 증명해야 합니다.",
  direction_id: "calm-trust",
  direction_brief: "여백이 넓고 차분한 네이비.",
  blueprint: [
    { part: "첫 화면", purpose: "전문성과 비밀 보장", notes: "대표 변호사 소개" },
    { part: "절차와 비용", purpose: "투명성", notes: "[입력 필요]" },
    { part: "상담 예약", purpose: "행동", notes: "폼" },
  ],
  rubric: ["첫 화면에서 비밀 보장이 보인다", "가격을 지어내지 않는다", "예약까지 두 번의 클릭", "톤이 차분하다"],
  emphasize: ["비밀 보장"],
  omit: ["후기 캐러셀"],
};

test("strategy: parsed with the chosen approach, library id and direction", () => {
  const guide = guideFor("homepage");
  const r = parseStrategy(RAW_STRATEGY, guide, [{ id: "calm-trust", name: "차분한 신뢰", brief: "밝은 배경" }])!;
  assert.equal(r.strategy.chosen, "신뢰 먼저");
  assert.equal(r.strategy.libraryId, "trust-first");
  assert.equal(r.strategy.considered.length, 3);
  assert.equal(r.direction?.id, "calm-trust");
  assert.match(r.direction!.brief, /네이비/);
  const block = strategyBlock(r.strategy);
  assert.match(block, /1\. 첫 화면/);
  assert.match(block, /빼기.*후기 캐러셀/);
});

test("strategy: a bad index falls back to the best fit; a custom direction is kept", () => {
  const r = parseStrategy({ ...RAW_STRATEGY, chosen_index: 99, direction_id: "custom" }, guideFor("homepage"), [])!;
  assert.equal(r.strategy.chosen, "신뢰 먼저");
  assert.equal(r.direction?.id, "custom");
  assert.equal(parseStrategy({ ...RAW_STRATEGY, blueprint: [] }, guideFor("homepage"), []), null);
});

test("critic: issues sorted by severity; pass needs the score and no high issue", () => {
  const c = parseCritique({ score: 90, issues: [{ severity: "low", type: "tone", where: "a", problem: "p", fix: "f" }, { severity: "high", type: "fact", where: "b", problem: "p2", fix: "f2" }], strengths: ["s"] })!;
  assert.equal(c.issues[0].severity, "high");
  assert.equal(c.verdict, "revise");
  const ok = parseCritique({ score: PASS_SCORE, issues: [{ severity: "medium", type: "cta", where: "a", problem: "p", fix: "f" }], strengths: [] })!;
  assert.equal(ok.verdict, "pass");
  assert.match(revisionBlock(c), /구조가 문제라면/);
});

test("critic: the best version wins, ties go to the later one", () => {
  assert.equal(pickBest([{ value: "draft", score: 70 }, { value: "rev1", score: 85 }, { value: "rev2", score: 80 }]), "rev1");
  assert.equal(pickBest([{ value: "draft", score: 80 }, { value: "rev1", score: 80 }]), "rev1");
  assert.equal(pickBest([{ value: "draft", score: null }]), "draft");
  assert.ok(clip("x".repeat(100), 20).length < 40);
});

const STRATEGY: Strategy = { considered: [], chosen: "신뢰 먼저", rationale: "", blueprint: [{ part: "첫 화면 전문성", purpose: "", notes: "" }, { part: "절차와 비용", purpose: "", notes: "" }], rubric: [], emphasize: [], omit: [] };

test("diversity: same strategy, direction and structure → a sameness note; different → none", () => {
  const fp = fingerprintOf(STRATEGY, "calm-trust")!;
  assert.equal(similarity(fp, fp), 1);
  assert.ok(samenessNote(fp, [fp]));
  assert.equal(samenessNote(fp, [{ ...fp, direction: "editorial" }]), null);
  assert.equal(samenessNote(fp, [{ ...fp, parts: ["메뉴", "지도"] }]), null);
  assert.equal(samenessNote(null, [fp]), null);
});

test("agent request from the page: valid parts kept, malformed dropped", () => {
  const { intent } = parseIntent(RAW_INTENT)!;
  const ok = parseAgentRequest({ agent: { intent, answers: [{ question: "q", answer: "a" }], strategyOverride: "신뢰 먼저" } });
  assert.equal(ok.intent?.subject, "한결 법률사무소");
  assert.equal(ok.answers.length, 1);
  assert.equal(ok.strategyOverride, "신뢰 먼저");
  assert.deepEqual(parseAgentRequest({ agent: { intent: { subject: 1 } } }), { intent: null, answers: [], strategyOverride: null });
  assert.deepEqual(parseAgentRequest(null), { intent: null, answers: [], strategyOverride: null });
});

test("run meta: strategy with alternatives, assumptions, review rounds, fingerprint", () => {
  const { intent } = parseIntent(RAW_INTENT)!;
  const state = {
    intent,
    answers: [],
    strategy: { ...STRATEGY, considered: [{ name: "신뢰 먼저", summary: "", fit: 9, why: "" }, { name: "욕망 먼저", summary: "", fit: 3, why: "" }] },
    work: { critiques: [{ score: 70, verdict: "revise", issues: [{}, {}], strengths: [] }, { score: 88, verdict: "pass", issues: [], strengths: [] }], direction: { id: "calm-trust", name: "차분한 신뢰" } },
    events: [{ kind: "stage", stage: "draft", status: "done", label: { ko: "초안", en: "Draft" }, at: "" }],
  } as unknown as AgentRunState;
  const m = runMeta(state);
  assert.equal(m.strategy?.considered.length, 2);
  assert.deepEqual(m.review, { rounds: 2, scores: [70, 88], fixed: 2 });
  assert.ok(m.assumptions.some((a) => a.includes("방문·전화 상담")));
  assert.equal(m.fingerprint?.direction, "calm-trust");
  assert.equal(m.steps.length, 1);
});
