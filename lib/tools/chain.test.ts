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
