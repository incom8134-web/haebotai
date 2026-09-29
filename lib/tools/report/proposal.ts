import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, pct, str, strs, sum, won } from "./util.ts";

// 제안서: what a decision-maker needs on one pass — the ask in numbers
// (total, weeks, phases), before/after outcomes, scope in and out, the
// schedule as a Gantt, the quote with its split, and why us.

export function proposalReport(o: Record<string, unknown>): Report {
  const timeline = objs(o.timeline).map((t) => ({ phase: str(t.phase), weeks: Math.max(1, Math.round(num(t.weeks))), deliverable: str(t.deliverable) })).filter((t) => t.phase);
  const totalWeeks = sum(timeline.map((t) => t.weeks));
  const pricing = objs(o.pricing_table).map((p) => ({ item: str(p.item), amount: num(p.amount_krw) })).filter((p) => p.item);
  const total = sum(pricing.map((p) => p.amount));
  const priced = pricing.filter((p) => p.amount > 0);
  const scope = obj(o.scope);
  const outcomes = objs(o.expected_outcomes).map((e) => [str(e.metric), str(e.current), str(e.target)]).filter((r) => r[0]);
  const step = totalWeeks > 26 ? 4 : totalWeeks > 13 ? 2 : 1;
  let cursor = 0;
  const bars = timeline.map((t) => {
    const s = cursor;
    cursor += t.weeks;
    return { label: t.phase, start: s / step, end: (cursor - 1) / step, group: t.phase, note: t.deliverable };
  });

  const sections: ReportSection[] = [];
  sections.push({
    id: "summary",
    kicker: "01 · 개요",
    title: "한눈에 보는 제안",
    blocks: keep([
      { type: "callout", label: "요약", text: str(o.executive_summary) },
      { type: "text", title: "지금의 문제", text: str(o.problem), half: true },
      { type: "text", title: "우리의 해결", text: str(o.solution), half: true },
    ]),
  });
  sections.push({
    id: "outcomes",
    kicker: "02 · 기대 효과",
    title: "무엇이 달라지나",
    blocks: keep([{ type: "table", header: ["지표", "현재", "목표"], rows: outcomes }]),
  });
  sections.push({
    id: "scope",
    kicker: "03 · 범위와 실행",
    title: "무엇을 하고, 무엇은 하지 않나",
    blocks: keep([
      (strs(scope.included).length > 0 || strs(scope.excluded).length > 0) && {
        type: "quad",
        cells: [
          { title: "포함", items: strs(scope.included) },
          { title: "제외", items: strs(scope.excluded) },
        ],
      },
      { type: "bullets", title: "실행 계획", style: "num", items: strs(o.execution_plan) },
    ]),
  });
  sections.push({
    id: "schedule",
    kicker: "04 · 일정",
    title: totalWeeks ? `총 ${totalWeeks}주` : "일정",
    blocks: keep([
      timeline.length > 0 && {
        type: "chart",
        chart: { kind: "gantt", scale: Array.from({ length: Math.ceil(totalWeeks / step) }, (_, i) => `${i * step + 1}주`), rows: bars },
      },
      timeline.length > 0 && {
        type: "table",
        header: ["단계", "기간", "산출물"],
        align: ["l", "c", "l"],
        rows: timeline.map((t) => [t.phase, `${t.weeks}주`, t.deliverable]),
      },
    ]),
  });
  sections.push({
    id: "quote",
    kicker: "05 · 견적",
    title: total ? `합계 ${won(total)}` : "견적",
    blocks: keep([
      priced.length > 1 && {
        type: "chart",
        half: true,
        chart: { kind: "donut", slices: priced.map((p) => ({ label: p.item, value: p.amount })), unit: "원", center: { value: fmt(total, "원"), label: "합계" } },
      },
      pricing.length > 0 && {
        type: "table",
        half: priced.length > 1,
        header: ["항목", "금액", "비중"],
        align: ["l", "r", "r"],
        totalRow: true,
        rows: [...pricing.map((p) => [p.item, won(p.amount), total && p.amount ? pct((p.amount / total) * 100) : "—"]), ["합계", won(total), total ? "100%" : "—"]],
        caption: pricing.some((p) => !p.amount) ? "‘확인 필요’ 항목은 금액을 정해 채워 주세요." : undefined,
      },
    ]),
  });
  sections.push({
    id: "us",
    kicker: "06 · 왜 우리인가",
    title: "함께할 이유",
    blocks: keep([
      { type: "bullets", style: "check", items: strs(o.why_us) },
      { type: "text", title: "회사 소개", text: str(o.company_intro) },
    ]),
  });

  return {
    palette: PALETTES.proposal,
    hero: {
      eyebrow: "제안서",
      title: str(o.cover) || "제안서",
      subtitle: str(o.executive_summary).split(/(?<=[.다요])\s/)[0] || undefined,
      kpis: [
        total ? { label: "제안 금액", value: fmt(total, "원") } : null,
        totalWeeks ? { label: "기간", value: `${totalWeeks}주` } : null,
        timeline.length ? { label: "단계", value: `${timeline.length}단계` } : null,
        outcomes.length ? { label: "목표 지표", value: `${outcomes.length}개`, tone: "up" as const } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
