import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, list, num, obj, objs, PALETTES, sourcesOf, str, strs } from "./util.ts";

// 트렌드 분석: an analyst's screening memo. The verdict first, then the
// market signals, a leaderboard, the 8-axis comparison (radar + score
// heatmap), an opportunity map built from the scores (market appeal vs
// how doable it is), each idea's demand curve, and one card per idea.

const AXES: [string, string, boolean][] = [
  ["market_size", "시장 규모", false],
  ["growth", "성장성", false],
  ["margin", "마진", false],
  ["personal_fit", "개인 적합도", false],
  ["entry_barrier", "진입 장벽", true],
  ["competition", "경쟁 강도", true],
  ["execution_difficulty", "실행 난이도", true],
  ["capital_need", "필요 자본", true],
];

const ARROW = { up: "▲ 상승", flat: "■ 정체", down: "▼ 하락" } as const;

export function trendReport(o: Record<string, unknown>): Report {
  const ideas = objs(o.ideas).map((it) => {
    const sc = obj(it.scores);
    const scores = AXES.map(([k]) => clamp(num(sc[k]), 0, 10));
    const good = (i: number) => scores[i];
    const appeal = (good(0) + good(1) + good(2)) / 3;
    const doable = (10 - scores[4] + (10 - scores[6]) + (10 - scores[7]) + scores[3]) / 4;
    return {
      name: str(it.name),
      oneLiner: str(it.one_liner),
      scores,
      composite: clamp(num(it.composite), 0, 10),
      appeal,
      doable,
      trend: objs(it.demand_trend).map((p) => ({ period: str(p.period), index: clamp(num(p.index), 0, 100) })),
      target: str(it.target_customer),
      cost: num(it.entry_cost_krw),
      band: str(obj(it.price_gap).band),
      evidence: str(obj(it.price_gap).evidence),
      angles: strs(it.differentiation_angles),
      verdict: str(it.verdict),
      risks: strs(it.risks),
      sources: it.sources,
    };
  }).filter((i) => i.name);
  const ranked = [...ideas].sort((a, b) => b.composite - a.composite);
  const top = ranked[0];
  const recommended = str(o.recommended) || top?.name || "";
  const signals = objs(o.signals).map((s) => ({ signal: str(s.signal), dir: (["up", "flat", "down"].includes(str(s.direction)) ? str(s.direction) : "flat") as keyof typeof ARROW, evidence: str(s.evidence) })).filter((s) => s.signal);

  const sections: ReportSection[] = [];

  sections.push({
    id: "verdict",
    kicker: "결론",
    title: recommended ? `지금 해 볼 만한 건 '${recommended}'` : "분석 결론",
    blocks: keep([
      { type: "text", text: str(o.summary) },
      top?.verdict ? { type: "callout", label: `${top.name} 판정`, text: top.verdict } : null,
    ]),
  });

  sections.push({
    id: "signals",
    kicker: "시장 신호",
    title: "지금 시장에서 움직이는 것",
    blocks: keep([
      signals.length > 0 && {
        type: "table",
        header: ["방향", "신호", "근거"],
        align: ["c", "l", "l"],
        rows: signals.map((s) => [ARROW[s.dir], s.signal, s.evidence]),
      },
    ]),
  });

  sections.push({
    id: "ranking",
    kicker: "순위",
    title: "종합 점수",
    blocks: keep([
      ranked.length > 0 && {
        type: "chart",
        chart: { kind: "bar", horizontal: true, categories: ranked.map((i) => i.name), series: [{ name: "종합 점수", values: ranked.map((i) => i.composite) }], unit: "점", max: 10, highlight: 0 },
      },
      ideas.length > 0 && {
        type: "chart",
        title: "8개 축 비교",
        half: true,
        chart: { kind: "radar", axes: AXES.map(([, l, inv]) => (inv ? `${l}↓` : l)), series: ranked.slice(0, 3).map((i) => ({ name: i.name, values: i.scores })), max: 10 },
        caption: "↓ 표시 축은 점수가 높을수록 어렵다는 뜻입니다.",
      },
      ideas.length > 0 && {
        type: "chart",
        title: "점수표",
        half: true,
        chart: { kind: "heatmap", rows: ranked.map((i) => i.name), cols: AXES.map(([, l]) => l), values: ranked.map((i) => i.scores), max: 10 },
      },
    ]),
  });

  sections.push({
    id: "map",
    kicker: "기회 지도",
    title: "매력도 × 실행 가능성",
    lead: "시장 매력도는 시장 규모·성장성·마진, 실행 가능성은 진입 장벽·난이도·필요 자본(낮을수록 좋음)과 개인 적합도로 계산했습니다.",
    blocks: keep([
      ideas.length > 0 && {
        type: "chart",
        chart: {
          kind: "scatter",
          points: ideas.map((i) => ({ label: i.name, x: i.doable, y: i.appeal, highlight: i.name === recommended })),
          xLabel: "실행 가능성",
          yLabel: "시장 매력도",
          xMax: 10,
          yMax: 10,
          quadrants: ["매력적이지만 어려움", "지금 할 것", "보류", "쉽지만 작은 시장"],
        },
      },
    ]),
  });

  const withTrend = ranked.filter((i) => i.trend.length >= 3);
  const periods = withTrend[0]?.trend.map((p) => p.period) ?? [];
  sections.push({
    id: "demand",
    kicker: "수요 흐름",
    title: "관심은 오르고 있는가",
    blocks: keep([
      withTrend.length > 0 && {
        type: "chart",
        chart: { kind: "line", categories: periods, series: withTrend.map((i) => ({ name: i.name, values: i.trend.map((p) => p.index) })), area: withTrend.length === 1 },
        caption: "관심도 지수(0~100)는 검색·기사·판매 흐름을 바탕으로 한 추정치입니다.",
        estimated: true,
      },
    ]),
  });

  sections.push({
    id: "ideas",
    kicker: "아이디어별 검토",
    title: "하나씩 뜯어 보기",
    blocks: keep([
      {
        type: "cards",
        columns: ideas.length >= 3 ? 3 : ideas.length === 2 ? 2 : 1,
        items: ranked.map((i, k) => ({
          kicker: `${k + 1}위`,
          title: i.name,
          badge: i.name === recommended ? "추천" : undefined,
          meter: { value: i.composite / 10, label: `${i.composite.toFixed(1)} / 10` },
          spark: i.trend.map((p) => p.index),
          facts: [
            i.cost ? { label: "진입 비용", value: fmt(i.cost, "원") } : null,
            i.band ? { label: "가격대", value: i.band } : null,
            i.target ? { label: "타겟", value: i.target } : null,
          ].filter((f): f is { label: string; value: string } => f !== null),
          lines: [i.oneLiner, i.verdict && `판정: ${i.verdict}`, ...i.angles.map((a) => `차별화: ${a}`), ...i.risks.map((r) => `위험: ${r}`), i.evidence && `가격 근거: ${i.evidence}`].filter(Boolean) as string[],
        })),
      },
    ]),
  });

  const sources = sourcesOf(...ideas.map((i) => i.sources), list(o.sources));
  if (sources.length) sections.push({ id: "sources", title: "출처", blocks: [{ type: "sources", items: sources }] });

  const cheapest = ideas.filter((i) => i.cost > 0).sort((a, b) => a.cost - b.cost)[0];
  return {
    palette: PALETTES.trend,
    hero: {
      eyebrow: "트렌드 · 아이디어 검증",
      title: recommended ? `추천: ${recommended}` : "아이디어 검증 결과",
      subtitle: top?.oneLiner || undefined,
      kpis: [
        top ? { label: "1위 종합 점수", value: `${top.composite.toFixed(1)}점` } : null,
        { label: "검토한 아이디어", value: `${ideas.length}개` },
        signals.length ? { label: "상승 신호", value: `${signals.filter((s) => s.dir === "up").length} / ${signals.length}`, tone: "up" as const } : null,
        cheapest ? { label: "가장 적은 진입 비용", value: fmt(cheapest.cost, "원"), note: cheapest.name } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
