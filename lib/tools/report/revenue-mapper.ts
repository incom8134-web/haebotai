import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 수익 구조 지도: segments → streams (a table and a time-to-revenue bar),
// the value ladder, and unit economics computed here from the model's
// estimates — customer value = (price − variable cost) × purchases/yr ×
// years, minus acquisition cost.

export const STREAM_TYPES: Record<string, string> = {
  one_time: "단건",
  subscription: "구독",
  service: "서비스",
  usage: "사용량",
  commission: "수수료",
  licensing: "라이선스",
  advertising: "광고",
};
export const STREAM_ROLES: Record<string, string> = { core: "핵심", upsell: "업셀", recurring: "반복", experimental: "실험" };
export const WILLINGNESS: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" };

export function unitEconomics(ue: Record<string, unknown>) {
  const price = num(ue.price_krw);
  const variable = num(ue.variable_cost_krw);
  const cac = num(ue.acquisition_cost_krw);
  const perYear = num(ue.purchases_per_year);
  const years = num(ue.retention_years);
  const margin = price - variable;
  const ltv = margin * perYear * years;
  return { price, variable, cac, perYear, years, margin, ltv, net: ltv - cac, ratio: cac > 0 ? ltv / cac : 0, notes: strs(ue.notes) };
}

export function readRevenue(o: Record<string, unknown>) {
  return {
    segments: objs(o.segments).map((s) => ({ id: str(s.id), name: str(s.name), paysFor: str(s.pays_for), willingness: str(s.willingness) })).filter((s) => s.name),
    streams: objs(o.streams)
      .map((s) => ({
        name: str(s.name),
        type: str(s.type),
        segmentIds: strs(s.segment_ids),
        what: str(s.what_they_get),
        priceModel: str(s.price_model),
        low: num(s.price_low_krw),
        high: num(s.price_high_krw),
        frequency: str(s.frequency),
        role: str(s.role),
        effort: num(s.effort),
        weeks: num(s.weeks_to_first_revenue),
        margin: str(s.margin_note),
      }))
      .filter((s) => s.name),
    ladder: objs(o.ladder).map((l) => ({ step: str(l.step), offer: str(l.offer), price: num(l.price_krw), purpose: str(l.purpose) })).filter((l) => l.offer),
    ue: unitEconomics(obj(o.unit_economics)),
    mix: obj(o.recommended_mix),
  };
}

const range = (lo: number, hi: number) => (lo && hi && hi !== lo ? `${fmt(lo, "원")}~${fmt(hi, "원")}` : fmt(hi || lo, "원"));

export function revenueMapperReport(o: Record<string, unknown>): Report {
  const { segments, streams, ladder, ue, mix } = readRevenue(o);
  const segName = new Map(segments.map((s) => [s.id, s.name]));
  const sections: ReportSection[] = [];

  sections.push({
    id: "map",
    kicker: "지도",
    title: "누가 무엇에 돈을 내나",
    lead: str(o.business_summary) || undefined,
    blocks: keep([
      segments.length > 0 && {
        type: "cards",
        columns: segments.length >= 3 ? 3 : 2,
        items: segments.map((s) => ({ title: s.name, badge: `지불 의향 ${WILLINGNESS[s.willingness] ?? s.willingness}`, lines: [s.paysFor] })),
      },
      streams.length > 0 && {
        type: "table",
        title: "수익 흐름",
        header: ["수익원", "유형", "역할", "고객", "가격(추정)", "빈도"],
        rows: streams.map((s) => [s.name, STREAM_TYPES[s.type] ?? s.type, STREAM_ROLES[s.role] ?? s.role, s.segmentIds.map((id) => segName.get(id) ?? id).join(", "), range(s.low, s.high), s.frequency]),
      },
      streams.length > 0 && {
        type: "chart",
        title: "첫 매출까지 걸리는 주",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: streams.map((s) => s.name), series: [{ name: "주", values: streams.map((s) => s.weeks) }], unit: "주" },
        estimated: true,
      },
      streams.length > 0 && {
        type: "chart",
        title: "드는 노력 (1~5)",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: streams.map((s) => s.name), series: [{ name: "노력", values: streams.map((s) => s.effort) }], max: 5 },
      },
    ]),
  });

  sections.push({
    id: "ladder",
    kicker: "가치 사다리",
    title: "첫 구매에서 프리미엄까지",
    blocks: keep([
      ladder.length > 0 && {
        type: "table",
        header: ["계단", "상품", "가격(추정)", "역할"],
        align: ["l", "l", "r", "l"],
        rows: ladder.map((l) => [l.step, l.offer, fmt(l.price, "원"), l.purpose]),
      },
    ]),
  });

  sections.push({
    id: "unit",
    kicker: "단위 경제성",
    title: "고객 한 명이 남기는 것",
    blocks: keep([
      ue.price > 0 && {
        type: "chart",
        chart: {
          kind: "circles",
          items: [
            { label: "건당 마진", value: fmt(ue.margin, "원"), note: `${fmt(ue.price, "원")} − ${fmt(ue.variable, "원")}` },
            { label: "고객 생애 가치", value: fmt(ue.ltv, "원"), note: `연 ${ue.perYear}회 × ${ue.years}년` },
            { label: "확보 비용", value: fmt(ue.cac, "원") },
            { label: "가치 ÷ 확보 비용", value: ue.ratio ? `${ue.ratio.toFixed(1)}배` : "—", note: "3배 이상이면 건강한 편" },
          ],
        },
        estimated: true,
      },
      ue.notes.length > 0 && { type: "bullets", items: ue.notes },
    ]),
  });

  sections.push({
    id: "mix",
    kicker: "추천 조합",
    title: "지금 시작할 것과 미룰 것",
    blocks: keep([
      !!str(mix.start_with) && { type: "callout", label: "먼저 시작", text: `${str(mix.start_with)}\n${str(mix.reason)}` },
      !!str(mix.add_next) && { type: "text", title: "다음에 더할 것", text: str(mix.add_next), half: true },
      strs(mix.avoid_for_now).length > 0 && { type: "bullets", title: "지금은 하지 않을 것", items: strs(mix.avoid_for_now), half: true },
      strs(o.assumptions).length > 0 && { type: "bullets", title: "가정", style: "check", items: strs(o.assumptions) },
    ]),
  });

  return {
    palette: PALETTES["revenue-mapper"],
    hero: {
      eyebrow: "수익 구조 지도",
      title: str(mix.start_with) ? `먼저: ${str(mix.start_with)}` : "수익 구조",
      subtitle: str(o.business_summary) || undefined,
      kpis: [
        { label: "수익 흐름", value: `${streams.length}개` },
        ue.ltv > 0 ? { label: "고객 생애 가치(추정)", value: fmt(ue.ltv, "원"), tone: "up" as const } : null,
        ue.ratio > 0 ? { label: "가치 ÷ 확보 비용", value: `${ue.ratio.toFixed(1)}배`, tone: ue.ratio >= 3 ? ("up" as const) : ("warn" as const) } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
