import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, has, keep, list, num, obj, objs, PALETTES, pct, sourcesOf, str, strs, sum, won } from "./util.ts";

// 사업계획서: reads like a document a reviewer scores. Headline numbers
// up top, then the order a 심사위원 reads in — summary, product & model,
// market (TAM/SAM/SOM circles), competition (matrix, map, SWOT),
// financials (3-year P&L, first-year curve with the breakeven month),
// funding, roadmap, risks.

const share = (r: number) => (r >= 0.1 ? `${(r * 100).toFixed(0)}%` : r >= 0.001 ? `${(r * 100).toFixed(1)}%` : r > 0 ? `${(r * 100).toFixed(2)}%` : "—");

export function businessPlanReport(o: Record<string, unknown>): Report {
  const sec = obj(o.sections);
  const market = obj(o.market_analysis);
  const fin = obj(o.financials);
  const yearly = objs(fin.yearly).map((y, i) => {
    const revenue = num(y.revenue_krw);
    const cost = num(y.cost_krw);
    return { year: str(y.year) || `${i + 1}년 차`, revenue, cost, profit: revenue - cost, customers: num(y.customers) };
  });
  const monthly = list(fin.monthly_revenue_krw).map(num);
  const breakeven = num(fin.breakeven_month);
  const funding = obj(o.funding);
  const uses = objs(funding.uses).map((u) => ({ item: str(u.item), amount: num(u.amount_krw) })).filter((u) => u.item);
  const fundTotal = sum(uses.map((u) => u.amount)) || num(funding.total_krw);
  const tiers = (["tam", "sam", "som"] as const).map((k) => ({ key: k.toUpperCase(), value: num(obj(market[k]).value_krw), basis: str(obj(market[k]).basis) }));
  const hasTiers = tiers.every((t) => t.value > 0);
  const streams = objs(o.revenue_streams).map((r) => ({ name: str(r.name), share: num(r.share_pct), pricing: str(r.pricing) })).filter((r) => r.name);
  const positioning = obj(o.positioning);
  const players = objs(positioning.players).map((p) => ({ label: str(p.name), x: clamp(num(p.x), 0, 10), y: clamp(num(p.y), 0, 10), highlight: p.is_us === true }));
  const swot = obj(o.swot);
  const risks = objs(o.risks).map((r) => ({ risk: str(r.risk), l: clamp(num(r.likelihood), 1, 5), i: clamp(num(r.impact), 1, 5), mitigation: str(r.mitigation) })).filter((r) => r.risk);
  const matrix = list(o.competitor_matrix).map((row) => list(row).map(str));
  const last = yearly[yearly.length - 1];

  // Built as named blocks, then ordered: the plan's own chapters (its
  // strategy's order) with the analysis a chapter asked for right after
  // it; analysis no chapter placed follows in the reviewer's usual order.
  // Older runs (no chapters) keep the classic fixed order.
  const byId = new Map<string, ReportSection>();
  const add = (section: ReportSection) => byId.set(section.id, section);

  add({
    id: "summary",
    kicker: "01 · 사업 개요",
    title: "무엇을, 누구에게, 왜 지금",
    blocks: keep([
      { type: "callout", label: "한 줄 요약", text: str(o.one_liner) },
      { type: "text", text: str(sec.summary) },
      { type: "text", title: "문제", text: str(sec.problem), half: true },
      { type: "text", title: "해결", text: str(sec.solution), half: true },
    ]),
  });

  add({
    id: "model",
    kicker: "02 · 제품과 비즈니스 모델",
    title: "어떻게 돈을 버는가",
    blocks: keep([
      { type: "text", title: "제품·서비스", text: str(sec.product), half: true },
      { type: "text", title: "비즈니스 모델", text: str(sec.business_model), half: true },
      streams.length > 0 && {
        type: "chart",
        title: "수익원 구성",
        half: true,
        chart: { kind: "donut", slices: streams.map((s) => ({ label: s.name, value: s.share })), unit: "%", center: { value: `${streams.length}개`, label: "수익원" } },
      },
      streams.length > 0 && {
        type: "table",
        title: "수익원별 가격",
        half: true,
        header: ["수익원", "비중", "가격 구조"],
        align: ["l", "r", "l"],
        rows: streams.map((s) => [s.name, pct(s.share), s.pricing]),
      },
    ]),
  });

  add({
    id: "market",
    kicker: "03 · 시장 분석",
    title: "시장은 충분히 큰가",
    lead: str(market.size),
    blocks: keep([
      hasTiers && {
        type: "chart",
        title: "시장 규모 (TAM · SAM · SOM)",
        chart: { kind: "circles", items: tiers.map((t) => ({ label: t.key, value: fmt(t.value, "원"), note: t.basis })) },
        estimated: true,
      },
      {
        type: "kpis",
        items: [
          ...(num(market.cagr_pct) ? [{ label: "연평균 성장률", value: `${num(market.cagr_pct)}%`, tone: "up" as const }] : []),
          ...(hasTiers ? [{ label: "목표 시장 (SOM)", value: fmt(tiers[2].value, "원") }] : []),
          ...(hasTiers ? [{ label: "SAM 중 목표 점유율", value: share(tiers[2].value / tiers[1].value) }] : []),
        ],
      },
      { type: "text", title: "성장성", text: str(market.growth) },
      { type: "bullets", title: "시장을 움직이는 흐름", items: strs(market.trends) },
    ]),
  });

  add({
    id: "competition",
    kicker: "04 · 경쟁 분석",
    title: "왜 우리가 이기는가",
    blocks: keep([
      matrix.length > 1 && { type: "table", title: "경쟁사 비교", header: matrix[0], rows: matrix.slice(1) },
      players.length > 1 && {
        type: "chart",
        title: "포지셔닝 맵",
        chart: { kind: "scatter", points: players, xLabel: str(positioning.x_axis) || "가로축", yLabel: str(positioning.y_axis) || "세로축", xMax: 10, yMax: 10 },
      },
      has(swot.strengths) && {
        type: "quad",
        title: "SWOT",
        cells: [
          { title: "강점 S", items: strs(swot.strengths) },
          { title: "약점 W", items: strs(swot.weaknesses) },
          { title: "기회 O", items: strs(swot.opportunities) },
          { title: "위협 T", items: strs(swot.threats) },
        ],
      },
    ]),
  });

  // Older runs stored pl_3yr as bare number rows.
  const legacyPl = list(fin.pl_3yr).map((r) => list(r).map(num));
  add({
    id: "financials",
    kicker: "05 · 재무 계획",
    title: "언제 돈이 남는가",
    blocks: keep([
      yearly.length > 0 && {
        type: "chart",
        title: "3개년 매출 · 비용 · 영업이익",
        chart: {
          kind: "bar",
          categories: yearly.map((y) => y.year),
          series: [
            { name: "매출", values: yearly.map((y) => y.revenue) },
            { name: "비용", values: yearly.map((y) => y.cost) },
            { name: "영업이익", values: yearly.map((y) => y.profit) },
          ],
          unit: "원",
        },
        estimated: true,
      },
      monthly.length >= 6 && {
        type: "chart",
        title: "첫해 월별 매출",
        chart: {
          kind: "line",
          categories: monthly.map((_, i) => `${i + 1}월`),
          series: [{ name: "월 매출", values: monthly }],
          unit: "원",
          markers: breakeven >= 1 && breakeven <= monthly.length ? [{ index: breakeven - 1, label: `손익분기 ${breakeven}개월 차` }] : [],
        },
        estimated: true,
      },
      yearly.length > 0 && {
        type: "table",
        title: "추정 손익",
        header: ["구분", ...yearly.map((y) => y.year)],
        align: ["l", ...yearly.map(() => "r" as const)],
        rows: [
          ["매출", ...yearly.map((y) => fmt(y.revenue, "원"))],
          ["비용", ...yearly.map((y) => fmt(y.cost, "원"))],
          ["영업이익", ...yearly.map((y) => fmt(y.profit, "원"))],
          ["영업이익률", ...yearly.map((y) => (y.revenue ? pct((y.profit / y.revenue) * 100) : "—"))],
          ...(yearly.some((y) => y.customers) ? [["고객 수", ...yearly.map((y) => fmt(y.customers, "명"))]] : []),
        ],
      },
      yearly.length === 0 && legacyPl.length > 0 && {
        type: "table",
        title: "3개년 손익",
        header: ["구분", ...legacyPl[0].map((_, i) => `${i + 1}년 차`)],
        align: ["l", ...legacyPl[0].map(() => "r" as const)],
        rows: legacyPl.map((r, i) => [`항목 ${i + 1}`, ...r.map((n) => fmt(n, "원"))]),
      },
      { type: "bullets", title: "계산 가정", items: strs(fin.assumptions) },
    ]),
  });

  add({
    id: "funding",
    kicker: "06 · 자금 계획",
    title: "필요한 돈과 쓰는 곳",
    blocks: keep([
      uses.length > 0 && {
        type: "chart",
        title: "자금 사용처",
        half: true,
        chart: { kind: "donut", slices: uses.map((u) => ({ label: u.item, value: u.amount })), unit: "원", center: { value: fmt(fundTotal, "원"), label: "필요 자금" } },
      },
      uses.length > 0 && {
        type: "table",
        title: "사용처별 금액",
        half: true,
        header: ["항목", "금액", "비중"],
        align: ["l", "r", "r"],
        totalRow: true,
        rows: [...uses.map((u) => [u.item, won(u.amount), fundTotal ? pct((u.amount / fundTotal) * 100) : "—"]), ["합계", won(fundTotal), "100%"]],
      },
    ]),
  });

  add({
    id: "roadmap",
    kicker: "07 · 실행 로드맵",
    title: "언제 무엇을 증명하는가",
    blocks: keep([
      {
        type: "cards",
        columns: 3,
        items: objs(o.milestones).map((m, i) => ({ kicker: str(m.period) || `단계 ${i + 1}`, title: str(m.goal), facts: str(m.kpi) ? [{ label: "측정 지표", value: str(m.kpi) }] : [] })).filter((c) => c.title),
      },
      { type: "text", title: "팀 구성", text: str(sec.team) },
    ]),
  });

  add({
    id: "risks",
    kicker: "08 · 리스크",
    title: "무엇이 잘못될 수 있는가",
    blocks: keep([
      risks.length > 0 && {
        type: "chart",
        title: "리스크 매트릭스 (가능성 × 영향)",
        half: true,
        chart: {
          kind: "scatter",
          points: risks.map((r) => ({ label: r.risk.length > 16 ? `${r.risk.slice(0, 15)}…` : r.risk, x: r.l, y: r.i, highlight: r.l * r.i >= 12 })),
          xLabel: "발생 가능성",
          yLabel: "영향",
          xMax: 5,
          yMax: 5,
          quadrants: ["대비 계획", "최우선 대응", "관찰", "빈발 관리"],
        },
      },
      risks.length > 0 && {
        type: "table",
        title: "대응 계획",
        half: true,
        header: ["리스크", "가능성", "영향", "대응"],
        align: ["l", "c", "c", "l"],
        rows: [...risks].sort((a, b) => b.l * b.i - a.l * a.i).map((r) => [r.risk, `${r.l}/5`, `${r.i}/5`, r.mitigation]),
      },
    ]),
  });

  const chapters = objs(o.chapters).filter((c) => str(c.title));
  const DATA_ID: Record<string, string> = { market: "market", competition: "competition", revenue: "model", financials: "financials", funding: "funding", roadmap: "roadmap", risks: "risks" };
  const sections: ReportSection[] = [];
  const used = new Set<string>();
  const place = (id: string) => {
    const section = byId.get(id);
    if (!section || used.has(id)) return;
    used.add(id);
    // Between the plan's own numbered chapters, analysis blocks drop the classic numbering.
    sections.push(chapters.length && section.kicker ? { ...section, kicker: section.kicker.replace(/^\d+ · /, "") } : section);
  };
  if (chapters.length) {
    // The one-liner opens the plan; the classic summary/model texts only
    // appear when the plan still has them.
    if (str(o.one_liner)) sections.push({ id: "one-liner", title: str(o.plan_type) || "한 줄 요약", blocks: [{ type: "callout", label: "한 줄 요약", text: str(o.one_liner) }] });
    used.add("summary");
    chapters.forEach((c, i) => {
      const table = obj(c.table);
      const header = list(table.header).map(str);
      const rows = list(table.rows).map((r) => list(r).map(str));
      // `purpose` is the writer's note on what the chapter proves; readers get the title.
      const title = str(c.title).replace(/^\s*\d+[.)]\s*/, "");
      sections.push({
        id: `chapter-${i + 1}`,
        kicker: String(i + 1).padStart(2, "0"),
        title,
        blocks: keep([
          { type: "text", text: str(c.body) },
          has(c.points) && { type: "bullets", items: strs(c.points) },
          header.length > 0 && rows.length > 0 && { type: "table", header, rows },
        ]),
      });
      const data = DATA_ID[str(c.data)];
      if (data) place(data);
    });
    // Revenue mix without the classic product/model texts: keep just the charts.
    for (const id of ["market", "competition", "model", "financials", "funding", "roadmap", "risks"]) place(id);
  } else {
    for (const id of ["summary", "model", "market", "competition", "financials", "funding", "roadmap", "risks"]) place(id);
  }

  const sources = sourcesOf(market.sources);
  if (sources.length) sections.push({ id: "sources", title: "출처", blocks: [{ type: "sources", items: sources }] });

  return {
    palette: PALETTES["business-plan"],
    hero: {
      eyebrow: "사업계획서",
      title: str(o.title) || "사업계획서",
      subtitle: str(o.one_liner) || undefined,
      kpis: [
        last ? { label: `${last.year} 매출`, value: fmt(last.revenue, "원"), tone: "up" as const } : null,
        breakeven ? { label: "손익분기", value: `${breakeven}개월 차` } : null,
        fundTotal ? { label: "필요 자금", value: fmt(fundTotal, "원") } : null,
        hasTiers ? { label: "목표 시장 SOM", value: fmt(tiers[2].value, "원") } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
