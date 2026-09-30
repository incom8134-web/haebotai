import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, num, obj, objs, PALETTES, sourcesOf, str, strs } from "./util.ts";

// 브랜드 전략: a strategy deck in page form. The positioning up top,
// customers as a share donut and cards, competitors on a positioning map
// with our empty spot highlighted, offers as a price table, campaign
// territories side by side, a phased plan, KPIs and a risk matrix.

export function strategyReport(o: Record<string, unknown>): Report {
  const segments = objs(o.segments).map((s) => ({ name: str(s.name), share: num(s.share_pct), situation: str(s.situation), need: str(s.need), alt: str(s.current_alternative), message: str(s.message) })).filter((s) => s.name);
  const comps = objs(o.competitor_map).map((c) => ({ name: str(c.name), x: num(c.x), y: num(c.y), position: str(c.position), strength: str(c.strength), weakness: str(c.weakness), angle: str(c.our_angle), hasXY: typeof c.x === "number" })).filter((c) => c.name);
  const axes = obj(o.positioning_axes);
  const recommended = str(o.recommended_territory);
  const risks = objs(o.risks).map((r) => ({ risk: str(r.risk), l: clamp(num(r.likelihood), 0, 5), i: clamp(num(r.impact), 0, 5), mitigation: str(r.mitigation) })).filter((r) => r.risk);
  const topSeg = [...segments].sort((a, b) => b.share - a.share)[0];
  const kpis = objs(o.kpis);

  const sections: ReportSection[] = [];
  sections.push({
    id: "core",
    kicker: "핵심",
    title: "한 문장 포지셔닝",
    blocks: keep([
      { type: "callout", label: "포지셔닝", text: str(o.positioning_statement) },
      { type: "text", text: str(o.summary) },
      { type: "callout", label: "고객이 느끼는 긴장", text: str(o.core_tension), tone: "warn" },
      { type: "bullets", title: "믿을 이유", style: "check", items: strs(o.reasons_to_believe) },
    ]),
  });
  sections.push({
    id: "insights",
    kicker: "시장",
    title: "시장에서 본 것",
    blocks: keep([
      {
        type: "cards",
        columns: 2,
        items: objs(o.market_insights).map((m, i) => ({ kicker: `인사이트 ${i + 1}`, title: str(m.insight), lines: str(m.implication) ? [`→ ${str(m.implication)}`] : [] })).filter((c) => c.title),
      },
    ]),
  });
  sections.push({
    id: "segments",
    kicker: "고객",
    title: topSeg ? `핵심 고객: ${topSeg.name}` : "고객 세그먼트",
    blocks: keep([
      segments.some((s) => s.share > 0) && {
        type: "chart",
        chart: { kind: "donut", slices: segments.map((s) => ({ label: s.name, value: s.share })), unit: "%", center: { value: `${segments.length}개`, label: "세그먼트" } },
        estimated: true,
      },
      {
        type: "cards",
        columns: segments.length >= 3 ? 3 : 2,
        items: segments.map((s) => ({
          title: s.name,
          badge: s.share ? `${Math.round(s.share)}%` : undefined,
          facts: [
            s.situation && { label: "상황", value: s.situation },
            s.need && { label: "원하는 것", value: s.need },
            s.alt && { label: "지금 대안", value: s.alt },
          ].filter((f): f is { label: string; value: string } => Boolean(f)),
          lines: s.message ? [`메시지: “${s.message}”`] : [],
        })),
      },
    ]),
  });
  const mapPoints = comps.filter((c) => c.hasXY).map((c) => ({ label: c.name, x: clamp(c.x, 0, 10), y: clamp(c.y, 0, 10) }));
  sections.push({
    id: "competition",
    kicker: "경쟁",
    title: "비어 있는 자리",
    blocks: keep([
      mapPoints.length > 0 && {
        type: "chart",
        chart: {
          kind: "scatter",
          points: [...mapPoints, { label: "우리", x: clamp(num(axes.our_x), 0, 10), y: clamp(num(axes.our_y), 0, 10), highlight: true }],
          xLabel: str(axes.x_axis) || "가로축",
          yLabel: str(axes.y_axis) || "세로축",
          xMax: 10,
          yMax: 10,
        },
      },
      {
        type: "table",
        header: ["경쟁자", "자리", "강점", "약점", "우리의 틈"],
        rows: comps.map((c) => [c.name, c.position, c.strength, c.weakness, c.angle]),
      },
    ]),
  });
  sections.push({
    id: "offers",
    kicker: "오퍼",
    title: "무엇을 얼마에",
    lead: str(o.promise) ? `약속: ${str(o.promise)}` : undefined,
    blocks: keep([
      {
        type: "table",
        header: ["오퍼", "내용", "가격 아이디어", "왜 통하나"],
        rows: objs(o.offers).map((f) => [str(f.name), str(f.what), str(f.price_idea), str(f.why_it_works)]).filter((r) => r[0]),
      },
    ]),
  });
  sections.push({
    id: "territories",
    kicker: "캠페인",
    title: recommended ? `추천 방향: ${recommended}` : "캠페인 방향",
    blocks: keep([
      {
        type: "cards",
        columns: 3,
        items: objs(o.territories).map((t) => ({
          title: str(t.name),
          badge: str(t.name) && recommended.includes(str(t.name)) ? "추천" : undefined,
          lines: [str(t.idea), str(t.example_line) && `“${str(t.example_line)}”`, strs(t.channels).length ? `채널: ${strs(t.channels).join(", ")}` : "", str(t.first_content) && `첫 콘텐츠: ${str(t.first_content)}`].filter(Boolean) as string[],
        })).filter((c) => c.title),
      },
    ]),
  });
  sections.push({
    id: "plan",
    kicker: "실행",
    title: "단계별 실행 계획",
    blocks: keep([
      objs(o.channel_plan).length > 0 && {
        type: "chart",
        title: "13주 채널별 일정",
        chart: {
          kind: "gantt",
          scale: Array.from({ length: 13 }, (_, i) => `${i + 1}주`),
          rows: objs(o.channel_plan).map((c) => {
            const start = Math.max(1, Math.min(13, Math.round(num(c.start_week)) || 1));
            const end = Math.max(start, Math.min(13, Math.round(num(c.end_week)) || start));
            return { label: `${str(c.channel)} · ${str(c.activity)}`, start: start - 1, end, group: str(c.phase), note: str(c.kpi) };
          }),
        },
      },
      {
        type: "cards",
        columns: 3,
        items: objs(o.action_plan).map((a) => ({ kicker: str(a.phase), title: str(a.goal), lines: strs(a.tasks) })).filter((c) => c.title),
      },
      {
        type: "table",
        title: "KPI",
        header: ["지표", "현재", "목표", "측정 방법"],
        rows: kpis.map((k) => [str(k.metric), str(k.baseline) || "—", str(k.target), str(k.how_to_measure)]).filter((r) => r[0]),
      },
    ]),
  });
  sections.push({
    id: "risks",
    kicker: "리스크",
    title: "무엇을 조심할까",
    blocks: keep([
      risks.some((r) => r.l && r.i) && {
        type: "chart",
        half: true,
        chart: {
          kind: "scatter",
          points: risks.map((r) => ({ label: r.risk.length > 14 ? `${r.risk.slice(0, 13)}…` : r.risk, x: r.l, y: r.i, highlight: r.l * r.i >= 12 })),
          xLabel: "가능성",
          yLabel: "영향",
          xMax: 5,
          yMax: 5,
          quadrants: ["대비 계획", "최우선 대응", "관찰", "빈발 관리"],
        },
      },
      { type: "table", half: risks.some((r) => r.l && r.i), header: ["리스크", "대응"], rows: risks.map((r) => [r.risk, r.mitigation]) },
    ]),
  });
  const sources = sourcesOf(...objs(o.market_insights).map((m) => m.sources));
  if (sources.length) sections.push({ id: "sources", title: "출처", blocks: [{ type: "sources", items: sources }] });

  return {
    palette: PALETTES.strategy,
    hero: {
      eyebrow: "브랜드 전략",
      title: str(o.promise) || str(o.positioning_statement) || "브랜드 전략",
      subtitle: str(o.core_tension) || undefined,
      kpis: [
        topSeg ? { label: "핵심 고객", value: topSeg.name, note: topSeg.share ? `${Math.round(topSeg.share)}%` : undefined } : null,
        recommended ? { label: "추천 캠페인", value: recommended } : null,
        kpis[0] ? { label: str(kpis[0].metric), value: str(kpis[0].target), tone: "up" as const } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
