import assert from "node:assert";
import { test } from "node:test";
import { ideaResearchMarkdown, readIdeas } from "./idea-radar.ts";

const idea = (name: string, s: number, extra: Record<string, unknown> = {}) => ({
  name,
  one_liner: `${name} 한 줄`,
  archetype: "service",
  customer: { who: "보호자", situation: "퇴원 직후" },
  problem: "무엇을 챙길지 모름",
  value_proposition: "2주 체크리스트",
  why_you: "병동 8년",
  revenue: { model: "상담", price_hint: "회당 3만 원", potential_note: "월 100만 원" },
  mvp: "카카오 상담",
  resources: ["상담 예약 폼"],
  first_validation: { action: "맘카페 체크리스트", success_signal: "7일 20건", days: 7 },
  scores: { fit: s, demand: s, speed: s, capital: s, edge: s },
  risks: ["의료 행위 오해"],
  ...extra,
});

test("the 100-point scale: five axes of up to 20, totals out of 100", () => {
  const ideas = readIdeas({ scoring: "100", ideas: [idea("A", 18), idea("B", 12)] });
  assert.deepEqual(ideas.map((i) => i.total), [90, 60]);
  assert.equal(readIdeas({ scoring: "100", ideas: [idea("A", 25)] })[0].scores[0], 20); // clamped
});

test("older runs scored 1–10 per axis and are scaled up to the same 100", () => {
  const ideas = readIdeas({ ideas: [idea("A", 9), idea("B", 5)] });
  assert.deepEqual(ideas.map((i) => i.total), [90, 50]);
});

test("the market-research brief follows the recommended idea and marks estimates", () => {
  const md = ideaResearchMarkdown(
    { scoring: "100", summary: "s", ideas: [idea("보호자 상담", 14), idea("간호 전자책", 18)], recommendation: { pick: "보호자 상담", reason: "가장 빠름" } },
    { skills: "병동 간호사 8년", interests: ["건강 교육"], budget: "3m", location: "대구" },
    new Date("2026-11-05T03:00:00Z"),
  );
  assert.match(md, /^# 시장 조사: 보호자 상담/);
  assert.match(md, /2026-11-05/);
  assert.match(md, /총점\*\*: 70\/100/);
  assert.match(md, /회당 3만 원 \(추정\)/);
  assert.match(md, /병동 간호사 8년/);
  assert.match(md, /~300만원/);
  assert.match(md, /대구에서 이 고객은/);
  assert.match(md, /간호 전자책\*\* — 90\/100/);
});

test("no ideas, no brief", () => {
  assert.equal(ideaResearchMarkdown({ ideas: [] }), "");
});
