import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, list, num, obj, objs, PALETTES, pct, str, strs, sum } from "./util.ts";

// 수익 모델: three business models compared like a financial planner
// would — a side-by-side table, 12-month revenue curves, a cumulative
// profit line that shows when each one pays back its start-up cost,
// then each model's unit economics, cost breakdown and first 30 days.

export function moneyReport(o: Record<string, unknown>): Report {
  const models = objs(o.models)
    .map((m, i) => {
      const ue = obj(m.unit_economics);
      const price = num(ue.price_krw);
      const unitCost = num(ue.unit_cost_krw);
      const revenue = list(m.monthly_revenue_krw).map(num);
      const monthlyCost = num(m.monthly_cost_krw);
      const marginRate = price > 0 ? clamp((price - unitCost) / price, 0, 1) : 1;
      const startup = num(m.startup_cost_krw);
      const cumulative = [-startup];
      revenue.forEach((r) => cumulative.push(cumulative[cumulative.length - 1] + r * marginRate - monthlyCost));
      return {
        rank: num(m.rank) || i + 1,
        name: str(m.name),
        tagline: str(m.tagline),
        fit: str(m.fit_reason),
        cites: strs(m.fit_cites),
        days: objs(m.first_30_days).map((d) => ({ day: num(d.day), title: str(d.title) })).filter((d) => d.title),
        startup,
        breakdown: objs(m.cost_breakdown).map((c) => ({ item: str(c.item), amount: num(c.amount_krw) })).filter((c) => c.item && c.amount > 0),
        monthlyCost,
        revenue,
        cumulative,
        price,
        unitCost,
        marginRate,
        units: num(ue.monthly_units_target),
        hours: num(m.weekly_hours),
        breakeven: num(m.breakeven_months),
        difficulty: clamp(num(m.difficulty), 0, 5),
        gaps: strs(m.skill_gaps),
      };
    })
    .filter((m) => m.name)
    .sort((a, b) => a.rank - b.rank);

  const hasCurves = models.some((m) => m.revenue.length >= 6);
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}개월`);
  const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
  const sections: ReportSection[] = [];

  sections.push({
    id: "compare",
    kicker: "비교",
    title: "세 가지 길, 한눈에",
    lead: str(o.summary) || undefined,
    blocks: keep([
      models.length > 0 && {
        type: "table",
        header: ["", ...models.map((m) => `${m.rank}. ${m.name}`)],
        align: ["l", ...models.map(() => "r" as const)],
        rows: [
          ["초기 비용", ...models.map((m) => fmt(m.startup, "원"))],
          ...(models.some((m) => m.monthlyCost) ? [["월 운영비", ...models.map((m) => fmt(m.monthlyCost, "원"))]] : []),
          ...(hasCurves ? [["12개월 차 월매출", ...models.map((m) => fmt(m.revenue[11] ?? m.revenue[m.revenue.length - 1] ?? 0, "원"))]] : []),
          ...(hasCurves ? [["첫해 매출 합계", ...models.map((m) => fmt(sum(m.revenue), "원"))]] : []),
          ["손익분기", ...models.map((m) => (m.breakeven ? `${m.breakeven}개월` : "—"))],
          ["난이도", ...models.map((m) => stars(m.difficulty))],
          ...(models.some((m) => m.hours) ? [["주당 시간", ...models.map((m) => `${m.hours}시간`)]] : []),
        ],
      },
      models.length > 0 && {
        type: "chart",
        title: "초기 비용",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: models.map((m) => m.name), series: [{ name: "초기 비용", values: models.map((m) => m.startup) }], unit: "원" },
      },
      models.length > 0 && {
        type: "chart",
        title: "손익분기까지",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: models.map((m) => m.name), series: [{ name: "손익분기", values: models.map((m) => m.breakeven) }], unit: "개월" },
      },
    ]),
  });

  if (hasCurves) {
    sections.push({
      id: "curves",
      kicker: "12개월 전망",
      title: "매출은 어떻게 자라나",
      blocks: keep([
        {
          type: "chart",
          title: "월 매출 추정",
          chart: { kind: "line", categories: months, series: models.map((m) => ({ name: m.name, values: m.revenue.slice(0, 12) })), unit: "원", area: false },
          estimated: true,
        },
        {
          type: "chart",
          title: "누적 손익 — 0을 넘는 달이 투자 회수 시점",
          chart: { kind: "line", categories: ["시작", ...months], series: models.map((m) => ({ name: m.name, values: m.cumulative.slice(0, 13) })), unit: "원", area: false },
          caption: "누적 손익 = −초기 비용 + Σ(월 매출 × 마진율 − 월 운영비). 마진율은 단가와 건당 원가로 계산했습니다.",
          estimated: true,
        },
      ]),
    });
  }

  models.forEach((m, i) => {
    sections.push({
      id: `model-${i}`,
      kicker: `${m.rank}순위`,
      title: m.name,
      lead: m.tagline || undefined,
      blocks: keep([
        m.price > 0 && {
          type: "kpis",
          items: [
            { label: "단가", value: fmt(m.price, "원") },
            { label: "건당 원가", value: fmt(m.unitCost, "원") },
            { label: "마진율", value: pct(m.marginRate * 100), tone: m.marginRate >= 0.5 ? ("up" as const) : ("neutral" as const) },
            { label: "월 목표 판매", value: fmt(m.units, "건") },
          ],
        },
        { type: "text", title: "왜 당신에게 맞나", text: m.fit },
        m.cites.length > 0 && { type: "bullets", items: m.cites.map((c) => `“${c}”`) },
        m.breakdown.length > 0 && {
          type: "chart",
          title: "초기 비용 구성",
          half: true,
          chart: { kind: "donut", slices: m.breakdown.map((c) => ({ label: c.item, value: c.amount })), unit: "원", center: { value: fmt(m.startup || sum(m.breakdown.map((c) => c.amount)), "원"), label: "초기 비용" } },
        },
        m.days.length > 0 && {
          type: "bullets",
          title: "첫 30일",
          half: true,
          style: "num",
          items: m.days.sort((a, b) => a.day - b.day).map((d) => `D${d.day} · ${d.title}`),
        },
        m.gaps.length > 0 && { type: "bullets", title: "채워야 할 역량", style: "check", items: m.gaps },
      ]),
    });
  });

  const fastest = models.filter((m) => m.breakeven > 0).sort((a, b) => a.breakeven - b.breakeven)[0];
  const cheapest = [...models].sort((a, b) => a.startup - b.startup)[0];
  const biggest = hasCurves ? [...models].sort((a, b) => (b.revenue[11] ?? 0) - (a.revenue[11] ?? 0))[0] : undefined;
  return {
    palette: PALETTES.money,
    hero: {
      eyebrow: "수익 모델 설계",
      title: models[0] ? `1순위: ${models[0].name}` : "수익 모델 추천",
      subtitle: models[0]?.tagline || undefined,
      kpis: [
        cheapest ? { label: "가장 적은 초기 비용", value: fmt(cheapest.startup, "원"), note: cheapest.name } : null,
        fastest ? { label: "가장 빠른 손익분기", value: `${fastest.breakeven}개월`, note: fastest.name, tone: "up" as const } : null,
        biggest ? { label: "12개월 차 최대 월매출", value: fmt(biggest.revenue[11] ?? 0, "원"), note: biggest.name } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
