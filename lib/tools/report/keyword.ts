import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, num, obj, objs, PALETTES, str, strs, sum } from "./util.ts";

// 키워드 전략: a search marketer's keyword map. Every keyword plotted by
// monthly volume (log scale) against competition, the "golden" ones —
// real demand, little competition — pulled out, the tier pyramid and
// search-intent mix, then where each keyword goes and what to write.

const TIER_LABEL = { mega: "메가", mid: "미드", micro: "마이크로" } as const;

export function keywordReport(o: Record<string, unknown>, input: Record<string, unknown> = {}): Report {
  const tiers = obj(o.tiers);
  const all = (Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).flatMap((tier) =>
    objs(tiers[tier]).map((k) => ({
      tier,
      term: str(k.term),
      volume: num(k.monthly_volume),
      band: str(k.volume_band),
      comp: str(k.competition),
      compScore: clamp(num(k.competition_score), 0, 100),
      intent: str(k.intent),
      use: str(k.best_use),
      estimated: str(k.data_source) !== "measured",
    })),
  ).filter((k) => k.term);
  const numeric = all.filter((k) => k.volume > 0);
  const volumes = numeric.map((k) => k.volume).sort((a, b) => a - b);
  const maxLog = Math.log10(Math.max(10, ...volumes));
  const minLog = Math.log10(Math.max(1, Math.min(...volumes)));
  const logNorm = (v: number) => (Math.log10(Math.max(1, v)) - minLog) / (maxLog - minLog || 1);
  // Golden = the best demand-for-competition trade in THIS keyword set: a
  // local market rarely has high-volume, low-competition terms in absolute
  // terms, so rank by relative volume minus competition and keep the top quarter.
  const opportunity = (k: (typeof numeric)[number]) => logNorm(k.volume) * 100 - k.compScore;
  const golden = numeric
    .filter((k) => k.compScore <= 65)
    .sort((a, b) => opportunity(b) - opportunity(a))
    .slice(0, Math.max(3, Math.round(numeric.length / 4)));
  const intents = [...new Set(all.map((k) => k.intent).filter(Boolean))];
  const gaps = objs(o.content_gaps).map((g) => ({ gap: str(g.gap), topic: str(g.suggested_topic), target: str(g.target_keyword), priority: num(g.priority) || 2 })).filter((g) => g.topic).sort((a, b) => a.priority - b.priority);
  const primary = str(input.primary_keyword);

  const sections: ReportSection[] = [];

  sections.push({
    id: "map",
    kicker: "키워드 지도",
    title: "검색량 × 경쟁",
    lead: str(o.summary) || undefined,
    blocks: keep([
      numeric.length > 2 && {
        type: "chart",
        chart: {
          kind: "scatter",
          points: numeric.map((k) => ({ label: k.term, x: k.compScore, y: logNorm(k.volume) * 10, highlight: golden.includes(k) })),
          xLabel: "경쟁 강도",
          yLabel: "월 검색량(로그)",
          xMax: 100,
          yMax: 10,
          quadrants: ["골든 키워드", "레드오션", "틈새 롱테일", "피할 것"],
        },
        caption: "진하게 표시된 점이 이 키워드 판에서 검색 대비 경쟁이 가장 낮은 골든 키워드입니다.",
        estimated: all.some((k) => k.estimated),
      },
      golden.length > 0 && {
        type: "table",
        title: "골든 키워드 — 먼저 잡을 것",
        header: ["키워드", "월 검색량", "경쟁", "의도", "어디에 쓸까"],
        align: ["l", "r", "c", "c", "l"],
        rows: golden.slice(0, 8).map((k) => [k.term, fmt(k.volume), `${k.compScore}`, k.intent, k.use]),
      },
    ]),
  });

  const tierSums = (Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).map((t) => ({ t, n: all.filter((k) => k.tier === t).length, v: sum(all.filter((k) => k.tier === t).map((k) => k.volume)) }));
  sections.push({
    id: "structure",
    kicker: "구조",
    title: "규모별 · 의도별 구성",
    blocks: keep([
      numeric.length > 0 && {
        type: "chart",
        title: "티어별 검색량",
        half: true,
        chart: { kind: "funnel", stages: tierSums.filter((t) => t.n).map((t) => ({ label: `${TIER_LABEL[t.t]} ${t.n}개`, value: Math.max(t.v, 1), display: `월 ${fmt(t.v)}` })) },
      },
      intents.length > 1 && {
        type: "chart",
        title: "검색 의도",
        half: true,
        chart: { kind: "donut", slices: intents.map((i) => ({ label: i, value: all.filter((k) => k.intent === i).length })), unit: "개", center: { value: `${all.length}개`, label: "키워드" } },
      },
    ]),
  });

  sections.push({
    id: "list",
    kicker: "전체 목록",
    title: "티어별 키워드",
    blocks: keep(
      (Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).map((t) => {
        const rows = all.filter((k) => k.tier === t);
        return rows.length > 0
          ? {
              type: "table" as const,
              title: `${TIER_LABEL[t]} 키워드`,
              header: ["키워드", "검색량", "경쟁", "의도", "활용 위치"],
              align: ["l", "r", "c", "c", "l"] as ("l" | "r" | "c")[],
              rows: rows.map((k) => [`${k.term}${k.estimated ? " (추정)" : ""}`, k.volume ? fmt(k.volume) : k.band, k.compScore ? `${k.compScore}` : k.comp, k.intent, k.use]),
            }
          : null;
      }),
    ),
  });

  sections.push({
    id: "placement",
    kicker: "배치",
    title: "어디에 무엇을 넣을까",
    blocks: keep([
      {
        type: "table",
        header: ["위치", "넣을 키워드", "예시"],
        rows: objs(o.placement).map((p) => [str(p.spot), strs(p.keywords).join(", "), str(p.example)]).filter((r) => r[0]),
      },
      { type: "bullets", title: "조합 키워드", items: strs(o.combinations) },
    ]),
  });

  sections.push({
    id: "gaps",
    kicker: "콘텐츠 기회",
    title: "상위 글이 답하지 못한 질문",
    blocks: keep([
      gaps.length > 0 && {
        type: "table",
        header: ["우선", "빈틈", "쓸 글", "노릴 키워드"],
        align: ["c", "l", "l", "l"],
        rows: gaps.map((g) => ["●".repeat(4 - clamp(g.priority, 1, 3)), g.gap, g.topic, g.target]),
      },
    ]),
  });

  return {
    palette: PALETTES.keyword,
    hero: {
      eyebrow: "키워드 전략",
      title: primary ? `‘${primary}’ 키워드 지도` : "키워드 지도",
      subtitle: str(o.summary) || undefined,
      kpis: [
        { label: "찾은 키워드", value: `${all.length}개` },
        numeric.length ? { label: "월 검색량 합계", value: fmt(sum(numeric.map((k) => k.volume))), note: "추정 포함" } : null,
        { label: "골든 키워드", value: `${golden.length}개`, tone: "up" as const },
        gaps.length ? { label: "콘텐츠 기회", value: `${gaps.length}개` } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
