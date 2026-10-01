import { test } from "node:test";
import assert from "node:assert/strict";
import { seedFromChain } from "./chain.ts";

const radar = {
  ideas: [
    { name: "보호자 상담", one_liner: "퇴원 후 2주", customer: { who: "보호자" }, problem: "무엇을 챙길지 모름", mvp: "카카오 상담", revenue: { model: "회당" } },
    { name: "간호 전자책", one_liner: "노하우", customer: { who: "간호학생" }, problem: "실무 공백", mvp: "PDF" },
  ],
  recommendation: { pick: "간호 전자책" },
};

test("idea-radar hands the picked idea on, or the recommended one", () => {
  assert.match(String(seedFromChain("mvp-blueprint", "idea-radar", radar, 0).idea), /보호자 상담/);
  assert.equal(seedFromChain("offer-architect", "idea-radar", radar, 0).target_customer, "보호자");
  assert.match(String(seedFromChain("revenue-mapper", "idea-radar", radar).idea), /간호 전자책/);
  assert.match(String(seedFromChain("revenue-mapper", "idea-radar", radar, 9).idea), /간호 전자책/);
  assert.deepEqual(seedFromChain("revenue-mapper", "idea-radar", {}), {});
});

test("revenue-mapper seeds prices; market-gap seeds the chosen gap", () => {
  const rev = { business_summary: "필라테스", ladder: [{ price_krw: 20000 }, { price_krw: 180000 }], unit_economics: { price_krw: 180000, variable_cost_krw: 60000 } };
  assert.equal(seedFromChain("offer-architect", "revenue-mapper", rev).price_max, 180000);
  assert.equal(seedFromChain("business-plan", "revenue-mapper", rev).variable_cost_rate, 33);
  const gap = { gaps: [{ title: "A", opportunity: "a" }, { title: "B", opportunity: "b" }] };
  assert.match(String(seedFromChain("mvp-blueprint", "market-gap", gap, 1).idea), /^B/);
});

test("legacy pairs still work", () => {
  assert.deepEqual(seedFromChain("calendar", "money", { models: [{ name: "클래스" }] }), { model: "클래스" });
});

test("brand-dna carries the brand's rules into logo, site and ads", () => {
  const dna = {
    essence: { one_line: "서두르지 않는 소아과" },
    positioning: { statement: "저녁에도 설명하는 소아과", for_whom: "맞벌이 부모" },
    voice: { tone_words: ["다정한", "차분한"] },
    visual: { mood_words: ["포근한"] },
    palette: [{ name: "새벽 하늘", hex: "#3B6E8F" }],
    typography: { heading: { family: "Gowun Dodum" } },
    _source_input: { brand_name: "온샘소아과" },
  };
  assert.deepEqual(seedFromChain("logo", "brand-dna", dna).keywords, ["포근한", "다정한", "차분한"]);
  assert.equal(seedFromChain("logo", "brand-dna", dna).brand_name, "온샘소아과");
  const site = String(seedFromChain("homepage", "brand-dna", dna).content);
  assert.match(site, /#3B6E8F/);
  assert.match(site, /Gowun Dodum/);
  assert.equal(seedFromChain("copy", "brand-dna", dna).audience, "맞벌이 부모");
  assert.equal(seedFromChain("brand-dna", "idea-radar", radar, 0).target_customer, "보호자");
});

test("campaign hand-offs: strategy → hooks, blog → transformer, hook → ads", () => {
  const strategy = { recommended_territory: "B", territories: [{ name: "A", idea: "a" }, { name: "B", idea: "퇴근길 5분", example_line: "5분이면 충분" }], segments: [{ name: "직장인" }] };
  assert.match(String(seedFromChain("hook-lab", "strategy", strategy).topic), /퇴근길 5분/);
  assert.equal(seedFromChain("hook-lab", "strategy", strategy).audience, "직장인");
  assert.deepEqual(seedFromChain("content-transformer", "blog", { body_markdown: "## 제목\n본문" }), { source: "## 제목\n본문", source_type: "blog" });
  assert.equal(seedFromChain("copy", "hook-lab", { best: { text: "오래 걷는 게 답이 아니에요" } }).offer, "오래 걷는 게 답이 아니에요");
});

test("meeting board hands its actions to the ops plan and SOP", () => {
  const m = { title: "주간 회의", summary: "요약", decisions: [{ decision: "목요일 촬영" }], actions: [{ task: "작가 섭외", owner: "준호", due: "" }, { task: "수수료 조사", owner: "소라", due: "2026-10-13" }] };
  const cal = seedFromChain("calendar", "meeting-action", m);
  assert.match(String(cal.model), /수수료 조사 \(소라, 2026-10-13\)/);
  assert.deepEqual(cal.milestones, ["목요일 촬영"]);
  assert.match(String(seedFromChain("sop-builder", "meeting-action", m).process), /작가 섭외 \(준호\)/);
});

test("research hand-offs carry real evidence forward", () => {
  const insights = { themes: [{ quotes: ["주문하고 5일 걸렸어요"] }, { quotes: ["포장이 고급스러워요"] }] };
  assert.equal(seedFromChain("persona-mapper", "insight-miner", insights).customer_data, "- 주문하고 5일 걸렸어요\n- 포장이 고급스러워요");
  const gap = { market_summary: "노견 돌봄", gaps: [{ title: "투약 돌봄", opportunity: "방문 투약" }], solutions: [{ name: "펫호텔" }] };
  assert.match(String(seedFromChain("market-desk", "market-gap", gap).question), /투약 돌봄/);
  assert.deepEqual(seedFromChain("competitor-lens", "market-gap", gap).competitors, ["펫호텔"]);
  const persona = { personas: [{ name: "서윤 엄마", age_range: "30대", situation: "맞벌이", quote: "퇴근하면 접수 끝", frustrations: ["대기"] }] };
  assert.equal(seedFromChain("hook-lab", "persona-mapper", persona).topic, "대기");
  assert.equal(seedFromChain("strategy", "persona-mapper", persona).customer_voice, "퇴근하면 접수 끝");
});
