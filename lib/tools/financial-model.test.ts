import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFinancialModel, computeFinancials } from "./financial-model.ts";

const PLAN = {
  unit_price_krw: 6500,
  monthly_volume_start: 1500,
  monthly_growth_pct: 6,
  yearly_growth_pct: 20,
  variable_cost_pct: 35,
  fixed_cost_monthly_krw: 9_000_000,
  initial_investment_krw: 60_000_000,
  notes: ["동네 카페 평균 객단가"],
};

test("year 1 is exactly the sum of its twelve months", () => {
  const m = computeFinancials(PLAN)!;
  assert.equal(m.monthly_revenue_krw.length, 12);
  assert.equal(m.yearly.length, 3);
  const sum = m.months.slice(0, 12).reduce((a, x) => a + x.revenue, 0);
  assert.equal(m.yearly[0].revenue_krw, Math.round(sum));
});

test("breakeven is the first month with a non-negative operating profit, payback includes the investment", () => {
  const m = computeFinancials(PLAN)!;
  const first = m.months.find((x) => x.profit >= 0)!;
  assert.equal(m.breakeven_month, first.month);
  assert.ok(m.payback_month === 0 || m.payback_month >= m.breakeven_month);
});

test("the member's own figures win over the plan's assumptions", () => {
  const m = computeFinancials(PLAN, { unit_price: 8000, monthly_sales_target: 3000, fixed_cost: 5_000_000, variable_cost_rate: 30 })!;
  assert.equal(m.assumptions.unit_price_krw, 8000);
  assert.equal(Math.round(m.months[11].volume), 3000, "the target is month 12");
  assert.equal(m.assumptions.fixed_cost_monthly_krw, 5_000_000);
  assert.equal(m.assumptions.variable_cost_pct, 30);
  assert.equal(m.assumptions.source.unit_price_krw, "member");
  assert.equal(m.assumptions.source.yearly_growth_pct, "plan");
});

test("no price or no volume: no model (the plan keeps whatever it had)", () => {
  assert.equal(computeFinancials({ ...PLAN, unit_price_krw: 0 }), null);
  assert.equal(computeFinancials(null), null);
  const out = { title: "x" };
  assert.deepEqual(applyFinancialModel(out, {}), out);
});

test("applying the model writes the fields the report and xlsx read", () => {
  const out = applyFinancialModel({ title: "x", financial_assumptions: PLAN }, {}) as { financials: { yearly: unknown[]; monthly_revenue_krw: number[]; assumptions: string[]; breakeven_month: number; computed: boolean } };
  assert.equal(out.financials.yearly.length, 3);
  assert.equal(out.financials.monthly_revenue_krw.length, 12);
  assert.ok(out.financials.assumptions.some((l) => l.includes("객단가")));
  assert.equal(out.financials.computed, true);
});
