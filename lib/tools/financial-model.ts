// The business plan's numbers, computed — not written by the model
// (docs/ai-architecture-proposal.md §5). The model proposes assumptions
// (price, first-month volume, growth, cost structure, investment) and
// explains them; this turns them into the first-year monthly curve, the
// 3-year P&L and the breakeven month, deterministically. The member's own
// figures from the form always win over the model's assumptions, and the
// .xlsx export rebuilds the same model with live formulas
// (lib/tools/export/xlsx.ts), so the document, the charts and the
// spreadsheet agree.

export interface FinancialAssumptions {
  unit_price_krw: number;
  /** Units (or customers × purchases) sold in month 1. */
  monthly_volume_start: number;
  /** Month-over-month volume growth during year 1, percent. */
  monthly_growth_pct: number;
  /** Volume growth of year 2 over the month-12 run rate, and of year 3 over year 2, percent. */
  yearly_growth_pct: number;
  /** Variable cost as a percent of revenue (ingredients, fees, shipping…). */
  variable_cost_pct: number;
  /** Fixed costs per month (rent, salaries, subscriptions…). */
  fixed_cost_monthly_krw: number;
  /** Upfront investment (deposit, fit-out, equipment…), for payback. */
  initial_investment_krw: number;
  notes: string[];
}

export interface MemberFigures {
  unit_price?: number;
  /** The member's monthly sales target: read as the month-12 volume. */
  monthly_sales_target?: number;
  fixed_cost?: number;
  variable_cost_rate?: number;
}

export interface FinancialModel {
  assumptions: FinancialAssumptions & { source: Record<keyof Omit<FinancialAssumptions, "notes">, "member" | "plan"> };
  months: { month: number; volume: number; revenue: number; variable: number; fixed: number; profit: number; cumulative: number }[];
  yearly: { year: string; revenue_krw: number; cost_krw: number; customers: number }[];
  monthly_revenue_krw: number[];
  breakeven_month: number;
  payback_month: number;
  lines: string[];
}

const pos = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function computeFinancials(planned: Partial<FinancialAssumptions> | null | undefined, member: MemberFigures = {}): FinancialModel | null {
  const p = planned ?? {};
  const price = pos(member.unit_price) ?? pos(p.unit_price_krw);
  const target = pos(member.monthly_sales_target);
  let start = pos(p.monthly_volume_start);
  let growth = clampNum(typeof p.monthly_growth_pct === "number" && Number.isFinite(p.monthly_growth_pct) ? p.monthly_growth_pct : 5, -20, 60) / 100;
  if (!price || (!start && !target)) return null;
  // A member target is month 12: ramp to it from the plan's start, or —
  // when the plan starts at (or above) the target, which a new business
  // rarely does — from half of it.
  if (target) {
    if (!start || start >= target) start = Math.max(1, Math.round(target * 0.5));
    growth = start === target ? 0 : Math.pow(target / start, 1 / 11) - 1;
  }
  const s = start!;
  const variablePct = clampNum(member.variable_cost_rate !== undefined && Number.isFinite(member.variable_cost_rate) ? member.variable_cost_rate : typeof p.variable_cost_pct === "number" ? p.variable_cost_pct : 40, 0, 100);
  const fixed = pos(member.fixed_cost) ?? (typeof p.fixed_cost_monthly_krw === "number" && p.fixed_cost_monthly_krw >= 0 ? p.fixed_cost_monthly_krw : 0);
  const yearlyGrowth = clampNum(typeof p.yearly_growth_pct === "number" && Number.isFinite(p.yearly_growth_pct) ? p.yearly_growth_pct : 15, -50, 300) / 100;
  const investment = typeof p.initial_investment_krw === "number" && p.initial_investment_krw > 0 ? p.initial_investment_krw : 0;

  const months: FinancialModel["months"] = [];
  let cumulative = -investment;
  const monthOf = (month: number, volume: number) => {
    const revenue = volume * price;
    const variable = (revenue * variablePct) / 100;
    const profit = revenue - variable - fixed;
    cumulative += profit;
    return { month, volume, revenue, variable, fixed, profit, cumulative };
  };
  for (let m = 1; m <= 12; m++) months.push(monthOf(m, s * Math.pow(1 + growth, m - 1)));
  const y2Volume = months[11].volume * (1 + yearlyGrowth);
  const y3Volume = y2Volume * (1 + yearlyGrowth);
  for (let m = 13; m <= 36; m++) months.push(monthOf(m, m <= 24 ? y2Volume : y3Volume));

  const yearOf = (i: number) => {
    const slice = months.slice(i * 12, i * 12 + 12);
    const revenue = slice.reduce((a, m) => a + m.revenue, 0);
    const cost = slice.reduce((a, m) => a + m.variable + m.fixed, 0);
    return { year: `${i + 1}년 차`, revenue_krw: Math.round(revenue), cost_krw: Math.round(cost), customers: 0 };
  };
  const breakeven = months.find((m) => m.profit >= 0)?.month ?? 0;
  const payback = months.find((m) => m.cumulative >= 0)?.month ?? 0;

  const source = {
    unit_price_krw: pos(member.unit_price) ? "member" : "plan",
    monthly_volume_start: target ? "member" : "plan",
    monthly_growth_pct: target ? "member" : "plan",
    yearly_growth_pct: "plan",
    variable_cost_pct: member.variable_cost_rate !== undefined ? "member" : "plan",
    fixed_cost_monthly_krw: pos(member.fixed_cost) ? "member" : "plan",
    initial_investment_krw: "plan",
  } as const;
  const mark = (k: keyof typeof source) => (source[k] === "member" ? "입력값" : "가정");
  const lines = [
    `객단가 ${won(price)} (${mark("unit_price_krw")})`,
    `첫 달 판매량 ${Math.round(s).toLocaleString("ko-KR")}개, 월 ${(growth * 100).toFixed(1)}% 성장${target ? ` → 12개월 차 목표 ${Math.round(target).toLocaleString("ko-KR")}개 (입력값)` : " (가정)"}`,
    `변동비율 ${variablePct}% (${mark("variable_cost_pct")}), 월 고정비 ${won(fixed)} (${mark("fixed_cost_monthly_krw")})`,
    `2·3년 차 판매량 연 ${(yearlyGrowth * 100).toFixed(0)}% 성장 (가정)`,
    ...(investment ? [`초기 투자 ${won(investment)} (가정)${payback ? ` — 누적 회수 ${payback}개월 차` : " — 3년 안에 회수되지 않음"}`] : []),
    ...(p.notes ?? []).filter((n) => typeof n === "string" && n.trim()).slice(0, 6),
  ];
  return {
    assumptions: {
      unit_price_krw: price,
      monthly_volume_start: s,
      monthly_growth_pct: growth * 100,
      yearly_growth_pct: yearlyGrowth * 100,
      variable_cost_pct: variablePct,
      fixed_cost_monthly_krw: fixed,
      initial_investment_krw: investment,
      notes: (p.notes ?? []).slice(0, 6),
      source,
    },
    months,
    yearly: [yearOf(0), yearOf(1), yearOf(2)],
    monthly_revenue_krw: months.slice(0, 12).map((m) => Math.round(m.revenue)),
    breakeven_month: breakeven,
    payback_month: payback,
    lines,
  };
}

/** Replaces the plan's financials with the computed model (when the plan has usable assumptions). */
export function applyFinancialModel(output: Record<string, unknown>, member: MemberFigures): Record<string, unknown> {
  const model = computeFinancials(output.financial_assumptions as Partial<FinancialAssumptions> | undefined, member);
  if (!model) return output;
  return {
    ...output,
    financial_assumptions: { ...(output.financial_assumptions as object), ...model.assumptions },
    financials: {
      yearly: model.yearly,
      monthly_revenue_krw: model.monthly_revenue_krw,
      assumptions: model.lines,
      breakeven_month: model.breakeven_month,
      payback_month: model.payback_month,
      computed: true,
    },
  };
}
