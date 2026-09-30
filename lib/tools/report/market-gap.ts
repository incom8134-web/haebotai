import type { Report, ReportSection } from "./types.ts";
import { keep, num, objs, PALETTES, sourcesOf, str, strs } from "./util.ts";

// 시장 빈틈 탐지기: the needs × solutions coverage heatmap (the empty
// cells are the gaps), need intensity, the gap cards with where each
// finding came from, and the validation questions.

export const ORIGIN_LABELS: Record<string, string> = { search: "검색 근거", user: "입력 내용", hypothesis: "가설" };
export const CONFIDENCE_LABELS: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };
export const SOLUTION_KINDS: Record<string, string> = { direct: "직접 경쟁", indirect: "간접 대안", diy: "스스로 해결", nothing: "안 함" };

export function readGapMap(o: Record<string, unknown>) {
  const needs = objs(o.needs)
    .map((n, i) => ({ id: str(n.id) || `n${i + 1}`, need: str(n.need), who: str(n.who), intensity: Math.max(0, Math.min(5, num(n.intensity))), evidence: str(n.evidence), origin: str(n.origin) }))
    .filter((n) => n.need);
  const solutions = objs(o.solutions)
    .map((s) => {
      const cov = new Map(objs(s.coverage).map((c) => [str(c.need_id), Math.max(0, Math.min(2, num(c.level)))]));
      return { name: str(s.name), kind: str(s.kind), note: str(s.note), levels: needs.map((n) => cov.get(n.id) ?? 0) };
    })
    .filter((s) => s.name);
  const gaps = objs(o.gaps)
    .map((g) => ({ title: str(g.title), needIds: strs(g.need_ids), why: str(g.why_unserved), opportunity: str(g.opportunity), diff: str(g.differentiation), confidence: str(g.confidence), origin: str(g.origin) }))
    .filter((g) => g.title);
  return { needs, solutions, gaps };
}

export function marketGapReport(o: Record<string, unknown>): Report {
  const { needs, solutions, gaps } = readGapMap(o);
  const needName = new Map(needs.map((n) => [n.id, n.need]));
  const questions = objs(o.validation_questions).map((q) => ({ q: str(q.question), whom: str(q.ask_whom), signal: str(q.signal) })).filter((q) => q.q);
  const sources = sourcesOf(o.sources);
  const sections: ReportSection[] = [];

  sections.push({
    id: "map",
    kicker: "지도",
    title: "니즈 × 기존 해결책",
    lead: str(o.market_summary) || undefined,
    blocks: keep([
      needs.length > 0 &&
        solutions.length > 0 && {
          type: "chart",
          title: "얼마나 잘 풀어 주나 (0 못 풂 · 1 일부 · 2 잘 풂)",
          chart: { kind: "heatmap", rows: solutions.map((s) => s.name), cols: needs.map((n) => n.need), values: solutions.map((s) => s.levels), max: 2 },
        },
      needs.length > 0 && {
        type: "chart",
        title: "니즈 강도 (1~5)",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: needs.map((n) => n.need), series: [{ name: "강도", values: needs.map((n) => n.intensity) }], max: 5 },
      },
      needs.length > 0 && {
        type: "table",
        title: "니즈와 근거",
        half: true,
        header: ["니즈", "누가", "근거", "출처"],
        rows: needs.map((n) => [n.need, n.who, n.evidence, ORIGIN_LABELS[n.origin] ?? n.origin]),
      },
      solutions.length > 0 && { type: "table", title: "기존 해결책", header: ["해결책", "종류", "메모"], rows: solutions.map((s) => [s.name, SOLUTION_KINDS[s.kind] ?? s.kind, s.note]) },
    ]),
  });

  sections.push({
    id: "gaps",
    kicker: "빈틈",
    title: "비어 있는 자리",
    blocks: keep([
      gaps.length > 0 && {
        type: "cards",
        columns: 2,
        items: gaps.map((g) => ({
          title: g.title,
          badge: `신뢰도 ${CONFIDENCE_LABELS[g.confidence] ?? g.confidence} · ${ORIGIN_LABELS[g.origin] ?? g.origin}`,
          facts: [{ label: "관련 니즈", value: g.needIds.map((id) => needName.get(id) ?? id).join(", ") }],
          lines: [`왜 비어 있나: ${g.why}`, `기회: ${g.opportunity}`, `차별화: ${g.diff}`],
        })),
      },
    ]),
  });

  sections.push({
    id: "validate",
    kicker: "검증",
    title: "진짜 빈틈인지 확인할 질문",
    blocks: keep([
      questions.length > 0 && { type: "table", header: ["질문", "누구에게", "신호"], rows: questions.map((q) => [q.q, q.whom, q.signal]) },
      { type: "sources", items: sources },
    ]),
  });

  const strongest = [...needs].sort((a, b) => b.intensity - a.intensity)[0];
  return {
    palette: PALETTES["market-gap"],
    hero: {
      eyebrow: "시장 빈틈 탐지기",
      title: gaps[0] ? gaps[0].title : "시장 빈틈",
      subtitle: str(o.market_summary) || undefined,
      kpis: [
        { label: "니즈", value: `${needs.length}개` },
        { label: "빈틈", value: `${gaps.length}개`, tone: "up" as const },
        strongest ? { label: "가장 강한 니즈", value: `${strongest.intensity}/5`, note: strongest.need } : null,
        { label: "출처", value: `${sources.length}건` },
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
