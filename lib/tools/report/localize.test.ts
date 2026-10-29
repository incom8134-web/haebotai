import { test } from "node:test";
import assert from "node:assert/strict";
import { englishMoney, labelEn, localizeLabels } from "./localize.ts";
import { buildReport } from "./index.ts";

test("exact and templated labels", () => {
  assert.equal(labelEn("포지셔닝 맵"), "Positioning Map");
  assert.equal(labelEn("12개월 차"), "Month 12");
  assert.equal(labelEn("3주 차"), "Week 3");
  assert.equal(labelEn("  추정"), "  estimate");
  assert.equal(labelEn("Already English"), "Already English");
});

test("Korean money becomes ₩ figures", () => {
  assert.equal(englishMoney("1억 2,000만원"), "₩120M");
  assert.equal(englishMoney("3,500만 원"), "₩35M");
  assert.equal(englishMoney("12,000원"), "₩12,000");
  assert.equal(englishMoney("월 매출 800만원"), "월 매출 ₩8M");
});

test("Korean runs are untouched; colors and ids are kept", () => {
  const r = { title: "포지셔닝 맵", color: "#2F3E5C", id: "verdict" };
  assert.equal(localizeLabels(r, "ko"), r);
  assert.deepEqual(localizeLabels(r, "en"), { title: "Positioning Map", color: "#2F3E5C", id: "verdict" });
});

test("a real report's section titles come out in English", () => {
  const report = buildReport("trend", { summary: "s", recommended: "Dessert box", ideas: [{ name: "Dessert box", one_liner: "x", scores: { market_size: 7, growth: 6, margin: 5, personal_fit: 8, entry_barrier: 3, competition: 4, execution_difficulty: 3, capital_need: 2 }, composite: 7, demand_trend: [], target_customer: "t", entry_cost_krw: 5000000, price_gap: { band: "b", evidence: "e" }, differentiation_angles: [], verdict: "go", risks: [] }], signals: [] }, {});
  assert.ok(report);
  const en = localizeLabels(report!, "en");
  const all = JSON.stringify(en);
  const korean = all.match(/[가-힣]+/g) ?? [];
  assert.ok(korean.length < 6, `few Korean words left: ${korean.slice(0, 10).join(", ")}`);
});
