import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "./index.ts";
import { fmt, PRINT_THEME, renderChart, textWidth } from "./charts.ts";
import { reportBlocks } from "../export/document.ts";
import { chartTable } from "../export/markdown.ts";
import type { Report } from "./types.ts";

const SAMPLES: Record<string, { output: Record<string, unknown>; input?: Record<string, unknown> }> = {
  "business-plan": {
    output: {
      title: "달빛 딸기공방",
      one_liner: "퇴근길 직장인에게 당일 딸기 디저트를 예약 픽업으로 판다",
      sections: { summary: "요약", problem: "문제", solution: "해결", product: "제품", business_model: "모델", team: "팀" },
      market_analysis: {
        tam: { value_krw: 3.2e12, basis: "국내 디저트" },
        sam: { value_krw: 4.8e11, basis: "서울 수제" },
        som: { value_krw: 1.2e9, basis: "성동구" },
        size: "3.2조원",
        growth: "연 6%",
        cagr_pct: 6.1,
        trends: ["픽업 증가"],
        sources: [{ url: "https://kosis.kr/x", title: "통계" }],
      },
      competitor_matrix: [["회사", "가격"], ["우리", "6,500원"], ["A", "5,000원"]],
      positioning: { x_axis: "특별함", y_axis: "신선함", players: [{ name: "우리", x: 8, y: 8, is_us: true }, { name: "A", x: 3, y: 4, is_us: false }] },
      swot: { strengths: ["당일 딸기"], weaknesses: ["공간"], opportunities: ["픽업"], threats: ["원가"] },
      revenue_streams: [{ name: "조각", share_pct: 70, pricing: "6,500원" }, { name: "홀", share_pct: 30, pricing: "42,000원" }],
      financials: {
        yearly: [
          { year: "1년 차", revenue_krw: 84e6, cost_krw: 96e6, customers: 5000 },
          { year: "2년 차", revenue_krw: 210e6, cost_krw: 160e6, customers: 12000 },
          { year: "3년 차", revenue_krw: 390e6, cost_krw: 250e6, customers: 21000 },
        ],
        monthly_revenue_krw: [2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12].map((x) => x * 1e6),
        assumptions: ["단가 6,500원"],
        breakeven_month: 7,
      },
      funding: { total_krw: 4e7, uses: [{ item: "설비", amount_krw: 2.5e7 }, { item: "마케팅", amount_krw: 1.5e7 }] },
      milestones: [{ period: "1분기", goal: "오픈", kpi: "일 30개" }],
      risks: [{ risk: "딸기 원가 상승", likelihood: 4, impact: 4, mitigation: "계약 재배" }],
    },
  },
  trend: {
    output: {
      summary: "구독이 낫다",
      recommended: "디저트 구독",
      signals: [{ signal: "픽업 증가", direction: "up", evidence: "기사" }],
      ideas: ["디저트 구독", "베이킹 클래스"].map((name, i) => ({
        name,
        one_liner: "한 줄",
        scores: { market_size: 6, growth: 8 - i, entry_barrier: 4, competition: 5, margin: 7, execution_difficulty: 5, capital_need: 4, personal_fit: 9 },
        composite: 7.8 - i,
        demand_trend: ["24 Q1", "24 Q2", "24 Q3", "24 Q4"].map((period, k) => ({ period, index: 40 + k * 10 })),
        target_customer: "직장인",
        entry_cost_krw: 3e6,
        price_gap: { band: "2~3만원", evidence: "근거" },
        differentiation_angles: ["a", "b", "c"],
        verdict: "하라",
        risks: ["유행"],
        sources: [],
      })),
    },
  },
  calendar: {
    input: { start_date: "2026-10-05" },
    output: {
      goal: "첫 매출 100만 원",
      north_star: { metric: "월 매출", unit: "원", baseline: 0, target: 1e6 },
      phases: [{ name: "준비", week_from: 1, week_to: 4, focus: "세팅" }, { name: "실행", week_from: 5, week_to: 13, focus: "판매" }],
      checkpoints: [{ week: 4, target: 1e5, review: "첫 주문" }, { week: 13, target: 1e6, review: "목표" }],
      weeks: Array.from({ length: 13 }, (_, w) => ({
        week_no: w + 1,
        milestone: `마일스톤 ${w + 1}`,
        tasks: [
          { day: 1, title: "사진 찍기", category: "콘텐츠·홍보", est_minutes: 60, done_criteria: "20장" },
          { day: 3, title: "견적", category: "영업·판매", est_minutes: 90, done_criteria: "2곳" },
        ],
      })),
    },
  },
  money: {
    output: {
      summary: "요약",
      models: [1, 2, 3].map((rank) => ({
        rank,
        name: `모델 ${rank}`,
        tagline: "한 줄",
        fit_reason: "이유",
        fit_cites: ["엑셀"],
        first_30_days: [{ day: 1, title: "등록" }],
        startup_cost_krw: rank * 1e6,
        cost_breakdown: [{ item: "장비", amount_krw: rank * 1e6 }],
        monthly_cost_krw: 1e5,
        monthly_revenue_krw: Array.from({ length: 12 }, (_, m) => (m + 1) * 2e5 * rank),
        unit_economics: { price_krw: 19000, unit_cost_krw: 3000, monthly_units_target: 30 },
        weekly_hours: 8,
        breakeven_months: rank + 2,
        difficulty: rank,
        skill_gaps: ["촬영"],
      })),
    },
  },
  keyword: {
    input: { primary_keyword: "성수 디저트" },
    output: {
      summary: "롱테일로 간다",
      tiers: {
        mega: [{ term: "성수 디저트", volume_band: "1만~3만", monthly_volume: 22000, competition: "높음", competition_score: 85, intent: "방문", best_use: "제목", data_source: "estimated" }],
        mid: [{ term: "성수 딸기 타르트", volume_band: "1천~5천", monthly_volume: 2400, competition: "중간", competition_score: 40, intent: "구매", best_use: "플레이스", data_source: "estimated" }],
        micro: [{ term: "성수역 디저트 포장", volume_band: "100~500", monthly_volume: 320, competition: "낮음", competition_score: 15, intent: "방문", best_use: "블로그", data_source: "measured" }],
      },
      combinations: ["성수 퇴근길 디저트"],
      content_gaps: [{ gap: "포장 가능 여부", suggested_topic: "포장 가이드", target_keyword: "성수 디저트 포장", priority: 1 }],
      placement: [{ spot: "플레이스 소개", keywords: ["성수 디저트"], example: "예시" }],
    },
  },
  place: {
    input: { business_name: "달빛 딸기공방", region: "성수동" },
    output: {
      audit: [{ area: "대표 사진", score: 40, current: "3장", fix: "20장" }, { area: "소개글", score: 70, current: "짧음", fix: "키워드" }],
      business_name_suggestions: ["a", "b", "c"],
      description_optimized: "성수동 수제 딸기 디저트",
      primary_keywords: ["성수 디저트"],
      menu_recommendations: ["세트"],
      competitor_benchmark: [{ name: "A", what_works: "사진", our_move: "촬영" }],
      photo_checklist: [{ shot: "타르트 단면", why: "클릭", priority: 1 }],
      review_response_templates: [{ situation: "칭찬", template: "감사합니다" }],
      weekly_ops_checklist: [{ day: "월", task: "소식", minutes: 15 }],
    },
  },
  proposal: {
    output: {
      cover: "간식 납품 제안",
      executive_summary: "요약입니다. 두 번째 문장.",
      problem: "문제",
      solution: "해결",
      expected_outcomes: [{ metric: "간식비", current: "월 60만 원", target: "월 50만 원" }],
      scope: { included: ["납품"], excluded: ["행사"] },
      execution_plan: ["계약"],
      timeline: [{ phase: "파일럿", weeks: 2, deliverable: "시식" }, { phase: "정식", weeks: 10, deliverable: "주 2회" }],
      pricing_table: [{ item: "간식", amount_krw: 500000 }, { item: "배송", amount_krw: 0 }],
      why_us: ["당일 제조"],
      company_intro: "소개",
    },
  },
  strategy: {
    output: {
      summary: "요약",
      market_insights: [{ insight: "픽업", implication: "예약", sources: [] }],
      segments: [{ name: "직장인", share_pct: 60, situation: "퇴근", need: "보상", current_alternative: "편의점", message: "수고했어요" }],
      positioning_axes: { x_axis: "특별함", y_axis: "신선함", our_x: 8, our_y: 9 },
      competitor_map: [{ name: "A", x: 3, y: 4, position: "대중", strength: "매장", weakness: "공장", our_angle: "당일" }],
      core_tension: "긴장",
      positioning_statement: "포지셔닝",
      promise: "약속",
      reasons_to_believe: ["당일 딸기"],
      offers: [{ name: "퇴근 세트", what: "타르트", price_idea: "8,000원", why_it_works: "보상" }],
      territories: [{ name: "퇴근 보상", idea: "아이디어", example_line: "오늘 고생했어요", channels: ["인스타"], first_content: "릴스" }],
      recommended_territory: "퇴근 보상",
      action_plan: [{ phase: "30일", goal: "오픈", tasks: ["촬영"] }],
      kpis: [{ metric: "예약 수", baseline: "0", target: "일 20건", how_to_measure: "카톡" }],
      risks: [{ risk: "원가", likelihood: 3, impact: 4, mitigation: "계약" }],
    },
  },
  grant: {
    output: {
      matches: [
        {
          program_name: "신사업창업사관학교",
          agency: "소진공",
          deadline: "2026년 11월 30일",
          deadline_date: "2026-11-30",
          funding_scale: "최대 4천만 원",
          max_amount_krw: 4e7,
          eligibility: [{ requirement: "예비창업", user_meets: true, note: "" }, { requirement: "교육 이수", user_meets: false, note: "신청 후" }],
          document_checklist: ["사업계획서"],
          difficulty: 3,
          source_url: "https://www.sbiz.or.kr/x",
        },
      ],
      unmatched_reasons: [],
    },
  },
};

function charts(report: Report) {
  return report.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "chart" ? [b.chart] : [])));
}

for (const [tool, { output, input }] of Object.entries(SAMPLES)) {
  test(`${tool}: builds a report with its own charts, all drawable at phone and PC width`, () => {
    const report = buildReport(tool, output, input);
    assert.ok(report, "report");
    assert.ok(report.sections.length >= 2);
    assert.ok(report.hero.title);
    const specs = charts(report);
    assert.ok(specs.length >= 1, "at least one chart");
    for (const spec of specs) {
      for (const width of [340, 680]) {
        const svg = renderChart(spec, { width, palette: report.palette, theme: PRINT_THEME });
        assert.match(svg, /^<svg[^>]+viewBox/, `${tool} ${spec.kind} @${width}`);
        assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${tool} ${spec.kind} @${width}`);
      }
      assert.ok(chartTable(spec), `${tool} ${spec.kind} has a data table for markdown`);
    }
    const { blocks } = reportBlocks(report);
    assert.ok(blocks.some((b) => b.type === "chart" || b.type === "table"));
  });

  test(`${tool}: an empty or half-filled output never throws`, () => {
    assert.doesNotThrow(() => buildReport(tool, {}, {}));
    const partial = Object.fromEntries(Object.entries(output).slice(0, 2));
    assert.doesNotThrow(() => buildReport(tool, partial, input));
  });
}

test("each tool has its own look: different accent colors and chart kinds", () => {
  const reports = Object.entries(SAMPLES).map(([tool, s]) => buildReport(tool, s.output, s.input)!);
  assert.equal(new Set(reports.map((r) => r.palette[0])).size, reports.length);
  const kinds = reports.map((r) => charts(r).map((c) => c.kind).sort().join(","));
  assert.equal(new Set(kinds).size, kinds.length, "no two tools share the same chart mix");
});

test("a business plan saved before the richer schema still renders its P&L", () => {
  const legacy = {
    sections: { summary: "요약", team: "팀", product: "제품" },
    market_analysis: { size: "1000억", growth: "10%", sources: [] },
    competitor_matrix: [["구분", "가격"], ["A사", "1만원"]],
    financials: { pl_3yr: [[1, 2, 3]], assumptions: ["a"], breakeven_month: 14 },
  };
  const report = buildReport("business-plan", legacy)!;
  const tables = report.sections.flatMap((s) => s.blocks.filter((b) => b.type === "table"));
  assert.ok(tables.length >= 2);
});

test("business plan profit is recomputed from revenue and cost, not trusted", () => {
  const report = buildReport("business-plan", SAMPLES["business-plan"].output)!;
  const pl = report.sections.flatMap((s) => s.blocks).find((b) => b.type === "table" && b.title === "추정 손익");
  assert.ok(pl && pl.type === "table");
  assert.deepEqual(pl.rows[2], ["영업이익", "-1,200만원", "5,000만원", "1.4억원"]);
});

test("labels from model output are escaped in the SVG", () => {
  const svg = renderChart({ kind: "bar", categories: ['<script>alert("x")</script>'], series: [{ name: "a", values: [1] }] }, { width: 680, palette: ["#000000"], theme: PRINT_THEME });
  assert.doesNotMatch(svg, /<script>/);
});

test("won amounts read in Korean units", () => {
  assert.equal(fmt(390_000_000, "원"), "3.9억원");
  assert.equal(fmt(12_000_000, "원"), "1,200만원");
  assert.equal(fmt(6500, "원"), "6,500원");
  assert.equal(fmt(-12_000_000, "원"), "-1,200만원");
  assert.equal(fmt(22000), "22,000");
  assert.ok(textWidth("가나다", 10) > textWidth("abc", 10));
});
